#!/usr/bin/env python
"""Train the CropSense crop disease classifier.

Run from the backend/ folder, for example:

    python ml/train.py --data /content/plant_data --epochs 12

DATA LAYOUT (either one works)
  A) <data>/train/<class>/*.jpg  and  <data>/valid/<class>/*.jpg
  B) <data>/<class>/*.jpg        (a validation split is made automatically)

Name class folders like  Crop___Disease  (three underscores), e.g.
Tomato___Late_blight, Rice___Brown_spot, Wheat___healthy.
Add your own crops and real field photos as extra class folders and retrain.

OUTPUT (in --out, default backend/models/)
  cropsense_model.pt     weights + class names, used by the API
  classes.json           class list
  training_report.json   accuracy, per-class accuracy, top confusions
"""

import argparse
import json
import random
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms

from app.ml.model_def import SUPPORTED_ARCHES, build_model

MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)


def find_split_root(data: Path):
    """Return (train_dir, valid_dir) if a train/valid layout exists, else None."""
    for base in [data, *data.rglob("train")]:
        base = base.parent if base.name == "train" else base
        train = base / "train"
        valid = next((base / n for n in ("valid", "val", "validation") if (base / n).is_dir()), None)
        if train.is_dir() and valid is not None:
            return train, valid
    return None


def make_transforms(size: int):
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(size, scale=(0.4, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(25),
        # Small hue change on purpose: disease colours (yellow vs green vs brown) matter.
        transforms.ColorJitter(brightness=0.35, contrast=0.35, saturation=0.3, hue=0.03),
        transforms.RandomApply([transforms.GaussianBlur(5, sigma=(0.1, 1.5))], p=0.2),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
        transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize(int(size * 256 / 224)),
        transforms.CenterCrop(size),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    return train_tf, eval_tf


def evaluate(model, loader, device, num_classes, criterion):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    per_class_total = torch.zeros(num_classes)
    per_class_correct = torch.zeros(num_classes)
    confusion = Counter()
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            total_loss += criterion(outputs, labels).item() * labels.size(0)
            predicted = outputs.argmax(1)
            correct += (predicted == labels).sum().item()
            total += labels.size(0)
            for t, p in zip(labels.cpu().tolist(), predicted.cpu().tolist()):
                per_class_total[t] += 1
                if t == p:
                    per_class_correct[t] += 1
                else:
                    confusion[(t, p)] += 1
    return total_loss / max(total, 1), correct / max(total, 1), per_class_correct, per_class_total, confusion


def run_epoch(model, loader, optimizer, criterion, scaler, device):
    model.train()
    running, seen = 0.0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device, enabled=(device == "cuda")):
            loss = criterion(model(images), labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        running += loss.item() * labels.size(0)
        seen += labels.size(0)
    return running / max(seen, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "models")
    parser.add_argument("--arch", default="efficientnet_b0", choices=SUPPORTED_ARCHES)
    parser.add_argument("--img-size", type=int, default=224)
    parser.add_argument("--epochs", type=int, default=12, help="total epochs, including warm-up")
    parser.add_argument("--warmup-epochs", type=int, default=2, help="epochs training only the classifier head")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--val-split", type=float, default=0.2, help="used only for layout B")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--class-weights", action="store_true", help="help with imbalanced classes")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}" + ("  (training on CPU will be very slow; use a GPU)" if device == "cpu" else ""))

    train_tf, eval_tf = make_transforms(args.img_size)

    split = find_split_root(args.data)
    if split:
        train_dir, valid_dir = split
        train_ds = datasets.ImageFolder(train_dir, train_tf)
        val_ds = datasets.ImageFolder(valid_dir, eval_tf)
        if train_ds.classes != val_ds.classes:
            sys.exit("train and valid folders must contain the same class folders.")
        print(f"Layout A: train={train_dir}  valid={valid_dir}")
    else:
        full_train = datasets.ImageFolder(args.data, train_tf)
        full_eval = datasets.ImageFolder(args.data, eval_tf)
        indices = list(range(len(full_train)))
        random.shuffle(indices)
        cut = int(len(indices) * (1 - args.val_split))
        train_ds, val_ds = Subset(full_train, indices[:cut]), Subset(full_eval, indices[cut:])
        print(f"Layout B: {args.data}  (random {args.val_split:.0%} validation split)")

    base = train_ds.dataset if isinstance(train_ds, Subset) else train_ds
    classes = base.classes
    num_classes = len(classes)
    print(f"{num_classes} classes, {len(train_ds)} train images, {len(val_ds)} validation images")
    if num_classes < 2:
        sys.exit("Need at least 2 class folders.")

    train_loader = DataLoader(train_ds, args.batch_size, shuffle=True, num_workers=args.workers, pin_memory=(device == "cuda"))
    val_loader = DataLoader(val_ds, args.batch_size, shuffle=False, num_workers=args.workers, pin_memory=(device == "cuda"))

    weight = None
    if args.class_weights:
        counts = Counter(base.targets if not isinstance(train_ds, Subset) else [base.targets[i] for i in train_ds.indices])
        weight = torch.tensor([len(train_ds) / (num_classes * max(counts[i], 1)) for i in range(num_classes)], dtype=torch.float).to(device)
    criterion = nn.CrossEntropyLoss(weight=weight, label_smoothing=0.1)
    eval_criterion = nn.CrossEntropyLoss()

    model = build_model(args.arch, num_classes, pretrained=True).to(device)
    scaler = torch.amp.GradScaler(enabled=(device == "cuda"))

    best_acc, best_state, history = 0.0, None, []
    warmup = min(args.warmup_epochs, args.epochs)

    for epoch in range(1, args.epochs + 1):
        if epoch == 1 and warmup > 0:
            for p in model.features.parameters():
                p.requires_grad = False
            optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)
            scheduler = None
        if epoch == warmup + 1:
            for p in model.parameters():
                p.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs - warmup, 1))

        started = time.time()
        train_loss = run_epoch(model, train_loader, optimizer, criterion, scaler, device)
        if scheduler:
            scheduler.step()
        val_loss, val_acc, pc_correct, pc_total, confusion = evaluate(model, val_loader, device, num_classes, eval_criterion)
        history.append({"epoch": epoch, "train_loss": round(train_loss, 4), "val_loss": round(val_loss, 4), "val_acc": round(val_acc, 4)})
        print(f"Epoch {epoch:>2}/{args.epochs}  train_loss={train_loss:.4f}  val_loss={val_loss:.4f}  val_acc={val_acc:.4f}  ({time.time() - started:.0f}s)")

        if val_acc >= best_acc:
            best_acc = val_acc
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            best_pc = (pc_correct.clone(), pc_total.clone(), confusion)

    args.out.mkdir(parents=True, exist_ok=True)
    torch.save({
        "arch": args.arch,
        "classes": classes,
        "img_size": args.img_size,
        "mean": list(MEAN),
        "std": list(STD),
        "val_acc": best_acc,
        "state_dict": best_state,
    }, args.out / "cropsense_model.pt")
    (args.out / "classes.json").write_text(json.dumps(classes, indent=2), encoding="utf-8")

    pc_correct, pc_total, confusion = best_pc
    per_class = {classes[i]: round(float(pc_correct[i] / pc_total[i]), 4) for i in range(num_classes) if pc_total[i] > 0}
    top_confusions = [{"true": classes[t], "predicted": classes[p], "count": n} for (t, p), n in confusion.most_common(10)]
    report = {"best_val_acc": round(best_acc, 4), "history": history, "per_class_accuracy": per_class, "top_confusions": top_confusions}
    (args.out / "training_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\nBest validation accuracy: {best_acc:.4f}")
    print("Weakest classes:")
    for name, acc in sorted(per_class.items(), key=lambda kv: kv[1])[:8]:
        print(f"  {acc:.3f}  {name}")
    print("Most common confusions:")
    for c in top_confusions[:8]:
        print(f"  {c['count']:>4}x  {c['true']}  ->  {c['predicted']}")
    print(f"\nSaved model to {args.out / 'cropsense_model.pt'}")


if __name__ == "__main__":
    main()
