import cv2
import numpy as np


def create_annotated_image(
    image: np.ndarray,
    suspicious_regions: list[dict],
    top_regions: list[dict] | None = None,
) -> np.ndarray:
    """
    Draw suspicious regions on the image.

    This creates visual evidence for the analysis.
    It does NOT indicate a confirmed disease.
    """

    annotated = image.copy()

    # Collect IDs of the regions that received
    # detailed second-stage analysis.
    top_region_ids = set()

    if top_regions:
        top_region_ids = {
            region["region_id"]
            for region in top_regions
        }

    for region in suspicious_regions:

        x = region["x"]
        y = region["y"]
        width = region["width"]
        height = region["height"]

        region_id = region["id"]

        # Highlight regions that were analyzed
        # in the second stage.
        if region_id in top_region_ids:
            thickness = 3
        else:
            thickness = 1

        # Draw bounding box
        cv2.rectangle(
            annotated,
            (x, y),
            (x + width, y + height),
            (0, 0, 255),
            thickness,
        )

        # Add region label
        label = region_id

        label_y = max(
            y - 8,
            20,
        )

        cv2.putText(
            annotated,
            label,
            (x, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 255),
            1,
            cv2.LINE_AA,
        )

    return annotated


def encode_image(
    image: np.ndarray,
) -> str:
    """
    Encode an OpenCV image as a base64 JPEG string.
    """

    success, buffer = cv2.imencode(
        ".jpg",
        image,
    )

    if not success:
        raise ValueError(
            "Failed to encode annotated image."
        )

    import base64

    encoded = base64.b64encode(
        buffer
    ).decode("utf-8")

    return encoded
