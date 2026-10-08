"""Combines the classifier with the disease knowledge base into one API-ready result."""

import os

from app.ml import classifier
from app.knowledge import lookup

# Below this top-1 probability the system refuses to name a disease.
CONFIDENCE_THRESHOLD = float(os.getenv("CROPSENSE_CONFIDENCE_THRESHOLD", "0.70"))
# Top-1 must also beat top-2 by at least this much.
MIN_MARGIN = float(os.getenv("CROPSENSE_MIN_MARGIN", "0.15"))
# If the user picked a crop, the model must put at least this much probability
# on that crop, otherwise the photo probably shows a different plant.
CROP_MATCH_MIN = float(os.getenv("CROPSENSE_CROP_MATCH_MIN", "0.40"))


def _describe(prediction: dict) -> dict:
    crop, disease = lookup.parse_label(prediction["label"])
    info = lookup.get_info(prediction["label"])
    return {
        "crop": info["crop"] or crop,
        "disease": info["disease"] or disease,
        "confidence": round(prediction["confidence"], 4),
    }


def diagnose(image_bytes: bytes, crop: str | None = None) -> dict:
    try:
        result = classifier.predict(image_bytes, top_k=3, crop=crop)
    except classifier.UnsupportedCropError as error:
        return {
            "status": "crop_not_supported",
            "message": (
                f"Disease detection for '{error.crop}' is not available yet. "
                "Supported crops: " + ", ".join(error.supported) + "."
            ),
            "supported_crops": error.supported,
        }
    except classifier.ModelNotAvailableError as error:
        return {"status": "model_not_loaded", "message": str(error)}
    except ValueError as error:
        return {"status": "error", "message": str(error)}
    except Exception as error:
        return {"status": "error", "message": f"Disease classification failed: {error}"}

    predictions = result["predictions"]

    if result["crop_mass"] is not None and result["crop_mass"] < CROP_MATCH_MIN:
        guess = _describe(result["overall_top"])
        return {
            "status": "crop_mismatch",
            "message": (
                f"This photo does not look like a {crop} leaf "
                f"(it looks more like {guess['crop']}). "
                "Check the selected crop or retake the photo."
            ),
            "looks_like": guess,
            "disclaimer": lookup.DISCLAIMER,
        }

    top = predictions[0]
    second_confidence = predictions[1]["confidence"] if len(predictions) > 1 else 0.0
    margin = top["confidence"] - second_confidence

    candidates = [_describe(p) for p in predictions]

    if top["confidence"] < CONFIDENCE_THRESHOLD or margin < MIN_MARGIN:
        return {
            "status": "uncertain",
            "message": (
                "The model is not confident enough to name a disease. "
                "Retake the photo with one leaf filling the frame, in daylight, "
                "in focus, and with a plain background, or ask an agriculture "
                "extension officer."
            ),
            "confidence": round(top["confidence"], 4),
            "possible_matches": candidates,
            "disclaimer": lookup.DISCLAIMER,
        }

    info = lookup.get_info(top["label"])

    return {
        "status": "identified",
        "crop": info["crop"],
        "disease": info["disease"],
        "is_healthy": info["is_healthy"],
        "cause": info["cause"],
        "confidence": round(top["confidence"], 4),
        "symptoms": info["symptoms"],
        "prevention": info["prevention"],
        "management": info["management"],
        "guidance_available": info["guidance_available"],
        "other_possibilities": candidates[1:],
        "disclaimer": lookup.DISCLAIMER,
    }
