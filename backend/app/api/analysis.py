from fastapi import APIRouter, File, UploadFile, HTTPException

from app.vision.analysis import analyze_crop_image


router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
)


@router.post("")
async def analyze_crop_image_api(
    file: UploadFile = File(...)
):
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    # Check file type
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    # Read uploaded image
    image_bytes = await file.read()

    # Check empty file
    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    try:
        # Run OpenCV analysis
        result = analyze_crop_image(
            image_bytes
        )

        # Return analysis result
        return {
            "filename": file.filename,
            **result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {str(error)}",
        )