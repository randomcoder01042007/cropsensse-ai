def make_agent_decision(
    analysis_result: dict,
) -> dict:
    """
    Make the first agent decision based on
    the initial OpenCV analysis.
    """

    health = analysis_result.get(
        "health_assessment",
        {}
    )

    suspicious_regions = analysis_result.get(
        "suspicious_regions",
        []
    )

    score = health.get(
        "score",
        0
    )

    attention_level = health.get(
        "attention_level",
        "unknown"
    )

    region_count = len(
        suspicious_regions
    )

    # High attention -> investigate suspicious regions
    if attention_level in {
        "high",
        "very_high",
    }:

        return {
            "decision": "investigate_regions",
            "reason": (
                "The visual analysis detected "
                "suspicious regions requiring "
                "further investigation."
            ),
            "next_action": "analyze_top_regions",
            "priority": "high",
            "health_score": score,
            "attention_level": attention_level,
            "suspicious_region_count": region_count,
        }

    # Moderate attention -> monitor
    if attention_level == "moderate":

        return {
            "decision": "monitor_crop",
            "reason": (
                "The visual analysis detected "
                "a moderate level of suspicious "
                "visual regions."
            ),
            "next_action": "monitor_and_recheck",
            "priority": "medium",
            "health_score": score,
            "attention_level": attention_level,
            "suspicious_region_count": region_count,
        }

    # Low attention -> complete
    if attention_level == "low":

        return {
            "decision": "no_immediate_action",
            "reason": (
                "No significant suspicious "
                "visual pattern was detected."
            ),
            "next_action": "complete_assessment",
            "priority": "low",
            "health_score": score,
            "attention_level": attention_level,
            "suspicious_region_count": region_count,
        }

    # Fallback
    return {
        "decision": "human_review",
        "reason": (
            "The system could not confidently "
            "determine the next action."
        ),
        "next_action": "request_human_review",
        "priority": "medium",
        "health_score": score,
        "attention_level": attention_level,
        "suspicious_region_count": region_count,
    }


def evaluate_detailed_regions(
    detailed_regions: list[dict],
) -> dict:
    """
    Make a second decision after detailed
    OpenCV analysis of suspicious regions.

    This is a visual assessment only.
    It does NOT diagnose a disease.
    """

    if not detailed_regions:
        return {
            "decision": "no_additional_concern",
            "reason": (
                "No valid suspicious regions "
                "were available for detailed analysis."
            ),
            "next_action": "complete_assessment",
            "priority": "low",
        }

    suspicious_ratios = [
        region["suspicious_ratio_percent"]
        for region in detailed_regions
        if region.get("status") == "region_analyzed"
    ]

    if not suspicious_ratios:
        return {
            "decision": "human_review",
            "reason": (
                "The detailed region analysis "
                "could not produce reliable measurements."
            ),
            "next_action": "request_human_review",
            "priority": "medium",
        }

    average_ratio = (
        sum(suspicious_ratios)
        / len(suspicious_ratios)
    )

    maximum_ratio = max(
        suspicious_ratios
    )

    # Strong visual signal
    if average_ratio >= 50:

        return {
            "decision": "high_attention",
            "reason": (
                "Detailed OpenCV analysis found "
                "a strong suspicious visual pattern "
                "across the selected regions."
            ),
            "next_action": "request_field_attention",
            "priority": "high",
            "average_suspicious_ratio_percent": round(
                average_ratio,
                2,
            ),
            "maximum_suspicious_ratio_percent": round(
                maximum_ratio,
                2,
            ),
            "regions_evaluated": len(
                suspicious_ratios
            ),
        }

    # Moderate visual signal
    if average_ratio >= 25:

        return {
            "decision": "moderate_attention",
            "reason": (
                "Detailed OpenCV analysis found "
                "a moderate suspicious visual pattern "
                "across the selected regions."
            ),
            "next_action": "monitor_and_recheck",
            "priority": "medium",
            "average_suspicious_ratio_percent": round(
                average_ratio,
                2,
            ),
            "maximum_suspicious_ratio_percent": round(
                maximum_ratio,
                2,
            ),
            "regions_evaluated": len(
                suspicious_ratios
            ),
        }

    # Weak visual signal
    return {
        "decision": "low_attention",
        "reason": (
            "Detailed OpenCV analysis found "
            "a relatively weak suspicious visual pattern."
        ),
        "next_action": "complete_assessment",
        "priority": "low",
        "average_suspicious_ratio_percent": round(
            average_ratio,
            2,
        ),
        "maximum_suspicious_ratio_percent": round(
            maximum_ratio,
            2,
        ),
        "regions_evaluated": len(
            suspicious_ratios
        ),
    }