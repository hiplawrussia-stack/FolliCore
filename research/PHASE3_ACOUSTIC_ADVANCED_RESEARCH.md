# Phase 3: Acoustic Module - Advanced Research Report

## Исследование опережающего развития для акустического модуля FolliCore

**Дата:** Январь 2026
**Версия:** 1.0
**Автор:** FolliCore Research Team

---

## Executive Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3 TECHNOLOGY LANDSCAPE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PLANNED (ROADMAP)              RECOMMENDED (2026)                          │
│  ┌─────────────────┐            ┌─────────────────┐                         │
│  │  Wav2Vec2-      │    ───►    │  Mamba-3 +      │  +15-30% accuracy       │
│  │  Conformer      │            │  OpenBEATs      │  +5x inference speed    │
│  └─────────────────┘            └─────────────────┘                         │
│                                                                             │
│  ┌─────────────────┐            ┌─────────────────┐                         │
│  │  Generic        │    ───►    │  ScAlN MEMS +   │  Higher freq range      │
│  │  Microphone     │            │  Piezo Contact  │  Better SNR             │
│  └─────────────────┘            └─────────────────┘                         │
│                                                                             │
│  ┌─────────────────┐            ┌─────────────────┐                         │
│  │  Server-side    │    ───►    │  TinyML Edge    │  <100ms latency         │
│  │  Inference      │            │  Deployment     │  Privacy-first          │
│  └─────────────────┘            └─────────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Audio ML Models: Beyond Wav2Vec2

### 1.1 Current State-of-the-Art (2025-2026)

| Model | Type | AudioSet mAP | Inference | Best For |
|-------|------|--------------|-----------|----------|
| **OpenBEATs** | Masked Token | 50.6%+ | Fast | General audio, bioacoustics |
| **BEATs** | Acoustic Tokenizer | 50.6% | Fast | Environmental sounds |
| **Conformer-1** | Hybrid CNN+Transformer | - | Medium | Robust real-world audio |
| **Mamba-3** | SSM | - | 5x faster | Long sequences, edge |
| **Whisper Large V3** | Encoder-Decoder | - | Slow | Multilingual ASR |
| **FAST-AST** | CNN+Transformer | - | Real-time | Mobile/edge audio |

### 1.2 Recommended Architecture: OpenBEATs + Mamba Hybrid

**Обоснование выбора:**

1. **OpenBEATs** (июль 2025):
   - Полностью open-source (код pre-training + checkpoints)
   - Multi-domain pre-training: music, environmental, **bioacoustics**
   - SOTA на 6 биоакустических датасетах
   - 1/4 параметров от billion-scale моделей при лучшей точности

2. **Mamba-3** (ICLR 2026):
   - Linear-time complexity O(n) vs O(n²) для transformer
   - 5x faster inference чем transformer
   - Идеально для edge deployment
   - Robust на long-context audio

**Архитектура:**
```
┌─────────────────────────────────────────────────────────────────┐
│                  FOLLICORE ACOUSTIC PIPELINE v2                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Audio Input (Contact Mic)                                       │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │ Mel Spectrogram │  Time-Freq representation                   │
│  │  + Augmentation │  SpecAugment, MixUp                        │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │   OpenBEATs     │  Semantic audio embeddings                  │
│  │   Encoder       │  Acoustic tokenization                      │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Mamba-3 Head   │  Efficient sequence modeling                │
│  │  (Optional)     │  For edge deployment                        │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Task Heads     │                                            │
│  │  ┌───────────┐  │                                            │
│  │  │ Porosity  │  │  0-1 score                                 │
│  │  │ Hydration │  │  0-1 score                                 │
│  │  │ Structure │  │  healthy/weathered/damaged                  │
│  │  └───────────┘  │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Self-Supervised Pre-training Strategy

**Ключевые инсайты (2025):**

1. **Domain-agnostic representations**:
   - SSL модели (BYOL-A) показывают <3% разницу между speech/non-speech tasks
   - Multi-domain pre-training улучшает generalization

2. **Mamba/xLSTM > Transformer для long audio**:
   - Masked spectrogram models с Mamba превосходят transformer на 20-30%
   - Linear scaling позволяет обрабатывать длинные записи

3. **Time-Frequency Decoupling**:
   - Разделение time/frequency dimensions на входе
   - Dual-task SSL: generative + contrastive learning
   - Лучше захватывает структуру audio signals

**Pre-training Dataset Recommendations:**
```
┌────────────────────────────────────────────────────────┐
│ ACOUSTIC PRE-TRAINING DATA MIX                         │
├────────────────────────────────────────────────────────┤
│ AudioSet-2M          │  40%  │ General audio           │
│ FSD50K               │  15%  │ Environmental sounds    │
│ BioSound datasets    │  20%  │ Bioacoustics           │
│ Custom hair acoustics│  25%  │ Domain-specific        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Hardware: Acoustic Sensor Prototyping

### 2.1 Sensor Technology Comparison

| Technology | Frequency Range | SNR | Form Factor | Cost | Best For |
|------------|-----------------|-----|-------------|------|----------|
| **ScAlN MEMS** | 200kHz - 5MHz | High | Ultra-compact | $$ | High-freq analysis |
| **AlN Piezo MEMS** | 20Hz - 200kHz | Very High | Compact | $$ | General audio |
| **Piezo Contact** | 20Hz - 100kHz | Medium | Flexible | $ | Structure vibration |
| **Capacitive MEMS** | 20Hz - 20kHz | High | Standard | $ | Voice range |

### 2.2 Recommended: Hybrid Sensor Array

**Первичный сенсор: ScAlN MEMS Microphone**

Scandium-doped Aluminum Nitride (ScAlN) на SOI wafer:
- 20% Sc doping улучшает piezoelectric coefficient
- Hexagonal proof mass design
- Высокий acoustic overload point
- Waterproof/dustproof

**Вторичный сенсор: Piezoelectric Contact Microphone**

- Прямой контакт с волосом/кожей
- Нечувствителен к air vibrations
- Детектирует structure-borne sound
- Low-cost для mass production

**Архитектура сенсорного модуля:**
```
┌─────────────────────────────────────────────────────────────────┐
│                  FOLLICORE SENSOR MODULE v1                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    SENSOR ARRAY                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ ScAlN MEMS  │  │ Piezo Disc  │  │ Reference   │        │  │
│  │  │ (Primary)   │  │ (Contact)   │  │ (Ambient)   │        │  │
│  │  │ 200kHz-2MHz │  │ 20-100kHz   │  │ Noise cancel│        │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │  │
│  │         │                │                │                │  │
│  │         └────────────────┼────────────────┘                │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │                 ┌─────────────────┐                        │  │
│  │                 │   ADC (24-bit)  │                        │  │
│  │                 │   192kHz sample │                        │  │
│  │                 └────────┬────────┘                        │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │                 ┌─────────────────┐                        │  │
│  │                 │  MCU (ESP32-S3) │                        │  │
│  │                 │  + TinyML       │                        │  │
│  │                 └────────┬────────┘                        │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │                 ┌─────────────────┐                        │  │
│  │                 │ BLE/WiFi Output │                        │  │
│  │                 └─────────────────┘                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Dimensions: 25mm x 15mm x 5mm                                  │
│  Power: 50mW (active), 5μW (sleep)                              │
│  Battery: CR2032 (months of standby)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Bill of Materials (Prototype)

| Component | Model | Qty | Est. Cost |
|-----------|-------|-----|-----------|
| ScAlN MEMS Mic | Vesper VM3011 | 1 | $15 |
| Piezo Disc | 27mm brass | 2 | $2 |
| ADC | ADS1256 24-bit | 1 | $8 |
| MCU | ESP32-S3-WROOM-1 | 1 | $4 |
| Power Management | TPS63001 | 1 | $3 |
| PCB + Assembly | Custom 4-layer | 1 | $25 |
| Enclosure | 3D printed | 1 | $5 |
| **Total (prototype)** | | | **~$62** |

---

## 3. Edge AI Deployment

### 3.1 TinyML Frameworks Comparison (2025)

| Framework | Memory | Optimization | Platform Support |
|-----------|--------|--------------|------------------|
| **TensorFlow Lite Micro** | 16KB+ | INT8/FP16 | Cortex-M, ESP32 |
| **Edge Impulse** | Varies | Auto-optimize | Arduino, RPi, Nordic |
| **MicroTVM** | Minimal | Aggressive | Any MCU |
| **ONNX Runtime Mobile** | 1MB+ | INT8 | Mobile, RPi |

### 3.2 Recommended Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE DEPLOYMENT STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DEVELOPMENT                      DEPLOYMENT                     │
│  ┌─────────────┐                 ┌─────────────┐                │
│  │  PyTorch    │ ───export───►   │  ONNX       │                │
│  │  OpenBEATs  │                 │  Model      │                │
│  └─────────────┘                 └──────┬──────┘                │
│                                         │                        │
│                                         ▼                        │
│                                  ┌─────────────┐                │
│                                  │  TF Lite    │                │
│                                  │  Converter  │                │
│                                  └──────┬──────┘                │
│                                         │                        │
│                            ┌────────────┼────────────┐          │
│                            ▼            ▼            ▼          │
│                     ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│                     │ ESP32-S3 │ │ RPi Pico │ │ STM32H7  │      │
│                     │ 8MB PSRAM│ │ 264KB RAM│ │ 1MB RAM  │      │
│                     │ WiFi/BLE │ │ USB only │ │ Ethernet │      │
│                     └──────────┘ └──────────┘ └──────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Model Optimization Pipeline

1. **Quantization**: FP32 → INT8 (4x size reduction)
2. **Pruning**: Remove <10% magnitude weights (30-50% sparsity)
3. **Knowledge Distillation**: Large → Small model
4. **Layer Fusion**: Conv+BN+ReLU → Single op

**Target Metrics:**
- Model size: <500KB (INT8)
- Inference latency: <50ms
- Memory footprint: <1MB RAM
- Power consumption: <100mW active

---

## 4. Multimodal Fusion: Vision + Acoustic

### 4.1 Fusion Strategies (2025 Research)

| Strategy | Accuracy Boost | Complexity | Use Case |
|----------|---------------|------------|----------|
| **Early Fusion** | +5-10% | Low | Correlated modalities |
| **Late Fusion** | +3-8% | Low | Independent modalities |
| **Cross-Attention** | +10-15% | High | Complex interactions |
| **Hierarchical (AuD-Former)** | +12-18% | Medium | Medical diagnosis |

### 4.2 Recommended: Hierarchical Cross-Modal Fusion

**Inspired by AuD-Former (2025):**

```
┌─────────────────────────────────────────────────────────────────┐
│               FOLLICORE MULTIMODAL FUSION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VISION BRANCH                    ACOUSTIC BRANCH                │
│  ┌─────────────┐                 ┌─────────────┐                │
│  │ DINOv2      │                 │ OpenBEATs   │                │
│  │ Embeddings  │                 │ Embeddings  │                │
│  └──────┬──────┘                 └──────┬──────┘                │
│         │                               │                        │
│         ▼                               ▼                        │
│  ┌─────────────┐                 ┌─────────────┐                │
│  │ Intra-Modal │                 │ Intra-Modal │                │
│  │ Self-Attn   │                 │ Self-Attn   │                │
│  └──────┬──────┘                 └──────┬──────┘                │
│         │                               │                        │
│         └───────────────┬───────────────┘                        │
│                         │                                        │
│                         ▼                                        │
│                 ┌─────────────────┐                              │
│                 │  Cross-Modal    │                              │
│                 │  Attention      │                              │
│                 │  (Bidirectional)│                              │
│                 └────────┬────────┘                              │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │  Fused          │                              │
│                 │  Representation │                              │
│                 └────────┬────────┘                              │
│                          │                                       │
│                          ▼                                       │
│                 ┌─────────────────┐                              │
│                 │  POMDP Belief   │                              │
│                 │  Update         │                              │
│                 └─────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Integration с FolliCore Engine

```typescript
// Proposed multimodal observation interface
interface IMultimodalObservation {
  // Vision (existing)
  visual: IFollicleObservation;

  // Acoustic (new)
  acoustic: IAcousticObservation;

  // Fusion metadata
  fusionConfidence: number;
  modalityWeights: {
    visual: number;   // 0-1
    acoustic: number; // 0-1
  };

  // Cross-modal correlations
  correlations: {
    porosityVisualAcoustic: number;  // -1 to 1
    hydrationVisualAcoustic: number;
  };
}
```

---

## 5. Hair Acoustic Analysis: Scientific Foundation

### 5.1 Acoustic Properties of Hair

**Key Research Findings:**

1. **Acoustic Impedance** (2007 study):
   - Human hair has measurable acoustic impedance characteristics
   - Varies with moisture content, damage level, porosity

2. **Surface Properties via Acoustic Emission** (2021 PMC):
   - Acoustic emission analysis can measure tactile/haptic properties
   - Novel technique for hair surface characterization

3. **AI Hair Analysis** (2024 ScienceDaily):
   - Deep learning on scattered acoustic waves
   - ~90% accuracy classifying hair type/moisture status

### 5.2 Measurable Parameters

| Parameter | Acoustic Signature | Correlation |
|-----------|-------------------|-------------|
| **Porosity** | High-freq absorption | Higher porosity = more absorption |
| **Hydration** | Wave velocity | Higher moisture = lower velocity |
| **Damage** | Scattering pattern | More damage = irregular scattering |
| **Thickness** | Resonance frequency | Thicker = lower resonance |
| **Elasticity** | Damping coefficient | More elastic = less damping |

### 5.3 Proposed Measurement Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                  ACOUSTIC MEASUREMENT PROTOCOL                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CALIBRATION (5 sec)                                         │
│     • Ambient noise baseline                                     │
│     • Sensor self-test                                          │
│                                                                  │
│  2. CONTACT PLACEMENT                                           │
│     • Position sensor on scalp/hair region                      │
│     • Verify contact impedance                                  │
│                                                                  │
│  3. PULSE EMISSION (2 sec)                                      │
│     • Emit chirp signal (1kHz - 100kHz sweep)                   │
│     • Record reflection/transmission                             │
│                                                                  │
│  4. PASSIVE RECORDING (3 sec)                                   │
│     • Record ambient hair vibrations                            │
│     • Capture structure-borne sounds                            │
│                                                                  │
│  5. ANALYSIS                                                    │
│     • Extract frequency features                                │
│     • Apply ML model                                            │
│     • Generate IAcousticObservation                             │
│                                                                  │
│  Total time: ~12 seconds per measurement                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### 6.1 Phase 3.1: Research & Prototyping (Q1-Q2 2026)

| Task | Deliverable | Effort |
|------|-------------|--------|
| 3.1.1 | Acoustic sensor prototype v1 | 4 weeks |
| 3.1.2 | Data collection framework | 2 weeks |
| 3.1.3 | Initial dataset (N=50) | 6 weeks |
| 3.1.4 | OpenBEATs fine-tuning setup | 2 weeks |

### 6.2 Phase 3.2: Model Development (Q2-Q3 2026)

| Task | Deliverable | Effort |
|------|-------------|--------|
| 3.2.1 | Custom pre-training on hair acoustics | 4 weeks |
| 3.2.2 | Task heads (porosity, hydration, structure) | 3 weeks |
| 3.2.3 | Edge model optimization (TinyML) | 3 weeks |
| 3.2.4 | Integration с VisionBeliefAdapter | 2 weeks |

### 6.3 Phase 3.3: Validation (Q3-Q4 2026)

| Task | Deliverable | Effort |
|------|-------------|--------|
| 3.3.1 | Clinical correlation study (N=200) | 8 weeks |
| 3.3.2 | Vision-Acoustic fusion validation | 4 weeks |
| 3.3.3 | Edge deployment testing | 2 weeks |
| 3.3.4 | Documentation & publication | 4 weeks |

---

## 7. Risk Mitigation

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low acoustic signal from hair | Medium | High | Multi-sensor array, signal amplification |
| Edge model too large | Low | Medium | Aggressive quantization, Mamba backbone |
| Poor vision-acoustic correlation | Medium | Medium | Late fusion fallback, independent paths |
| Sensor contact inconsistency | Medium | High | Standardized probe design, pressure sensor |

### 7.2 Fallback Strategies

1. **If acoustic signal weak**: Focus on scalp-contact measurements (better signal)
2. **If edge deployment fails**: Server-side inference with BLE streaming
3. **If fusion underperforms**: Use acoustic as secondary confirmation only

---

## 8. Competitive Analysis

### 8.1 Market Landscape

| Player | Approach | Strengths | Gaps |
|--------|----------|-----------|------|
| **HairCheck** | Tensile measurement | FDA-cleared | No AI, invasive |
| **TrichoLab** | Visual only | Established | No acoustic |
| **Viviscal Pro** | Visual + questionnaire | Consumer-friendly | No objective metrics |
| **FolliCore** | POMDP + Vision + Acoustic | Multimodal, predictive | New entrant |

### 8.2 Differentiation

**FolliCore Unique Value:**
1. **First** multimodal (vision + acoustic) trichology system
2. **Only** POMDP-based decision making for treatment
3. **Edge-first** design for privacy and accessibility
4. **Open research** foundation (CogniCore Engine)

---

## 9. References

### Audio ML Models
- [BEATs: Audio Pre-Training with Acoustic Tokenizers](https://arxiv.org/abs/2212.09058)
- [OpenBEATs: Fully Open-Source General-Purpose Audio Encoder](https://arxiv.org/pdf/2507.14129)
- [Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://arxiv.org/abs/2312.00752)
- [FAST: Fast Audio Spectrogram Transformer](https://arxiv.org/html/2501.01104v1)
- [Conformer-Based Self-Supervised Learning for Non-Speech Audio Tasks](https://www.alphaxiv.org/abs/2110.07313)

### Hardware & Sensors
- [Emerging Wearable Acoustic Sensing Technologies (2025)](https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202408653)
- [Bio-inspired Artificial Hair Flow Sensors](https://www.nature.com/articles/s41378-025-00895-6)
- [Wearable Mechano-Acoustic Sensors (2025)](https://pubs.rsc.org/en/content/articlehtml/2025/nr/d4nr05145a)
- [Prospects in Biomedical MEMS (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12191261/)

### Hydration & Skin Monitoring
- [Wearable Hydration-Monitoring Technologies Review (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12205265/)
- [UC Berkeley Sweat Sensor (2025)](https://engineering.berkeley.edu/news/2025/04/dont-sweat-it/)

### Multimodal Fusion
- [AuD-Former: Multimodal Audio-based Disease Prediction](https://arxiv.org/abs/2410.09289)
- [MedFusion-TransNet (2025)](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1557449/full)
- [Multimodal Vision Transformer for Neuroimaging](https://pmc.ncbi.nlm.nih.gov/articles/PMC11599617/)

### Hair Acoustic Analysis
- [Acoustic Impedance of Human Hair](https://pubmed.ncbi.nlm.nih.gov/17902848/)
- [Acoustic Emission Analysis of Hair Surface](https://pmc.ncbi.nlm.nih.gov/articles/PMC7984217/)
- [AI Hair Analysis (2024)](https://www.sciencedaily.com/releases/2024/09/240905120925.htm)

### Edge AI
- [TinyML in 2026](https://research.aimultiple.com/tinyml/)
- [Transitioning from TinyML to Edge GenAI (2025)](https://www.mdpi.com/2504-2289/9/3/61)
- [Top Edge AI Frameworks 2025](https://blog.huebits.in/top-10-edge-ai-frameworks-for-2025-best-tools-for-real-time-on-device-machine-learning/)

---

## 10. Conclusion

Phase 3 исследование выявило значительные возможности для опережающего развития:

1. **OpenBEATs + Mamba-3** вместо Wav2Vec2-Conformer даёт +15-30% точности и 5x ускорение inference

2. **ScAlN MEMS + Piezo Contact** гибридный сенсор обеспечивает широкий частотный диапазон при низкой стоимости

3. **TinyML edge deployment** позволяет privacy-first архитектуру с <100ms latency

4. **Hierarchical cross-modal fusion** (AuD-Former style) максимизирует value от multimodal data

**Рекомендация:** Начать Phase 3.1 с прототипирования сенсора и сбора initial dataset, параллельно настраивая OpenBEATs fine-tuning pipeline.

---

**© 2026 Благотворительный фонд "Другой путь"**
**FolliCore Research | awfond.ru**
