from app.vision.preprocessing import (
    verify_opencv_version,
    decode_image,
    resize_image,
)

from app.vision.segmentation import (
    create_vegetation_mask,
    calculate_vegetation_coverage,
)

from app.vision.detection import (
    detect_suspicious_regions,
)

from app.vision.health_score import (
    calculate_visual_health_score,
)

from app.agent.decision import (
    make_agent_decision,
    evaluate_detailed_regions,
)

from app.vision.region_analysis import (
    analyze_top_regions,
)

from app.vision.annotation import (
    create_annotated_image,
    encode_image,
)


def analyze_crop_image(
    image_bytes: bytes,
) -> dict:

    # 1. Check OpenCV version
    opencv_version = verify_opencv_version()

    # 2. Decode uploaded image
    image = decode_image(image_bytes)

    # 3. Resize large images
    image = resize_image(image)

    # 4. Detect vegetation
    vegetation_mask = create_vegetation_mask(
        image
    )

    # 5. Calculate vegetation coverage
    vegetation_coverage = calculate_vegetation_coverage(
        vegetation_mask
    )

    # 6. Detect suspicious regions
    suspicious_regions = detect_suspicious_regions(
        image,
        vegetation_mask,
    )

    # 7. Calculate suspicious area
    suspicious_area_percent = sum(
        region["area_percent"]
        for region in suspicious_regions
    )

    # 8. Calculate health assessment
    health_assessment = calculate_visual_health_score(
        suspicious_area_percent
    )

    # 9. Initial analysis
    result = {
        "opencv_version": opencv_version,

        "image": {
            "width": image.shape[1],
            "height": image.shape[0],
        },

        "vegetation": {
            "coverage_percent": vegetation_coverage,
        },

        "measurements": {
            "suspicious_area_percent": round(
                suspicious_area_percent,
                2,
            ),
        },

        "health_assessment": health_assessment,

        "suspicious_regions": suspicious_regions,
    }

    # 10. First agent decision
    agent_decision = make_agent_decision(
        result
    )

    result["agent_decision"] = agent_decision

    # Store detailed analysis
    detailed_regions = []

    # 11. Execute agent-selected action
    if (
        agent_decision["next_action"]
        == "analyze_top_regions"
    ):

        detailed_regions = analyze_top_regions(
            image,
            suspicious_regions,
            top_n=5,
        )

        result["detailed_region_analysis"] = (
            detailed_regions
        )

        # 12. Second agent decision
        detailed_decision = evaluate_detailed_regions(
            detailed_regions
        )

        result["detailed_agent_decision"] = (
            detailed_decision
        )

    # 13. Create annotated image
    annotated_image = create_annotated_image(
        image,
        suspicious_regions,
        detailed_regions,
    )

    # 14. Encode annotated image
    annotated_image_base64 = encode_image(
        annotated_image
    )

    # 15. Add image information
    result["visual_output"] = {
        "format": "jpeg",
        "encoding": "base64",
        "data": annotated_image_base64,
    }

    # 16. Final status
    result["status"] = "analysis_completed"

    return result