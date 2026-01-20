# FolliCore ML Pipeline

## Структура директорий

```
ml/
├── data/
│   ├── raw/                    # Исходные датасеты
│   │   ├── ham10000/           # HAM10000 dermoscopy (10,015 images)
│   │   ├── hair_loss_segmentation/  # Hair Loss Segmentation Dataset
│   │   └── ludwig_scale/       # Bald Women Ludwig Scale
│   ├── processed/              # Обработанные данные
│   │   ├── train/              # Тренировочный набор (70%)
│   │   ├── val/                # Валидационный набор (15%)
│   │   └── test/               # Тестовый набор (15%)
│   └── interim/                # Промежуточные данные
├── models/
│   ├── pretrained/             # Предобученные модели (DINOv2, MedSAM2)
│   ├── fine_tuned/             # Дообученные модели
│   └── checkpoints/            # Чекпоинты обучения
├── scripts/                    # Скрипты загрузки и обработки
├── configs/                    # Конфигурационные файлы
├── notebooks/                  # Jupyter notebooks для экспериментов
└── evaluation/                 # Результаты оценки моделей
```

## Датасеты

### 1. HAM10000 (Human Against Machine 10000)
- **Размер**: 10,015 дермоскопических изображений
- **Источник**: Kaggle
- **Назначение**: Base training для DINOv2 на дермоскопии

### 2. Hair Loss Segmentation Dataset
- **Источник**: Kaggle/HuggingFace
- **Назначение**: Сегментация зон выпадения волос

### 3. Bald Women Ludwig Scale Dataset
- **Источник**: Kaggle
- **Назначение**: Классификация по шкале Людвига (F1-F3)

## Model Pipeline

```
Этап 1: Foundation
facebook/dinov2-base → Fine-tune на HAM10000 → dinov2-dermoscopy

Этап 2: Domain Adaptation
dinov2-dermoscopy → Fine-tune на Hair Loss → dinov2-trichoscopy

Этап 3: Segmentation
dinov2-trichoscopy + wanglab/MedSAM2 → trichoscopy-segmenter
```

## Быстрый старт

```bash
# 1. Установка зависимостей
pip install -r requirements.txt

# 2. Загрузка датасетов
python scripts/download_datasets.py

# 3. Предобработка данных
python scripts/preprocess.py

# 4. Fine-tuning DINOv2
python scripts/train_dinov2.py --config configs/dinov2_config.yaml

# 5. Оценка модели
python scripts/evaluate.py --model models/fine_tuned/dinov2-trichoscopy
```

## Требования к железу

- **Минимум**: GPU с 8GB VRAM (RTX 3060/4060)
- **Рекомендуется**: GPU с 16GB+ VRAM (RTX 4080/A4000)
- **RAM**: 32GB+
- **Storage**: 100GB+ SSD

## Метрики оценки

| Задача | Метрики |
|--------|---------|
| Классификация | Accuracy, F1, AUC-ROC |
| Сегментация | IoU (Jaccard), Dice, Pixel Accuracy |
| Детекция | mAP@0.5, mAP@0.5:0.95 |
