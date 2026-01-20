#!/usr/bin/env python3
"""
FolliCore Data Preprocessing Script

Processes raw datasets and creates train/val/test splits.

Usage:
    python preprocess.py --dataset ham10000
    python preprocess.py --dataset all
    python preprocess.py --verify
"""

import os
import sys
import argparse
import shutil
import json
from pathlib import Path
from typing import Dict, List, Tuple
import random

import numpy as np
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# Paths
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR.parent
DATA_RAW_DIR = ML_DIR / "data" / "raw"
DATA_PROCESSED_DIR = ML_DIR / "data" / "processed"
DATA_INTERIM_DIR = ML_DIR / "data" / "interim"

# Split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# Random seed for reproducibility
RANDOM_SEED = 42


def set_seed(seed: int = RANDOM_SEED):
    """Set random seed for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)


def create_split_dirs():
    """Create train/val/test directories."""
    for split in ["train", "val", "test"]:
        split_dir = DATA_PROCESSED_DIR / split
        split_dir.mkdir(parents=True, exist_ok=True)
    DATA_INTERIM_DIR.mkdir(parents=True, exist_ok=True)


def get_image_files(directory: Path, extensions: List[str] = None) -> List[Path]:
    """Get all image files from a directory."""
    if extensions is None:
        extensions = [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]

    image_files = []
    for ext in extensions:
        image_files.extend(directory.glob(f"**/*{ext}"))
        image_files.extend(directory.glob(f"**/*{ext.upper()}"))

    return sorted(image_files)


def preprocess_ham10000():
    """
    Preprocess HAM10000 dataset.

    HAM10000 structure:
    - ham10000/
        - HAM10000_images_part_1/
        - HAM10000_images_part_2/
        - HAM10000_metadata.csv

    Classes:
    - akiec: Actinic keratoses
    - bcc: Basal cell carcinoma
    - bkl: Benign keratosis
    - df: Dermatofibroma
    - mel: Melanoma
    - nv: Melanocytic nevi
    - vasc: Vascular lesions
    """
    print("\n" + "="*60)
    print("Processing HAM10000 dataset...")
    print("="*60)

    raw_dir = DATA_RAW_DIR / "ham10000"

    if not raw_dir.exists():
        print(f"ERROR: HAM10000 not found at {raw_dir}")
        print("Run: python download_datasets.py --dataset ham10000")
        return False

    # Find metadata file
    metadata_files = list(raw_dir.glob("**/HAM10000_metadata.csv"))
    if not metadata_files:
        print("ERROR: HAM10000_metadata.csv not found")
        return False

    metadata_path = metadata_files[0]
    print(f"Found metadata: {metadata_path}")

    # Load metadata
    df = pd.read_csv(metadata_path)
    print(f"Total samples: {len(df)}")
    print(f"\nClass distribution:")
    print(df['dx'].value_counts())

    # Get all image files
    image_files = get_image_files(raw_dir)
    print(f"\nFound {len(image_files)} images")

    # Create image_id to path mapping
    image_map = {img.stem: img for img in image_files}

    # Filter to only images we have
    df = df[df['image_id'].isin(image_map.keys())]
    print(f"Matched samples: {len(df)}")

    # Stratified split by class
    train_df, temp_df = train_test_split(
        df, test_size=(VAL_RATIO + TEST_RATIO),
        stratify=df['dx'], random_state=RANDOM_SEED
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=TEST_RATIO/(VAL_RATIO + TEST_RATIO),
        stratify=temp_df['dx'], random_state=RANDOM_SEED
    )

    print(f"\nSplit sizes:")
    print(f"  Train: {len(train_df)}")
    print(f"  Val: {len(val_df)}")
    print(f"  Test: {len(test_df)}")

    # Copy images to processed directories
    for split_name, split_df in [("train", train_df), ("val", val_df), ("test", test_df)]:
        print(f"\nProcessing {split_name} split...")

        for _, row in tqdm(split_df.iterrows(), total=len(split_df)):
            image_id = row['image_id']
            label = row['dx']

            src_path = image_map[image_id]
            dst_dir = DATA_PROCESSED_DIR / split_name / "ham10000" / label
            dst_dir.mkdir(parents=True, exist_ok=True)

            dst_path = dst_dir / src_path.name
            shutil.copy2(src_path, dst_path)

    # Save split metadata
    metadata = {
        "dataset": "ham10000",
        "total_samples": len(df),
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "test_samples": len(test_df),
        "classes": list(df['dx'].unique()),
        "class_counts": df['dx'].value_counts().to_dict()
    }

    with open(DATA_INTERIM_DIR / "ham10000_split.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nHAM10000 preprocessing complete!")
    return True


def preprocess_hair_loss():
    """
    Preprocess Hair Loss Segmentation dataset.
    """
    print("\n" + "="*60)
    print("Processing Hair Loss Segmentation dataset...")
    print("="*60)

    raw_dir = DATA_RAW_DIR / "hair_loss_segmentation"

    if not raw_dir.exists():
        print(f"ERROR: Hair Loss dataset not found at {raw_dir}")
        print("Run: python download_datasets.py --dataset hair_loss")
        return False

    # Get all image files
    image_files = get_image_files(raw_dir)
    print(f"Found {len(image_files)} images")

    if not image_files:
        print("ERROR: No images found in dataset")
        return False

    # Simple split (no stratification for segmentation)
    random.shuffle(image_files)

    n_train = int(len(image_files) * TRAIN_RATIO)
    n_val = int(len(image_files) * VAL_RATIO)

    train_files = image_files[:n_train]
    val_files = image_files[n_train:n_train + n_val]
    test_files = image_files[n_train + n_val:]

    print(f"\nSplit sizes:")
    print(f"  Train: {len(train_files)}")
    print(f"  Val: {len(val_files)}")
    print(f"  Test: {len(test_files)}")

    # Copy files
    for split_name, files in [("train", train_files), ("val", val_files), ("test", test_files)]:
        print(f"\nProcessing {split_name} split...")

        dst_dir = DATA_PROCESSED_DIR / split_name / "hair_loss"
        dst_dir.mkdir(parents=True, exist_ok=True)

        for src_path in tqdm(files):
            dst_path = dst_dir / src_path.name
            shutil.copy2(src_path, dst_path)

            # Also copy corresponding mask if exists
            mask_candidates = [
                src_path.parent / f"{src_path.stem}_mask{src_path.suffix}",
                src_path.parent / "masks" / src_path.name,
                src_path.parent.parent / "masks" / src_path.name,
            ]
            for mask_path in mask_candidates:
                if mask_path.exists():
                    mask_dst = dst_dir / "masks"
                    mask_dst.mkdir(exist_ok=True)
                    shutil.copy2(mask_path, mask_dst / mask_path.name)
                    break

    # Save metadata
    metadata = {
        "dataset": "hair_loss_segmentation",
        "total_samples": len(image_files),
        "train_samples": len(train_files),
        "val_samples": len(val_files),
        "test_samples": len(test_files),
    }

    with open(DATA_INTERIM_DIR / "hair_loss_split.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nHair Loss Segmentation preprocessing complete!")
    return True


def preprocess_ludwig():
    """
    Preprocess Ludwig Scale dataset.
    """
    print("\n" + "="*60)
    print("Processing Ludwig Scale dataset...")
    print("="*60)

    raw_dir = DATA_RAW_DIR / "ludwig_scale"

    if not raw_dir.exists():
        print(f"ERROR: Ludwig Scale dataset not found at {raw_dir}")
        print("Run: python download_datasets.py --dataset ludwig")
        return False

    # Get all image files
    image_files = get_image_files(raw_dir)
    print(f"Found {len(image_files)} images")

    if not image_files:
        print("ERROR: No images found in dataset")
        return False

    # Try to infer labels from directory structure
    labeled_images = []
    for img_path in image_files:
        # Check parent directories for class labels
        parts = img_path.parts
        label = None
        for part in parts:
            if any(x in part.lower() for x in ['bald', 'not_bald', 'normal', 'f1', 'f2', 'f3', 'ludwig']):
                label = part
                break

        if label is None:
            label = "unknown"

        labeled_images.append((img_path, label))

    # Get unique labels
    labels = list(set([l for _, l in labeled_images]))
    print(f"\nDetected labels: {labels}")

    # Count per label
    label_counts = {}
    for _, label in labeled_images:
        label_counts[label] = label_counts.get(label, 0) + 1
    print(f"Label distribution: {label_counts}")

    # Split maintaining label distribution
    random.shuffle(labeled_images)

    n_train = int(len(labeled_images) * TRAIN_RATIO)
    n_val = int(len(labeled_images) * VAL_RATIO)

    train_data = labeled_images[:n_train]
    val_data = labeled_images[n_train:n_train + n_val]
    test_data = labeled_images[n_train + n_val:]

    print(f"\nSplit sizes:")
    print(f"  Train: {len(train_data)}")
    print(f"  Val: {len(val_data)}")
    print(f"  Test: {len(test_data)}")

    # Copy files
    for split_name, data in [("train", train_data), ("val", val_data), ("test", test_data)]:
        print(f"\nProcessing {split_name} split...")

        for src_path, label in tqdm(data):
            dst_dir = DATA_PROCESSED_DIR / split_name / "ludwig_scale" / label
            dst_dir.mkdir(parents=True, exist_ok=True)

            dst_path = dst_dir / src_path.name
            shutil.copy2(src_path, dst_path)

    # Save metadata
    metadata = {
        "dataset": "ludwig_scale",
        "total_samples": len(labeled_images),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "test_samples": len(test_data),
        "labels": labels,
        "label_counts": label_counts
    }

    with open(DATA_INTERIM_DIR / "ludwig_split.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nLudwig Scale preprocessing complete!")
    return True


def verify_processed_data():
    """Verify processed data integrity."""
    print("\n" + "="*60)
    print("Verifying processed data...")
    print("="*60)

    for split in ["train", "val", "test"]:
        split_dir = DATA_PROCESSED_DIR / split
        if not split_dir.exists():
            print(f"WARNING: {split} directory not found")
            continue

        print(f"\n{split.upper()} split:")

        for dataset_dir in split_dir.iterdir():
            if dataset_dir.is_dir():
                images = get_image_files(dataset_dir)
                print(f"  {dataset_dir.name}: {len(images)} images")

    # Check metadata files
    print("\nMetadata files:")
    for meta_file in DATA_INTERIM_DIR.glob("*.json"):
        print(f"  {meta_file.name}")

    print("\nVerification complete!")


def main():
    parser = argparse.ArgumentParser(description="Preprocess FolliCore datasets")
    parser.add_argument("--dataset", type=str,
                        choices=["ham10000", "hair_loss", "ludwig", "all"],
                        default="all", help="Dataset to preprocess")
    parser.add_argument("--verify", action="store_true",
                        help="Verify processed data")

    args = parser.parse_args()

    set_seed()
    create_split_dirs()

    if args.verify:
        verify_processed_data()
        return

    results = {}

    if args.dataset in ["ham10000", "all"]:
        results["ham10000"] = preprocess_ham10000()

    if args.dataset in ["hair_loss", "all"]:
        results["hair_loss"] = preprocess_hair_loss()

    if args.dataset in ["ludwig", "all"]:
        results["ludwig"] = preprocess_ludwig()

    # Summary
    print("\n" + "="*60)
    print("Preprocessing Summary:")
    print("="*60)
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")

    print("\nNext steps:")
    print("1. Verify data: python preprocess.py --verify")
    print("2. Start training: python train_dinov2.py")


if __name__ == "__main__":
    main()
