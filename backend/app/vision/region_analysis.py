import cv2
import numpy as np


def analyze_region(
    image: np.ndarray,
    region: dict,
) -> dict:
    """
    Analyze one suspicious region using OpenCV.

    This performs visual analysis only.
    It does NOT diagnose a disease.
    """

    x = region["x"]
    y = region["y"]
    width = region["width"]
    height = region["height"]

    # Extract the region from the image
    roi = image[
        y:y + height,
        x:x + width
    ]

    # Safety check
    if roi.size == 0:
        return {
            "region_id": region["id"],
            "status": "invalid_region",
        }

    # Convert region to HSV
    hsv = cv2.cvtColor(
        roi,
        cv2.COLOR_BGR2HSV,
    )

    # Green vegetation range
    lower_green = np.array([
        25,
        40,
        30,
    ])

    upper_green = np.array([
        95,
        255,
        255,
    ])

    vegetation_mask = cv2.inRange(
        hsv,
        lower_green,
        upper_green,
    )

    # Yellow/brown suspicious range
    lower_suspicious = np.array([
        8,
        70,
        30,
    ])

    upper_suspicious = np.array([
        35,
        255,
        220,
    ])

    suspicious_mask = cv2.inRange(
        hsv,
        lower_suspicious,
        upper_suspicious,
    )

    # Only count suspicious pixels
    # that are inside vegetation.
    suspicious_in_vegetation = cv2.bitwise_and(
        suspicious_mask,
        vegetation_mask,
    )

    vegetation_pixels = cv2.countNonZero(
        vegetation_mask
    )

    suspicious_pixels = cv2.countNonZero(
        suspicious_in_vegetation
    )

    # Calculate suspicious percentage
    if vegetation_pixels > 0:
        suspicious_ratio = (
            suspicious_pixels /
            vegetation_pixels
        ) * 100
    else:
        suspicious_ratio = 0

    # Calculate average HSV values
    mean_hsv = cv2.mean(hsv)[:3]

    return {
        "region_id": region["id"],

        "coordinates": {
            "x": x,
            "y": y,
            "width": width,
            "height": height,
        },

        "vegetation_pixels": vegetation_pixels,

        "suspicious_pixels": suspicious_pixels,

        "suspicious_ratio_percent": round(
            suspicious_ratio,
            2,
        ),

        "mean_hsv": {
            "h": round(mean_hsv[0], 2),
            "s": round(mean_hsv[1], 2),
            "v": round(mean_hsv[2], 2),
        },

        "status": "region_analyzed",
    }


def analyze_top_regions(
    image: np.ndarray,
    suspicious_regions: list[dict],
    top_n: int = 5,
) -> list[dict]:
    """
    Analyze the largest suspicious regions.

    The agent can use this function as a
    second-stage OpenCV action.
    """

    # Sort regions by detected area
    sorted_regions = sorted(
        suspicious_regions,
        key=lambda region: region["area_pixels"],
        reverse=True,
    )

    # Select only the top regions
    selected_regions = sorted_regions[:top_n]

    analyzed_regions = []

    for region in selected_regions:

        result = analyze_region(
            image,
            region,
        )

        analyzed_regions.append(
            result
        )

    return analyzed_regions