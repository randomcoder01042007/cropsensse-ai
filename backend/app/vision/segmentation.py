import cv2
import numpy as np


def create_vegetation_mask(
    image: np.ndarray,
) -> np.ndarray:
    """
    Create a mask for visually detected vegetation.
    """

    hsv = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2HSV,
    )

    # HSV range for green vegetation
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

    mask = cv2.inRange(
        hsv,
        lower_green,
        upper_green,
    )

    # Remove small noise
    kernel = np.ones(
        (5, 5),
        np.uint8,
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        kernel,
    )

    # Fill small gaps
    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        kernel,
    )

    return mask


def calculate_vegetation_coverage(
    mask: np.ndarray,
) -> float:
    """
    Calculate the percentage of the image
    classified as vegetation.
    """

    total_pixels = mask.size

    vegetation_pixels = cv2.countNonZero(
        mask
    )

    coverage = (
        vegetation_pixels /
        total_pixels
    ) * 100

    return round(
        coverage,
        2,
    )