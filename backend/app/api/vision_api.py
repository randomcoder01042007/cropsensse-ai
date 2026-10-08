"""
POST /api/vision/analyze  (file: app/api/vision_api.py)

Adapter between the frontend contract (JSON: analysis_id, image_url, mode)
and the existing OpenCV pipeline (analyze_crop_image, which takes raw bytes).
Returns the exact `VisionResult` shape the frontend expects (src/types/index.ts).
"""
import logging
import os
import urllib.error
import urllib.request
from typing import Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, HttpUrl

from app.vision.analysis import analyze_crop_image

router = APIRouter(prefix="/vision", tags=["Vision"])
log = logging.getLogger("uvicorn.error")

MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024  # same limit as the frontend (15 MB)
DOWNLOAD_TIMEOUT_SECONDS = 30

# Optional security settings (set as environment variables):
#   VISION_API_KEY        -> if set, requests must send "Authorization: Bearer <key>"
#   ALLOWED_IMAGE_HOST    -> e.g. "abcd1234.supabase.co"; blocks fetching other hosts (SSRF protection)
#   INCLUDE_ANNOTATED_IMAGE -> "true" to return the annotated image as a data URL
VISION_API_KEY = os.getenv("VISION_API_KEY")
ALLOWED_IMAGE_HOST = os.getenv("ALLOWED_IMAGE_HOST")
INCLUDE_ANNOTATED_IMAGE = os.getenv("INCLUDE_ANNOTATED_IMAGE", "false").lower() == "true"


class AnalyzeRequest(BaseModel):
    analysis_id: str
    image_url: HttpUrl
    mode: Literal["standard", "detailed"] = "standard"


def _check_auth(authorization: Optional[str]) -> None:
    if not VISION_API_KEY:
        return
    if authorization != f"Bearer {VISION_API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def _download_image(url: str) -> bytes:
    host = urlparse(url).hostname
    if ALLOWED_IMAGE_HOST and host != ALLOWED_IMAGE_HOST:
        raise HTTPException(status_code=400, detail="Image host is not allowed.")
    request = urllib.request.Request(
        url,
        headers={
            # Some storage hosts reject Python's default "Python-urllib" agent with 403.
            "User-Agent": "Mozilla/5.0 (compatible; CropSenseAI/1.0)",
            "Accept": "image/*,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as resp:
            data = resp.read(MAX_DOWNLOAD_BYTES + 1)
    except urllib.error.HTTPError as error:
        body = error.read(300) if hasattr(error, "read") else b""
        log.error("VISION download refused (%s): %s %s | body: %r", host, error.code, error.reason, body)
        raise HTTPException(status_code=400, detail=f"Could not download image: HTTP {error.code}")
    except Exception as error:
        log.error("VISION download failed (%s): %r", host, error)
        raise HTTPException(status_code=400, detail=f"Could not download image: {error}")
    log.info("VISION downloaded %d bytes from %s, first bytes: %r", len(data), host, data[:16])
    if not data:
        raise HTTPException(status_code=400, detail="Downloaded image is empty.")
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large.")
    return data


def _severity(area_percent: float) -> str:
    if area_percent >= 5:
        return "high"
    if area_percent >= 1:
        return "attention"
    return "info"


def _to_vision_result(analysis_id: str, raw: dict) -> dict:
    img_w = raw["image"]["width"]
    img_h = raw["image"]["height"]

    regions = []
    for r in raw.get("suspicious_regions", []):
        area = float(r.get("area_percent") or 0)
        regions.append(
            {
                "id": r["id"],
                "label": "Suspicious region",
                # frontend expects a 0..1 normalised box; backend gives pixels
                "bbox": {
                    "x": r["x"] / img_w,
                    "y": r["y"] / img_h,
                    "w": r["width"] / img_w,
                    "h": r["height"] / img_h,
                },
                "area_percent": area,
                "severity": _severity(area),
            }
        )

    coverage = raw["vegetation"]["coverage_percent"]
    suspicious = raw["measurements"]["suspicious_area_percent"]

    processed = None
    if INCLUDE_ANNOTATED_IMAGE:
        visual = raw.get("visual_output") or {}
        if visual.get("data"):
            processed = f"data:image/{visual.get('format', 'jpeg')};base64,{visual['data']}"

    return {
        "analysis_id": analysis_id,
        # The backend does not compute an image-quality score, so we report none
        # instead of inventing a value.
        "image_quality": {"score": None, "status": "ok", "issues": []},
        "vegetation": {"coverage_percent": coverage, "mask_url": None},
        "regions": regions,
        "measurements": {
            # key name "affected_area" is what the frontend agent reads
            "affected_area": {"label": "Affected area", "value": suspicious, "unit": "%"},
            "vegetation_coverage": {"label": "Vegetation coverage", "value": coverage, "unit": "%"},
        },
        "processed_image_url": processed,
        "confidence": None,
    }


# Plain `def` (not async): FastAPI runs it in a worker thread, so the
# blocking download + OpenCV work does not freeze the server.
@router.post("/analyze")
def analyze(body: AnalyzeRequest, authorization: Optional[str] = Header(default=None)):
    _check_auth(authorization)
    image_bytes = _download_image(str(body.image_url))
    try:
        raw = analyze_crop_image(image_bytes)
    except ValueError as error:
        log.error("VISION analysis rejected image: %s", error)
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {error}")
    return _to_vision_result(body.analysis_id, raw)