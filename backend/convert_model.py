import json
from pathlib import Path
import torch

SOURCE_MODEL = Path("pretrained_model/model_v1.pt")

SOURCE_CLASSES = Path(
    r"C:\Users\lenovo\Downloads\Plant_Disease_Classifier-main"
    r"\Plant_Disease_Classifier-main\artifacts\reports\class_to_idx.json"
)

OUTPUT_DIR = Path("models")
OUTPUT_MODEL = OUTPUT_DIR / "cropsense_model.pt"
OUTPUT_CLASSES = OUTPUT_DIR / "classes.json"


# Check files
if not SOURCE_MODEL.exists():
    raise FileNotFoundError(f"Model not found: {SOURCE_MODEL}")

if not SOURCE_CLASSES.exists():
    raise FileNotFoundError(f"Class mapping not found: {SOURCE_CLASSES}")


# Load pretrained checkpoint
print("Loading pretrained model...")

checkpoint = torch.load(
    SOURCE_MODEL,
    map_location="cpu",
    weights_only=False
)

state_dict = checkpoint["model_state_dict"]


# Load class mapping
with open(SOURCE_CLASSES, "r", encoding="utf-8") as f:
    class_to_idx = json.load(f)

classes = [
    name
    for name, index in sorted(
        class_to_idx.items(),
        key=lambda item: item[1]
    )
]

print(f"Number of classes: {len(classes)}")

if len(classes) != 38:
    raise ValueError(
        f"Expected 38 classes, found {len(classes)}"
    )


# Verify EfficientNet classifier
print(
    "Classifier weight:",
    state_dict["classifier.1.weight"].shape
)

print(
    "Classifier bias:",
    state_dict["classifier.1.bias"].shape
)


# Create CropSense-compatible checkpoint
cropsense_checkpoint = {
    "arch": "efficientnet_b0",
    "classes": classes,
    "img_size": 224,
    "mean": [
        0.485,
        0.456,
        0.406
    ],
    "std": [
        0.229,
        0.224,
        0.225
    ],
    "val_acc": checkpoint.get("extra", {}).get(
        "val_acc",
        checkpoint.get("best_metric", 0.0)
    ),
    "state_dict": state_dict
}


# Create output folder
OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# Save model
torch.save(
    cropsense_checkpoint,
    OUTPUT_MODEL
)


# Save class list
with open(
    OUTPUT_CLASSES,
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        classes,
        f,
        indent=2
    )


print()
print("====================================")
print("MODEL CONVERSION SUCCESSFUL")
print("====================================")
print(f"Model:   {OUTPUT_MODEL}")
print(f"Classes: {OUTPUT_CLASSES}")
print(f"Classes: {len(classes)}")
print(
    f"Validation accuracy: "
    f"{cropsense_checkpoint['val_acc']:.4f}"
)
print("====================================")