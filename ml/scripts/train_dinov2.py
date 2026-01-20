#!/usr/bin/env python3
"""
FolliCore DINOv2 Fine-tuning Script

Fine-tunes DINOv2 on dermoscopy/trichoscopy images for hair analysis.

Usage:
    python train_dinov2.py --config configs/dinov2_config.yaml
    python train_dinov2.py --config configs/dinov2_config.yaml --resume checkpoint.pt
"""

import os
import sys
import argparse
import yaml
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
from tqdm import tqdm
from sklearn.metrics import f1_score, roc_auc_score, accuracy_score

# HuggingFace
from transformers import AutoImageProcessor, AutoModel

# Paths
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR.parent


class TrichoscopyDataset(Dataset):
    """Dataset for dermoscopy/trichoscopy images."""

    def __init__(self, root_dir: Path, transform=None, classes: list = None):
        self.root_dir = Path(root_dir)
        self.transform = transform

        # Collect all images and labels
        self.samples = []
        self.classes = classes or []

        if not self.root_dir.exists():
            print(f"WARNING: Dataset directory not found: {self.root_dir}")
            return

        # Walk through directory structure
        for dataset_dir in self.root_dir.iterdir():
            if not dataset_dir.is_dir():
                continue

            for class_dir in dataset_dir.iterdir():
                if not class_dir.is_dir():
                    continue

                class_name = class_dir.name
                if class_name not in self.classes:
                    self.classes.append(class_name)

                for img_path in class_dir.iterdir():
                    if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
                        self.samples.append((img_path, self.classes.index(class_name)))

        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        print(f"Loaded {len(self.samples)} samples with {len(self.classes)} classes")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]

        # Load image
        image = Image.open(img_path).convert('RGB')

        if self.transform:
            image = self.transform(image)

        return image, label


class DINOv2Classifier(nn.Module):
    """DINOv2 with classification head."""

    def __init__(
        self,
        model_name: str = "facebook/dinov2-base",
        num_classes: int = 7,
        dropout: float = 0.1,
        freeze_backbone: bool = False
    ):
        super().__init__()

        # Load pretrained DINOv2
        self.backbone = AutoModel.from_pretrained(model_name)
        self.hidden_size = self.backbone.config.hidden_size

        # Freeze backbone if requested
        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False

        # Classification head
        self.classifier = nn.Sequential(
            nn.LayerNorm(self.hidden_size),
            nn.Dropout(dropout),
            nn.Linear(self.hidden_size, num_classes)
        )

    def forward(self, pixel_values):
        # Get features from DINOv2
        outputs = self.backbone(pixel_values)

        # Use CLS token (first token)
        cls_output = outputs.last_hidden_state[:, 0]

        # Classification
        logits = self.classifier(cls_output)

        return logits

    def get_features(self, pixel_values):
        """Extract features without classification."""
        outputs = self.backbone(pixel_values)
        return outputs.last_hidden_state[:, 0]


def get_transforms(config: Dict, split: str = "train"):
    """Get data transforms based on config."""
    image_size = config.get("data", {}).get("image_size", 224)
    aug_config = config.get("augmentation", {}).get(split, {})
    norm = aug_config.get("normalize", {})

    mean = norm.get("mean", [0.485, 0.456, 0.406])
    std = norm.get("std", [0.229, 0.224, 0.225])

    if split == "train":
        transform_list = [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip() if aug_config.get("horizontal_flip") else None,
            transforms.RandomVerticalFlip() if aug_config.get("vertical_flip") else None,
            transforms.RandomRotation(aug_config.get("rotation", 0)) if aug_config.get("rotation") else None,
            transforms.ColorJitter(
                brightness=aug_config.get("brightness", 0),
                contrast=aug_config.get("contrast", 0),
                saturation=aug_config.get("saturation", 0),
                hue=aug_config.get("hue", 0)
            ) if any([aug_config.get(k) for k in ["brightness", "contrast", "saturation", "hue"]]) else None,
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ]
    else:
        transform_list = [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ]

    # Filter None
    transform_list = [t for t in transform_list if t is not None]

    return transforms.Compose(transform_list)


def train_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
    scaler: Optional[torch.cuda.amp.GradScaler] = None
) -> Dict[str, float]:
    """Train for one epoch."""
    model.train()

    total_loss = 0
    all_preds = []
    all_labels = []

    pbar = tqdm(dataloader, desc="Training")
    for batch_idx, (images, labels) in enumerate(pbar):
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()

        # Mixed precision training
        if scaler is not None:
            with torch.cuda.amp.autocast():
                outputs = model(images)
                loss = criterion(outputs, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        total_loss += loss.item()
        preds = outputs.argmax(dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().numpy())

        pbar.set_postfix({"loss": f"{loss.item():.4f}"})

    # Metrics
    accuracy = accuracy_score(all_labels, all_preds)
    f1 = f1_score(all_labels, all_preds, average='macro')

    return {
        "loss": total_loss / len(dataloader),
        "accuracy": accuracy,
        "f1_macro": f1
    }


def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Dict[str, float]:
    """Evaluate model."""
    model.eval()

    total_loss = 0
    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for images, labels in tqdm(dataloader, desc="Evaluating"):
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item()
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = outputs.argmax(dim=1).cpu().numpy()

            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs)

    # Metrics
    accuracy = accuracy_score(all_labels, all_preds)
    f1 = f1_score(all_labels, all_preds, average='macro')

    # AUC-ROC (one-vs-rest)
    try:
        all_probs = np.array(all_probs)
        all_labels_onehot = np.eye(all_probs.shape[1])[all_labels]
        auc = roc_auc_score(all_labels_onehot, all_probs, average='macro', multi_class='ovr')
    except Exception:
        auc = 0.0

    return {
        "loss": total_loss / len(dataloader),
        "accuracy": accuracy,
        "f1_macro": f1,
        "auc_roc": auc
    }


def main():
    parser = argparse.ArgumentParser(description="Train DINOv2 for trichoscopy")
    parser.add_argument("--config", type=str, default="configs/dinov2_config.yaml")
    parser.add_argument("--resume", type=str, default=None, help="Resume from checkpoint")
    args = parser.parse_args()

    # Load config
    config_path = ML_DIR / args.config
    with open(config_path) as f:
        config = yaml.safe_load(f)

    print(f"Loaded config from {config_path}")

    # Set device
    device_name = config.get("hardware", {}).get("device", "cuda")
    if device_name == "cuda" and torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
    elif device_name == "mps" and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("Using Apple Silicon MPS")
    else:
        device = torch.device("cpu")
        print("Using CPU")

    # Set seed
    seed = config.get("hardware", {}).get("seed", 42)
    torch.manual_seed(seed)
    np.random.seed(seed)

    # Data
    data_config = config.get("data", {})
    train_dir = ML_DIR / data_config.get("train_dir", "data/processed/train")
    val_dir = ML_DIR / data_config.get("val_dir", "data/processed/val")

    train_transform = get_transforms(config, "train")
    val_transform = get_transforms(config, "val")

    train_dataset = TrichoscopyDataset(train_dir, transform=train_transform)
    val_dataset = TrichoscopyDataset(val_dir, transform=val_transform, classes=train_dataset.classes)

    if len(train_dataset) == 0:
        print("ERROR: No training data found!")
        print(f"Expected data at: {train_dir}")
        print("Run preprocessing first: python scripts/preprocess.py")
        sys.exit(1)

    train_loader = DataLoader(
        train_dataset,
        batch_size=data_config.get("batch_size", 32),
        shuffle=True,
        num_workers=data_config.get("num_workers", 4),
        pin_memory=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=data_config.get("batch_size", 32),
        shuffle=False,
        num_workers=data_config.get("num_workers", 4),
        pin_memory=True
    )

    # Model
    model_config = config.get("model", {})
    model = DINOv2Classifier(
        model_name=model_config.get("name", "facebook/dinov2-base"),
        num_classes=len(train_dataset.classes),
        dropout=model_config.get("dropout", 0.1),
        freeze_backbone=model_config.get("freeze_backbone", False)
    )
    model = model.to(device)

    print(f"\nModel: {model_config.get('name')}")
    print(f"Classes: {train_dataset.classes}")
    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")

    # Loss
    loss_config = config.get("loss", {})
    criterion = nn.CrossEntropyLoss(
        label_smoothing=loss_config.get("label_smoothing", 0.0)
    )

    # Optimizer
    train_config = config.get("training", {})
    opt_config = config.get("optimizer", {})
    optimizer = optim.AdamW(
        model.parameters(),
        lr=train_config.get("learning_rate", 1e-4),
        weight_decay=train_config.get("weight_decay", 0.01),
        betas=tuple(opt_config.get("betas", [0.9, 0.999]))
    )

    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=train_config.get("epochs", 50)
    )

    # Mixed precision
    scaler = None
    if train_config.get("mixed_precision", True) and device.type == "cuda":
        scaler = torch.cuda.amp.GradScaler()
        print("Using mixed precision training (FP16)")

    # Checkpoint directory
    checkpoint_config = config.get("checkpoint", {})
    checkpoint_dir = ML_DIR / checkpoint_config.get("save_dir", "models/checkpoints")
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # Training loop
    epochs = train_config.get("epochs", 50)
    best_val_loss = float('inf')
    patience_counter = 0
    patience = train_config.get("early_stopping", {}).get("patience", 10)

    run_name = f"dinov2_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\nStarting training run: {run_name}")
    print("="*60)

    history = {"train": [], "val": []}

    for epoch in range(epochs):
        print(f"\nEpoch {epoch+1}/{epochs}")
        print("-"*40)

        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        print(f"Train - Loss: {train_metrics['loss']:.4f}, Acc: {train_metrics['accuracy']:.4f}, F1: {train_metrics['f1_macro']:.4f}")

        # Validate
        val_metrics = evaluate(model, val_loader, criterion, device)
        print(f"Val   - Loss: {val_metrics['loss']:.4f}, Acc: {val_metrics['accuracy']:.4f}, F1: {val_metrics['f1_macro']:.4f}, AUC: {val_metrics['auc_roc']:.4f}")

        # Update scheduler
        scheduler.step()

        # Save history
        history["train"].append(train_metrics)
        history["val"].append(val_metrics)

        # Checkpointing
        if val_metrics['loss'] < best_val_loss:
            best_val_loss = val_metrics['loss']
            patience_counter = 0

            # Save best model
            if checkpoint_config.get("save_best", True):
                best_path = checkpoint_dir / f"{run_name}_best.pt"
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_loss': val_metrics['loss'],
                    'val_accuracy': val_metrics['accuracy'],
                    'classes': train_dataset.classes,
                    'config': config
                }, best_path)
                print(f"Saved best model to {best_path}")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping at epoch {epoch+1}")
                break

        # Periodic checkpoint
        save_every = checkpoint_config.get("save_every", 5)
        if (epoch + 1) % save_every == 0:
            ckpt_path = checkpoint_dir / f"{run_name}_epoch{epoch+1}.pt"
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'config': config
            }, ckpt_path)

    # Save final model
    final_model_dir = ML_DIR / "models" / "fine_tuned"
    final_model_dir.mkdir(parents=True, exist_ok=True)

    final_path = final_model_dir / "dinov2-trichoscopy.pt"
    torch.save({
        'model_state_dict': model.state_dict(),
        'classes': train_dataset.classes,
        'config': config
    }, final_path)
    print(f"\nSaved final model to {final_path}")

    # Save training history
    with open(checkpoint_dir / f"{run_name}_history.json", "w") as f:
        json.dump(history, f, indent=2)

    print("\nTraining complete!")
    print(f"Best validation loss: {best_val_loss:.4f}")


if __name__ == "__main__":
    main()
