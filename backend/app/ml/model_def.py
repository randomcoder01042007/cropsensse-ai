"""Model architecture shared by training (ml/train.py) and serving (app/ml/classifier.py).

Keeping one definition guarantees the model that is served is built exactly
like the model that was trained.
"""

import torch.nn as nn
from torchvision import models

SUPPORTED_ARCHES = ("efficientnet_b0", "mobilenet_v3_large")


def build_model(arch: str, num_classes: int, pretrained: bool = False) -> nn.Module:
    if arch == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    elif arch == "mobilenet_v3_large":
        weights = models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
        model = models.mobilenet_v3_large(weights=weights)
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, num_classes)
    else:
        raise ValueError(f"Unsupported architecture '{arch}'. Use one of {SUPPORTED_ARCHES}.")
    return model
