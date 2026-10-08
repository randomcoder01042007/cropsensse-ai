from fastapi import APIRouter

from app.ml.classifier import model_status

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "CropSense AI Backend",
        "version": "1.0.0",
        "classifier": model_status(),
    }