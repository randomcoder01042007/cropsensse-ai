import cv2
import numpy as np


def verify_opencv_version() -> str:
    """
    Make sure CropSense AI is using OpenCV 5.
    """
    version = cv2.__version__

    if not version.startswith("5."):
        raise RuntimeError(
            f"CropSense AI requires OpenCV 5.x. "
            f"Detected OpenCV {version}."
        )

    return version


def decode_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert uploaded image bytes into an OpenCV image.
    """

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise ValueError(
            "The uploaded file is not a valid image."
        )

    return image


def resize_image(
    image: np.ndarray,
    max_width: int = 1600,
    max_height: int = 1600,
) -> np.ndarray:
    """
    Resize very large images while preserving aspect ratio.
    """

    height, width = image.shape[:2]

    if width <= max_width and height <= max_height:
        return image

    scale = min(
        max_width / width,
        max_height / height,
    )

    new_width = int(width * scale)
    new_height = int(height * scale)

    return cv2.resize(
        image,
        (new_width, new_height),
        interpolation=cv2.INTER_AREA,
    )