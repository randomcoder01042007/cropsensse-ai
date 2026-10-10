import cv2
import numpy as np


def detect_suspicious_regions(
    image: np.ndarray,
    vegetation_mask: np.ndarray,
) -> list[dict]:
    """
    Detect visually suspicious regions inside vegetation.

    This identifies regions that may require attention.
    It does NOT diagnose a specific crop disease.
    """

    hsv = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2HSV,
    )

    # Detect yellow/brown visual changes.
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

    # Only consider suspicious pixels inside vegetation.
    suspicious_mask = cv2.bitwise_and(
        suspicious_mask,
        vegetation_mask,
    )

    # Remove small noise and connect nearby pixels.
    kernel = np.ones(
        (5, 5),
        np.uint8,
    )

    suspicious_mask = cv2.morphologyEx(
        suspicious_mask,
        cv2.MORPH_OPEN,
        kernel,
    )

    suspicious_mask = cv2.morphologyEx(
        suspicious_mask,
        cv2.MORPH_CLOSE,
        kernel,
    )

    # Find connected suspicious regions.
    contours, _ = cv2.findContours(
        suspicious_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    image_height, image_width = image.shape[:2]

    image_area = (
        image_height *
        image_width
    )

    regions = []

    for index, contour in enumerate(contours):

        area = cv2.contourArea(contour)

        # Ignore very small regions.
        if area < 150:
            continue

        # Ignore extremely large regions.
        # These are more likely to be segmentation errors.
        if area > image_area * 0.02:
            continue

        x, y, width, height = cv2.boundingRect(
            contour
        )

        # Ignore regions touching the image border.
        # Border regions are often caused by background.
        touches_border = (
            x <= 0
            or y <= 0
            or x + width >= image_width
            or y + height >= image_height
        )

        if touches_border:
            continue

        area_percent = (
            area /
            image_area
        ) * 100

        regions.append({
            "id": f"region_{len(regions) + 1}",
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "area_pixels": round(
                area,
                2,
            ),
            "area_percent": round(
                area_percent,
                2,
            ),
        })

    # Sort largest suspicious regions first.
    regions.sort(
        key=lambda region: region["area_pixels"],
        reverse=True,
    )

    # Keep only the top 20 regions.
    regions = regions[:20]

    return regions