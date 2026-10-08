"""Loads the trained crop disease model once and runs predictions.

The model file is produced by ml/train.py and is NOT stored in git.
Default location: backend/models/cropsense_model.pt
Override the folder with the CROPSENSE_MODEL_DIR environment variable.
"""

import io
import json
import os
import threading
from pathlib import Path

from PIL import Image, ImageOps

from app.knowledge import lookup

MODEL_FILENAME = "cropsense_model.pt"
MODEL_DIR = Path(
    os.getenv("CROPSENSE_MODEL_DIR", Path(__file__).resolve().parents[2] / "models")
)
MODEL_PATH = MODEL_DIR / MODEL_FILENAME

_lock = threading.Lock()
_bundle = None


class ModelNotAvailableError(RuntimeError):
    """Raised when the trained model or the ML libraries are missing."""


class UnsupportedCropError(ValueError):
    """Raised when the selected crop has no classes in the trained model."""

    def __init__(self, crop, supported):
        super().__init__(f"The model has not been trained on '{crop}' yet.")
        self.crop = crop
        self.supported = supported


def _crop_names(classes) -> list[str]:
    names = {}
    for label in classes:
        crop = label.partition("___")[0]
        names.setdefault(lookup.crop_key(crop), lookup.parse_label(label)[0])
    return sorted(names.values())


def model_status() -> dict:
    """Cheap status check that does not load torch or the model."""
    status = {
        "model_file_found": MODEL_PATH.exists(),
        "model_path": str(MODEL_PATH),
        "supported_crops": [],
    }
    classes_file = MODEL_DIR / "classes.json"
    if classes_file.exists():
        try:
            status["supported_crops"] = _crop_names(json.loads(classes_file.read_text(encoding="utf-8")))
        except Exception:
            pass
    return status


def _load():
    global _bundle
    if _bundle is not None:
        return _bundle

    with _lock:
        if _bundle is not None:
            return _bundle

        if not MODEL_PATH.exists():
            raise ModelNotAvailableError(
                f"Trained model not found at {MODEL_PATH}. "
                "Train one with ml/train.py and place cropsense_model.pt in that folder."
            )

        try:
            import torch
            from torchvision import transforms
            from app.ml.model_def import build_model
        except ImportError as error:
            raise ModelNotAvailableError(
                "PyTorch and torchvision are required. Run: pip install torch torchvision"
            ) from error

        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)

        classes = checkpoint["classes"]
        img_size = int(checkpoint.get("img_size", 224))

        model = build_model(checkpoint["arch"], len(classes), pretrained=False)
        model.load_state_dict(checkpoint["state_dict"])
        model.eval()

        # Must match the evaluation transform used in ml/train.py.
        transform = transforms.Compose([
            transforms.Resize(int(img_size * 256 / 224)),
            transforms.CenterCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize(checkpoint["mean"], checkpoint["std"]),
        ])

        _bundle = {
            "torch": torch,
            "model": model,
            "classes": classes,
            "transform": transform,
        }
        return _bundle


def predict(image_bytes: bytes, top_k: int = 3, crop: str | None = None) -> dict:
    """Classify a leaf photo.

    Returns {"predictions": [{"label", "confidence"}...], "crop_mass": float | None,
             "overall_top": {"label", "confidence"}}

    If `crop` is given (and is not 'Others'), only that crop's classes are
    considered and probabilities are re-normalised among them. `crop_mass` is the
    probability the full model puts on that crop: a low value means the photo
    probably is not of the selected crop.
    """
    bundle = _load()
    torch = bundle["torch"]
    classes = bundle["classes"]

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception as error:
        raise ValueError("The uploaded file is not a valid image.") from error

    tensor = bundle["transform"](image).unsqueeze(0)

    with torch.inference_mode():
        probabilities = torch.softmax(bundle["model"](tensor), dim=1)[0]

    best = int(probabilities.argmax())
    overall_top = {"label": classes[best], "confidence": float(probabilities[best])}

    wanted = lookup.crop_key(crop)
    crop_mass = None
    if wanted is not None:
        keep = [i for i, c in enumerate(classes) if lookup.crop_key(c.partition("___")[0]) == wanted]
        if not keep:
            raise UnsupportedCropError(crop, _crop_names(classes))
        crop_mass = float(probabilities[keep].sum())
        subset = probabilities[keep]
        subset = subset / subset.sum().clamp_min(1e-9)
        k = min(top_k, len(keep))
        values, order = subset.topk(k)
        predictions = [{"label": classes[keep[int(i)]], "confidence": float(v)} for v, i in zip(values, order)]
    else:
        k = min(top_k, len(classes))
        values, indices = probabilities.topk(k)
        predictions = [{"label": classes[int(i)], "confidence": float(v)} for v, i in zip(values, indices)]

    return {"predictions": predictions, "crop_mass": crop_mass, "overall_top": overall_top}
