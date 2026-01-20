#!/usr/bin/env python3
"""
FolliCore Dataset Download Script

Downloads required datasets from Kaggle and HuggingFace.

Prerequisites:
1. Kaggle API credentials in ~/.kaggle/kaggle.json
2. HuggingFace token (optional, for private models)

Usage:
    python download_datasets.py --all
    python download_datasets.py --dataset ham10000
    python download_datasets.py --dataset hair_loss
    python download_datasets.py --dataset ludwig
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from tqdm import tqdm

# Base paths
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR.parent
DATA_RAW_DIR = ML_DIR / "data" / "raw"

# Dataset configurations
DATASETS = {
    "ham10000": {
        "source": "kaggle",
        "kaggle_dataset": "kmader/skin-cancer-mnist-ham10000",
        "output_dir": DATA_RAW_DIR / "ham10000",
        "description": "HAM10000 - 10,015 dermoscopy images for skin lesion classification"
    },
    "hair_loss": {
        "source": "kaggle",
        "kaggle_dataset": "trainingdatapro/hair-loss-segmentation-dataset",
        "output_dir": DATA_RAW_DIR / "hair_loss_segmentation",
        "description": "Hair Loss Segmentation Dataset - scalp images with masks"
    },
    "ludwig": {
        "source": "kaggle",
        "kaggle_dataset": "ashishjangra27/bald-classification",
        "output_dir": DATA_RAW_DIR / "ludwig_scale",
        "description": "Bald Classification Dataset - Ludwig scale classification"
    }
}


def check_kaggle_credentials():
    """Check if Kaggle API credentials are configured."""
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if not kaggle_json.exists():
        print("ERROR: Kaggle credentials not found!")
        print("\nTo configure Kaggle API:")
        print("1. Go to https://www.kaggle.com/settings")
        print("2. Click 'Create New Token' under API section")
        print("3. Save kaggle.json to ~/.kaggle/")
        print("4. chmod 600 ~/.kaggle/kaggle.json")
        return False
    return True


def download_kaggle_dataset(dataset_name: str, output_dir: Path):
    """Download a dataset from Kaggle."""
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nDownloading {dataset_name} to {output_dir}...")

    try:
        # Download dataset
        cmd = [
            "kaggle", "datasets", "download",
            "-d", dataset_name,
            "-p", str(output_dir),
            "--unzip"
        ]
        subprocess.run(cmd, check=True)
        print(f"Successfully downloaded {dataset_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR downloading {dataset_name}: {e}")
        return False
    except FileNotFoundError:
        print("ERROR: kaggle CLI not found. Install with: pip install kaggle")
        return False


def download_huggingface_model(model_name: str, output_dir: Path):
    """Download a model from HuggingFace."""
    from huggingface_hub import snapshot_download

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nDownloading {model_name} to {output_dir}...")

    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=output_dir,
            local_dir_use_symlinks=False
        )
        print(f"Successfully downloaded {model_name}")
        return True
    except Exception as e:
        print(f"ERROR downloading {model_name}: {e}")
        return False


def download_pretrained_models():
    """Download pretrained models (DINOv2, MedSAM2)."""
    models_dir = ML_DIR / "models" / "pretrained"

    # DINOv2 - will be downloaded automatically by transformers
    print("\nNote: DINOv2 (facebook/dinov2-base) will be downloaded automatically")
    print("when you run the training script for the first time.")

    # MedSAM2 - requires manual setup
    print("\nTo install MedSAM2:")
    print("1. git clone https://github.com/bowang-lab/MedSAM")
    print("2. cd MedSAM && pip install -e .")
    print("3. Download checkpoint from HuggingFace: wanglab/MedSAM2")


def main():
    parser = argparse.ArgumentParser(description="Download FolliCore ML datasets")
    parser.add_argument("--all", action="store_true", help="Download all datasets")
    parser.add_argument("--dataset", type=str, choices=list(DATASETS.keys()),
                        help="Download specific dataset")
    parser.add_argument("--models", action="store_true",
                        help="Show instructions for pretrained models")
    parser.add_argument("--list", action="store_true", help="List available datasets")

    args = parser.parse_args()

    if args.list:
        print("\nAvailable datasets:")
        print("-" * 60)
        for name, config in DATASETS.items():
            print(f"\n{name}:")
            print(f"  Source: {config['source']}")
            print(f"  Description: {config['description']}")
        return

    if args.models:
        download_pretrained_models()
        return

    if not args.all and not args.dataset:
        parser.print_help()
        return

    # Check Kaggle credentials
    if not check_kaggle_credentials():
        sys.exit(1)

    # Determine which datasets to download
    datasets_to_download = list(DATASETS.keys()) if args.all else [args.dataset]

    # Download datasets
    results = {}
    for dataset_name in datasets_to_download:
        config = DATASETS[dataset_name]
        print(f"\n{'='*60}")
        print(f"Dataset: {dataset_name}")
        print(f"Description: {config['description']}")
        print(f"{'='*60}")

        if config["source"] == "kaggle":
            success = download_kaggle_dataset(
                config["kaggle_dataset"],
                config["output_dir"]
            )
        else:
            success = False
            print(f"Unknown source: {config['source']}")

        results[dataset_name] = success

    # Summary
    print(f"\n{'='*60}")
    print("Download Summary:")
    print(f"{'='*60}")
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")

    # Next steps
    print("\nNext steps:")
    print("1. Run: python scripts/preprocess.py")
    print("2. Run: python scripts/train_dinov2.py")


if __name__ == "__main__":
    main()
