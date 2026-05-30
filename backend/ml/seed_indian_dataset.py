"""
Dataset preparation for Indian demographic fine-tuning.
Merges IndicFairFace + IMFDB + JFAD into a unified folder structure,
splits by identity (not by image) to prevent leakage.

Usage:
    python seed_indian_dataset.py --src ~/datasets/indian_faces --dst ~/datasets/nhai_merged
"""

import argparse
import os
import shutil
import random
from pathlib import Path
from collections import defaultdict


def discover_identities(src: Path) -> dict[str, list[Path]]:
    """Walk source dirs and group images by identity folder name."""
    id_to_images: dict[str, list[Path]] = defaultdict(list)

    for dataset_dir in sorted(src.iterdir()):
        if not dataset_dir.is_dir():
            continue
        dataset_name = dataset_dir.name

        for identity_dir in sorted(dataset_dir.iterdir()):
            if not identity_dir.is_dir():
                continue
            identity_key = f"{dataset_name}__{identity_dir.name}"
            for img in identity_dir.iterdir():
                if img.suffix.lower() in ('.jpg', '.jpeg', '.png', '.bmp', '.webp'):
                    id_to_images[identity_key].append(img)

    return id_to_images


def split_identities(
    id_to_images: dict[str, list[Path]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    min_images: int = 2,
    seed: int = 42,
) -> tuple[dict[str, list[Path]], dict[str, list[Path]], dict[str, list[Path]]]:
    """Split by identity, not by image, to prevent data leakage."""
    ids = [k for k, v in id_to_images.items() if len(v) >= min_images]
    random.seed(seed)
    random.shuffle(ids)

    n = len(ids)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)

    train_ids = ids[:n_train]
    val_ids = ids[n_train:n_train + n_val]
    test_ids = ids[n_train + n_val:]

    train = {k: id_to_images[k] for k in train_ids}
    val = {k: id_to_images[k] for k in val_ids}
    test = {k: id_to_images[k] for k in test_ids}
    return train, val, test


def copy_split(split: dict[str, list[Path]], dst: Path, split_name: str) -> int:
    """Copy images into dst/split_name/identity/ structure."""
    count = 0
    split_dir = dst / split_name
    for identity, images in split.items():
        id_dir = split_dir / identity
        id_dir.mkdir(parents=True, exist_ok=True)
        for img in images:
            shutil.copy2(img, id_dir / img.name)
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(description="Prepare Indian face dataset for fine-tuning")
    parser.add_argument("--src", type=Path, required=True, help="Root dir with subdirs per dataset (IndicFairFace/, IMFDB/, JFAD/)")
    parser.add_argument("--dst", type=Path, required=True, help="Output merged dataset dir")
    parser.add_argument("--min-images", type=int, default=2, help="Min images per identity to include")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print(f"Scanning {args.src} ...")
    id_to_images = discover_identities(args.src)
    total_ids = len(id_to_images)
    total_imgs = sum(len(v) for v in id_to_images.values())
    print(f"Found {total_ids} identities, {total_imgs} images")

    train, val, test = split_identities(id_to_images, min_images=args.min_images, seed=args.seed)
    print(f"Split: train={len(train)} ids, val={len(val)} ids, test={len(test)} ids")

    if args.dst.exists():
        shutil.rmtree(args.dst)

    for name, split in [("train", train), ("val", val), ("test", test)]:
        n = copy_split(split, args.dst, name)
        print(f"  {name}: {n} images copied")

    print(f"Done. Dataset at {args.dst}")


if __name__ == "__main__":
    main()
