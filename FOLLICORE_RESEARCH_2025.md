# FolliCore Research Report 2025

> Comprehensive AI Research for Breakthrough Trichology Platform
> Generated: January 2025

---

## Executive Summary

This report consolidates cutting-edge research across 4 domains to position FolliCore as a market leader in AI-powered hair diagnostics:

1. **Kaggle/HuggingFace** — Datasets and pretrained models
2. **arXiv/PubMed** — Scientific papers (2024-2025)
3. **GitHub** — Open source repositories
4. **Edge AI/Patents/Competitors** — Hardware, patents, competitive analysis

**Key Finding:** The trichoscopy market is valued at **$41-50M (2024)** growing to **$108M by 2034**. No competitor offers combined **optical + acoustic** analysis — this is FolliCore's unique differentiator.

---

## Part 1: Datasets (Kaggle)

### Tier 1: Essential Datasets

| Dataset | Size | Description | Priority |
|---------|------|-------------|----------|
| [Hair Loss Segmentation Dataset](https://www.kaggle.com/datasets/trainingdatapro/bald-people-segmentation-dataset) | 5,000+ | Segmentation masks for baldness | **VERY HIGH** |
| [Skin Lesion Hair Mask Dataset](https://www.kaggle.com/datasets/ahmedfouadlagha/a-skin-lesion-hair-mask-dataset) | Fine-grained | Hair segmentation in dermoscopy | **VERY HIGH** |
| [HAM10000](https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000) | 10,015 | Dermoscopic images benchmark | **HIGH** |
| [Bald Women - Ludwig Scale](https://www.kaggle.com/datasets/trainingdatapro/bald-women) | Staged | Female pattern hair loss | **HIGH** |
| [Luke Hair Loss Dataset](https://www.kaggle.com/datasets/lukexun/luke-hair-loss-dataset) | 400 days | Longitudinal progression | **HIGH** |

### Tier 2: Supplementary Datasets

| Dataset | Description | Use Case |
|---------|-------------|----------|
| [Hair Type Dataset](https://www.kaggle.com/datasets/kavyasreeb/hair-type-dataset) | Straight, wavy, curly, kinky | Texture classification |
| [Hair Health Prediction](https://www.kaggle.com/datasets/amitvkulkarni/hair-health) | Tabular factors | Risk factor analysis |
| [DermNet](https://www.kaggle.com/datasets/shubhamgoel27/dermnet) | 23 categories | Includes alopecia areata |
| [Bald People Dataset](https://www.kaggle.com/datasets/tapakah68/dataset-of-bald-people) | 5,000 images | Baldness detection |

### Research Datasets (Academic)

| Source | Description | Samples |
|--------|-------------|---------|
| Alopecia Deep Learning Study | Microscopic follicle images | 24,012 labeled (severe/normal/healthy) |
| FDU_HairFollicleDataset | Huashan Hospital, Fudan | 1,652 images, 20,697 vectors |
| Androgenic Alopecia Study | Trichoscopic AGA images | 200 patients, 94.3% SVM accuracy |

---

## Part 2: Pretrained Models (HuggingFace)

### Vision Foundation Models

| Model | Architecture | Application | Priority |
|-------|--------------|-------------|----------|
| [facebook/dinov2-base](https://huggingface.co/facebook/dinov2-base) | Self-supervised ViT | Base for fine-tuning | **HIGH** |
| [dinov2-base-finetuned-SkinDisease](https://huggingface.co/Jayanth2002/dinov2-base-finetuned-SkinDisease) | DINOv2 fine-tuned | Dermatology-ready | **VERY HIGH** |
| [microsoft/rad-dino](https://huggingface.co/microsoft/rad-dino) | DINOv2 for radiology | Medical vision foundation | **HIGH** |

### Medical Segmentation Models

| Model | Specialty | Modalities | Priority |
|-------|-----------|------------|----------|
| [wanglab/MedSAM2](https://huggingface.co/wanglab/MedSAM2) | 3D medical | CT, MRI, Ultrasound, Dermoscopy | **VERY HIGH** |
| [SA-Med2D-20M](https://huggingface.co/datasets/OpenGVLab/SA-Med2D-20M) | Largest dataset | 20M masks | **VERY HIGH** |
| [BiomedCLIP](https://huggingface.co/microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224) | Vision-language | 15M figure-caption pairs | **HIGH** |

### Recommended Training Pipeline

```
Step 1: facebook/dinov2-base (foundation)
    ↓
Step 2: Fine-tune on HAM10000 (dermoscopy)
    ↓
Step 3: Fine-tune on hair-specific datasets
    ↓
Step 4: Deploy with MedSAM2 for segmentation
```

---

## Part 3: Scientific Papers (2024-2025)

### Breakthrough Publications

#### 1. ScalpVision (MICCAI 2025)
- **Paper:** [arXiv:2406.17254](https://arxiv.org/abs/2406.17254)
- **Innovation:** Label-free scalp diagnostic system
- **Methods:** U2-Net + DiffuseIT + SAM
- **Key:** Solves limited labeled data problem

#### 2. HFD-NET (2025)
- **Paper:** [Springer](https://link.springer.com/article/10.1007/s11760-025-03997-w)
- **Innovation:** Real-time hair follicle detection
- **Performance:** 67.1% mAP@0.5 (5.5% better than YOLO11n)
- **Key:** Only 0.1M parameter increase

#### 3. YOLO-OHFD (2025)
- **Paper:** [MDPI](https://www.mdpi.com/2076-3417/15/6/3208)
- **Innovation:** Oriented bounding boxes for follicles
- **Application:** Robotic hair transplantation

#### 4. AI SALT Scoring (2024)
- **Paper:** [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11635008/)
- **Performance:** ICC 0.97 (expert-level)
- **Application:** Alopecia areata severity assessment

#### 5. ViT for Dermoscopy (2024)
- **Paper:** [arXiv:2401.04746](https://arxiv.org/abs/2401.04746)
- **Performance:** 96.15% accuracy on HAM10000
- **Methods:** Vision Transformer + SAM

### Methods Summary by Task

| Task | Best Architecture | Performance |
|------|-------------------|-------------|
| Hair Segmentation | SAM + Label-free | ScalpVision SOTA |
| Follicle Detection | HFD-NET, YOLO-OHFD | 67.1% mAP |
| Disease Classification | CNN (2D) | 96.2% accuracy |
| Severity Scoring | DL + Multi-view | ICC 0.97 |
| Dermoscopy Analysis | Vision Transformer | 96.15% accuracy |

---

## Part 4: GitHub Repositories

### TOP-10 Repositories for FolliCore

| # | Repository | Stars | Description | Priority |
|---|------------|-------|-------------|----------|
| 1 | [winston1214/ScalpVision](https://github.com/winston1214/ScalpVision) | - | MICCAI 2025, label-free diagnosis | **CRITICAL** |
| 2 | [bowang-lab/MedSAM](https://github.com/bowang-lab/MedSAM) | 3k+ | Medical SAM foundation | **CRITICAL** |
| 3 | [Joey-S-Liu/MedSAM3](https://github.com/Joey-S-Liu/MedSAM3) | - | Text-promptable, dermoscopy support | **VERY HIGH** |
| 4 | [macarize/Intelligent_hair_analysis_system](https://github.com/macarize/Intelligent_hair_analysis_system) | - | Norwood-Hamilton classification | **VERY HIGH** |
| 5 | [nazil-the-professor/Hair-Analysis-Tool](https://github.com/nazil-the-professor/Hair-Analysis-Tool) | - | Hair density estimation | **HIGH** |
| 6 | [facebookresearch/dinov2](https://github.com/facebookresearch/dinov2) | 8k+ | Vision foundation model | **HIGH** |
| 7 | [thangtran480/hair-segmentation](https://github.com/thangtran480/hair-segmentation) | - | Mobile hair segmentation | **HIGH** |
| 8 | [YBIGTA/pytorch-hair-segmentation](https://github.com/YBIGTA/pytorch-hair-segmentation) | - | IoU 0.92, F1 0.96 | **HIGH** |
| 9 | [Mrinmoy-Roy/Scalp-Hair-Diseases-Detection](https://github.com/Mrinmoy-Roy/Scalp-Hair-Diseases-Detection) | - | 96.2% accuracy | **MEDIUM** |
| 10 | [hieplpvip/medficientsam](https://github.com/hieplpvip/medficientsam) | - | Efficient SAM, dermoscopy | **MEDIUM** |

### By Category

#### Hair Segmentation
- `thangtran480/hair-segmentation` — TensorFlow, CelebAMask-HQ (29,300 images)
- `wonbeomjang/mobile-hair-segmentation-pytorch` — MobileNet + SegNet
- `YBIGTA/pytorch-hair-segmentation` — PSPNet-ResNet101, IoU 0.92
- `gaelkt/HairNets` — U-Net + GoogleNet

#### Scalp Analysis
- `winston1214/ScalpVision` — MICCAI 2025, U2-Net + DiffuseIT
- `pblgroupproject/ScalpSmart` — Flutter app, baldness stages
- `Mrinmoy-Roy/Scalp-Hair-Diseases-Detection` — Alopecia, Psoriasis, Folliculitis

#### DINOv2 Medical
- `facebookresearch/dinov2` — Official implementation
- `MohammedSB/DINOv2ForRadiology` — Fine-tuning template
- `rmaphoh/RETFound` — Medical foundation models
- `RobvanGastel/dinov3-finetune` — LoRA adaptation

#### SAM Medical
- `bowang-lab/MedSAM` — Official MedSAM/MedSAM2
- `Joey-S-Liu/MedSAM3` — Dermoscopy support
- `hieplpvip/medficientsam` — Efficient version
- `YichiZhang98/SAM4MIS` — Comprehensive survey

---

## Part 5: Edge AI Hardware

### Recommended Platforms

| Platform | TOPS | Price | Pros | Cons |
|----------|------|-------|------|------|
| **Jetson Orin Nano Super** | 67 | $249 | Max performance, CUDA | Power consumption |
| **Raspberry Pi 5 + Hailo-8L** | 13 | $150 | FDA pathway proven | Lower TOPS |
| **Hailo-8** | 26 | ~$100 | Best efficiency (10 TOPS/W) | Less ecosystem |

### Medical Device Success Stories

| Device | Platform | Performance | Regulatory |
|--------|----------|-------------|------------|
| OVision Cancer Diagnosis | Raspberry Pi | 95% accuracy | Research |
| Eye Disease Diagnostic | Raspberry Pi | 96.2% accuracy, 5s inference | Research |
| High-performance OCT | Jetson Orin Nano | 5x improvement | CE |
| Vortex360 Ultrasound | Jetson AGX | 20x improvement | FDA cleared |

### FolliCore Hardware Recommendations

**Option A: Maximum Performance ($400-600 BOM)**
```
- NVIDIA Jetson Orin Nano Super ($249)
- Custom imaging module (~$100)
- Hailo-8 co-processor for dual inference (~$100)
- Enclosure + accessories (~$50-150)
```

**Option B: Cost-Optimized ($200-350 BOM)**
```
- Raspberry Pi 5 ($80)
- Hailo-8L AI Kit ($70)
- Camera module ($30-50)
- Acoustic sensor (~$20-50)
- Enclosure (~$20-50)
```

**Recommendation:** Option B for MVP (proven FDA pathway), Option A for premium version.

---

## Part 6: Competitive Analysis

### Market Overview

| Metric | Value |
|--------|-------|
| Market Size (2024) | $41-50 million |
| Projected (2034) | $108 million |
| CAGR | 7.5-8.2% |

### Competitor Matrix

| Company | Product | AI Level | Price Range | Regulatory | Threat |
|---------|---------|----------|-------------|------------|--------|
| **Canfield Scientific** | HairMetrix | Advanced | $10K-50K+ | CE | **HIGH** |
| **FotoFinder** | TrichoScale AI | Advanced | $5K-20K+ | CE | **MEDIUM-HIGH** |
| **TrichoLAB** | SaaS Platform | AI + Expert | Per-analysis | CE | **MEDIUM** |
| **Generic Devices** | Basic Trichoscopes | None/Basic | $200-800 | Variable | **LOW** |

### Canfield HairMetrix (Main Competitor)

**Strengths:**
- 35+ years clinical research heritage
- Gold standard in hair research
- Patent-pending trichoscopy attachment
- Real-time AI analysis

**Weaknesses:**
- Enterprise pricing ($10K-50K+)
- Requires clinic infrastructure
- Not portable/consumer-accessible
- Closed ecosystem

### FotoFinder TrichoScale

**Strengths:**
- Cloud AI analysis
- TrichoLAB expert network integration
- 100+ country distribution

**Weaknesses:**
- Cloud-dependent
- European focus
- Complex setup

### FolliCore Competitive Advantages

| Advantage | vs Enterprise (Canfield/FotoFinder) | vs Budget Devices |
|-----------|-------------------------------------|-------------------|
| **Multimodal** | Acoustic + Optical (UNIQUE!) | Optical only |
| **Edge AI** | On-device vs Cloud | Sophisticated vs Basic |
| **Price** | $500-2000 vs $10K+ | Premium with AI value |
| **Portability** | Full mobility vs Clinic-fixed | Equal or better |
| **Privacy** | Local processing | Local processing |
| **Speed** | Real-time vs Cloud latency | Real-time |

---

## Part 7: Patent Landscape

### Relevant Patents

| Patent | Holder | Technology | Relevance |
|--------|--------|------------|-----------|
| EP4200009B1 | Mane Biotech | Wearable electrical stimulation | Treatment |
| US20110230793A1 | Various | Ultrasound for alopecia | Acoustic approach |
| KR20200121898A | Korean | AI hair/scalp diagnosis + IoT | Direct competitor |
| Canfield (pending) | Canfield | Trichoscopy positioning | Imaging method |
| TrichoLAB (protected) | TrichoLAB | AI test area repositioning | Analysis consistency |

### Emerging Technologies

**Ultra High-Frequency Ultrasound (uHFUS):**
- 70 MHz transducers detect hair cycle pathology
- No commercial hair-specific devices yet
- **Opportunity for FolliCore**

**High-Frequency Ultrasonography:**
- 22 MHz used in 2024 AGA studies
- Potential for integration

---

## Part 8: Regulatory Pathway

### FDA Status

| Category | Status |
|----------|--------|
| AI Hair Diagnostic Devices | **None FDA-cleared** |
| Therapeutic LLLT Devices | Multiple cleared (Theradome, Capillus, etc.) |
| AI Medical Devices Total | 1,200+ by July 2025 |

### Recommended Strategy

1. **Phase 1:** Launch as "wellness/consultation tool" (no diagnostic claims)
2. **Phase 2:** Collect clinical data
3. **Phase 3:** Pursue 510(k) with predicate device strategy

### Regulatory Milestones

- Raspberry Pi ecosystem has achieved **IEC 60601, IEC 62304, CE, and FDA approval**
- This provides proven pathway for FolliCore hardware

---

## Part 9: Implementation Roadmap

### Phase 1: Foundation (Q1-Q2 2026)

- [ ] Acquire and preprocess datasets (HAM10000, Hair Loss Segmentation)
- [ ] Fine-tune DINOv2 on dermoscopy images
- [ ] Implement ScalpVision architecture
- [ ] Prototype hardware (Pi 5 + Hailo-8L)

### Phase 2: Integration (Q3-Q4 2026)

- [ ] Integrate MedSAM2 for segmentation
- [ ] Develop acoustic analysis module
- [ ] Multimodal fusion (60% vision, 40% acoustic)
- [ ] Clinical validation study

### Phase 3: Launch (2027)

- [ ] CE marking (Europe)
- [ ] FDA consultation
- [ ] B2B partnerships (clinics, hair restoration)
- [ ] Consumer version development

---

## Part 10: Key Takeaways

### Technical Stack Recommendation

```
Vision Module:
├── Foundation: DINOv2 (facebook/dinov2-base)
├── Segmentation: MedSAM2 (wanglab/MedSAM2)
├── Architecture: ScalpVision (U2-Net + DiffuseIT)
└── Detection: HFD-NET / YOLO-OHFD

Acoustic Module:
├── Model: Wav2Vec2-Conformer (existing)
├── Enhancement: Custom hair structure analysis
└── Fusion: Late fusion (60/40 split)

Hardware:
├── MVP: Raspberry Pi 5 + Hailo-8L ($150)
├── Premium: Jetson Orin Nano Super ($249)
└── Sensors: Trichoscopy camera + MEMS microphone
```

### Unique Value Proposition

> **FolliCore is the world's first multimodal (optical + acoustic) AI-powered portable hair diagnostic platform, offering clinical-grade analysis at consumer-accessible pricing.**

### Competitive Moat

1. **Multimodal Analysis** — No competitor combines vision + acoustic
2. **Edge AI** — True on-device processing (privacy + speed)
3. **Price Disruption** — $500-2000 vs $10K-50K enterprise
4. **Open Platform** — API for B2B integrations

---

## References

### Datasets
- [Kaggle Hair Loss Segmentation](https://www.kaggle.com/datasets/trainingdatapro/bald-people-segmentation-dataset)
- [Kaggle HAM10000](https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000)
- [HuggingFace SA-Med2D-20M](https://huggingface.co/datasets/OpenGVLab/SA-Med2D-20M)

### Papers
- [ScalpVision - arXiv:2406.17254](https://arxiv.org/abs/2406.17254)
- [HFD-NET - Springer 2025](https://link.springer.com/article/10.1007/s11760-025-03997-w)
- [YOLO-OHFD - MDPI 2025](https://www.mdpi.com/2076-3417/15/6/3208)
- [AI SALT Scoring - PMC 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11635008/)

### GitHub
- [ScalpVision](https://github.com/winston1214/ScalpVision)
- [MedSAM](https://github.com/bowang-lab/MedSAM)
- [DINOv2](https://github.com/facebookresearch/dinov2)

### Market Research
- [Grand View Research - Trichoscope Market](https://www.grandviewresearch.com/industry-analysis/trichoscope-devices-market-report)
- [Canfield HairMetrix](https://www.canfieldsci.com/imaging-systems/hairmetrix/)
- [FotoFinder TrichoLAB](https://www.fotofinder-systems.com/technology/hair-consultation/tricholab/)

### Regulatory
- [FDA AI Medical Devices](https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices)
- [Raspberry Pi Medical Development](https://www.raspberrypi.com/news/medical-device-development-with-raspberry-pi/)

---

*Report generated by Claude AI Research Agents*
*FolliCore Project - January 2025*
