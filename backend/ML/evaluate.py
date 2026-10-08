#!/usr/bin/env python
"""Test the REAL serving pipeline on your own photos.

Put real field photos in folders named after the true class, e.g.
    my_test_photos/Tomato___Late_blight/img1.jpg
    my_test_photos/Tomato___healthy/img2.jpg

Run from backend/:   python ml/evaluate.py my_test_photos
Also test with the crop chosen first (as the app does):  python ml/evaluate.py my_test_photos --with-crop

This uses the same preprocessing, confidence threshold and 'uncertain' rule
as the API, so it shows the accuracy your users will actually see.
"""

import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ml import classifier
from app.ml.diagnosis import CONFIDENCE_THRESHOLD, MIN_MARGIN

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# Set to True to test the way the app works when the user picks the crop first.
USE_CROP = "--with-crop" in sys.argv


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 1:
        sys.exit(__doc__)
    root = Path(args[0])
    stats = defaultdict(lambda: {"total": 0, "correct": 0, "uncertain": 0})
    mistakes = []

    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        for image_path in sorted(folder.iterdir()):
            if image_path.suffix.lower() not in EXTENSIONS:
                continue
            crop = folder.name.partition('___')[0]
            top = classifier.predict(image_path.read_bytes(), top_k=2, crop=crop if USE_CROP else None)["predictions"]
            margin = top[0]["confidence"] - (top[1]["confidence"] if len(top) > 1 else 0)
            s = stats[folder.name]
            s["total"] += 1
            if top[0]["confidence"] < CONFIDENCE_THRESHOLD or margin < MIN_MARGIN:
                s["uncertain"] += 1
            elif top[0]["label"] == folder.name:
                s["correct"] += 1
            else:
                mistakes.append((image_path.name, folder.name, top[0]["label"], top[0]["confidence"]))

    total = sum(s["total"] for s in stats.values())
    correct = sum(s["correct"] for s in stats.values())
    uncertain = sum(s["uncertain"] for s in stats.values())
    print(f"{'class':50} {'n':>4} {'correct':>8} {'unsure':>7}")
    for name, s in stats.items():
        print(f"{name:50} {s['total']:>4} {s['correct']:>8} {s['uncertain']:>7}")
    if total:
        print(f"\nCorrect: {correct}/{total} ({correct / total:.1%})   Uncertain: {uncertain} ({uncertain / total:.1%})   Confidently wrong: {len(mistakes)}")
    for name, true, predicted, conf in mistakes[:15]:
        print(f"  WRONG {name}: true={true} predicted={predicted} ({conf:.0%})")


if __name__ == "__main__":
    main()
