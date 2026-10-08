"""Maps a model class label to human-readable disease information."""

import json
import re
from pathlib import Path

_DATA = json.loads(
    (Path(__file__).parent / "diseases.json").read_text(encoding="utf-8")
)

DISCLAIMER = _DATA["disclaimer"]


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


_LABEL_TO_KEY = {_norm(label): key for label, key in _DATA["labels"].items()}


def _tidy(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("_", " ")).strip()


def crop_key(name):
    """Normalise a crop name from the frontend or a class label to one key.

    'Maize', 'Corn_(maize)' -> 'maize';  'Soyabean', 'Soybean' -> 'soybean'.
    Returns None for blank / 'Others' (meaning: do not filter by crop).
    """
    if not name:
        return None
    n = _norm(name)
    if n in {"other", "others", "unknown", "notsure", "all", "any"}:
        return None
    if "maize" in n or n.startswith("corn"):
        return "maize"
    if n.startswith("soy"):
        return "soybean"
    if n.startswith("pepper"):
        return "pepper"
    return n


def parse_label(label: str) -> tuple[str, str]:
    """'Tomato___Late_blight' -> ('Tomato', 'Late blight')."""
    crop, _, disease = label.partition("___")
    return _tidy(crop), _tidy(disease)


def get_info(label: str) -> dict:
    """Return crop, disease name, health flag and guidance for a class label."""
    crop, disease = parse_label(label)
    key = _LABEL_TO_KEY.get(_norm(label))

    if key is None:
        key = "healthy" if "healthy" in _norm(disease) else None

    if key == "healthy":
        entry = _DATA["healthy"]
        return {
            "crop": crop,
            "disease": "Healthy",
            "is_healthy": True,
            "cause": None,
            "symptoms": entry["symptoms"],
            "prevention": entry["prevention"],
            "management": entry["management"],
            "guidance_available": True,
        }

    if key is not None:
        entry = _DATA["diseases"][key]
        return {
            "crop": crop,
            "disease": entry["name"],
            "is_healthy": False,
            "cause": entry["cause"],
            "symptoms": entry["symptoms"],
            "prevention": entry["prevention"],
            "management": entry["management"],
            "guidance_available": True,
        }

    # Class exists in the model but has no entry yet (for example a crop you added).
    return {
        "crop": crop,
        "disease": disease or label,
        "is_healthy": False,
        "cause": None,
        "symptoms": [],
        "prevention": [],
        "management": [
            "No stored guidance for this disease yet. "
            "Consult a local agriculture extension officer."
        ],
        "guidance_available": False,
    }
