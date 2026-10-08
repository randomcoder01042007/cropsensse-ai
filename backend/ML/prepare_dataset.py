#!/usr/bin/env python
"""Merge several downloaded datasets into ONE training folder with standard class names.

Every dataset you download names its folders differently ("RedRot", "Cotton_Healthy",
"Bacterial blight"...). This script renames them to the standard  Crop___Disease
names used by the API, so you can train one model for all your crops.

Usage (from backend/):
    python ml/prepare_dataset.py ml/dataset_map.json --out /content/plant_data

Options:
    --max-per-class N   keep at most N images per class (default 1500) to balance classes
    --link              symlink instead of copy (saves disk space; not for Google Drive)

The map file lists your downloaded datasets. See ml/dataset_map.example.json.
Folder names are matched ignoring case, spaces, dashes and underscores, and the match
works on any parent folder, so nested layouts (such as severity sub-folders) are fine.
Edit the "classes" keys to match the real folder names in the datasets you downloaded.
"""

import argparse
import json
import random
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def destination_class(source: dict, image: Path, root: Path):
    """Return the standard class folder name for an image, or None to skip it."""
    ancestors = [p.name for p in image.relative_to(root).parents if p.name]
    # nearest folder first
    if source.get("passthrough"):
        wanted = {norm(c) for c in source.get("include_crops", [])}
        for name in ancestors:
            if "___" in name:
                crop = name.partition("___")[0]
                if not wanted or norm(crop) in wanted:
                    return name
                return None
        return None

    mapping = {norm(k): v for k, v in source["classes"].items()}
    for name in ancestors:
        if norm(name) in mapping:
            return f"{source['crop']}___{mapping[norm(name)]}"
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("map_file", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--max-per-class", type=int, default=1500)
    parser.add_argument("--link", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    config = json.loads(args.map_file.read_text(encoding="utf-8"))
    random.seed(args.seed)
    collected = defaultdict(list)  # class -> [(source_index, path)]

    for index, source in enumerate(config["sources"]):
        root = Path(source["path"])
        if not root.is_dir():
            print(f"WARNING: source folder not found, skipping: {root}")
            continue
        found = 0
        for image in root.rglob("*"):
            if image.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            cls = destination_class(source, image, root)
            if cls:
                collected[cls].append((index, image))
                found += 1
        print(f"{root}: matched {found} images")

    if not collected:
        sys.exit("No images matched. Check the folder names in your map file.")

    args.out.mkdir(parents=True, exist_ok=True)
    print(f"\n{'class':55} {'found':>6} {'used':>6}")
    for cls in sorted(collected):
        items = collected[cls]
        random.shuffle(items)
        used = items[: args.max_per_class]
        target = args.out / cls
        target.mkdir(parents=True, exist_ok=True)
        for n, (index, image) in enumerate(used):
            dest = target / f"s{index}_{n}_{image.name}"
            if dest.exists():
                continue
            if args.link:
                dest.symlink_to(image.resolve())
            else:
                shutil.copy2(image, dest)
        flag = "   <-- few images, add more" if len(used) < 150 else ""
        print(f"{cls:55} {len(items):>6} {len(used):>6}{flag}")

    crops = sorted({c.partition('___')[0] for c in collected})
    print(f"\nCrops in output: {', '.join(crops)}\nSaved to {args.out}")
    print("Next: python ml/train.py --data", args.out)


if __name__ == "__main__":
    main()
