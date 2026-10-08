def calculate_visual_health_score(
    suspicious_area_percent: float,
) -> dict:
    """
    Calculate an explainable visual health score.

    This is NOT a disease diagnosis.
    It is only a visual assessment based on
    the detected suspicious area.
    """

    if suspicious_area_percent <= 1:
        score = 95
        attention_level = "low"

    elif suspicious_area_percent <= 3:
        score = 85
        attention_level = "low"

    elif suspicious_area_percent <= 5:
        score = 70
        attention_level = "moderate"

    elif suspicious_area_percent <= 10:
        score = 50
        attention_level = "high"

    else:
        score = 30
        attention_level = "very_high"

    return {
        "score": score,
        "attention_level": attention_level,
        "basis": "Detected visually suspicious regions",
    }
