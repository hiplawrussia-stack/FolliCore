# FolliCore Roadmap
## Стратегический план развития 2026-2027

> Платформа предиктивной трихологии на базе CogniCore Engine

---

## Executive Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FOLLICORE EVOLUTION                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Phase 1              Phase 2              Phase 3              Phase 4 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────┐│
│  │  POMDP Core │     │   Vision    │     │  Acoustic   │     │Clinical││
│  │  Domain     │     │   Module    │     │   Module    │     │  Trial ││
│  │  Engine     │     │   DINOv2+SAM│     │  Wav2Vec2   │     │  FDA   ││
│  └─────────────┘     └─────────────┘     └─────────────┘     └────────┘│
│      ████████           ████████            ██████░░          ░░░░░░░░ │
│     COMPLETED          COMPLETED          SOFTWARE OK         PLANNED  │
│    [Jan 2026]         [Jan 2026]          [Jan 2026]        [Q4 2026] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Foundation ✅ COMPLETED
### "POMDP Core Integration"

**Цель:** Интегрировать CogniCore Engine для принятия решений в условиях неопределённости

### 1.1 Domain Model (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 1.1.1 | Определение FollicleState enum | `TrichologyStates.ts` | ✅ Done |
| 1.1.2 | Определение TrichologyAction enum | `TrichologyStates.ts` | ✅ Done |
| 1.1.3 | IFollicleObservation interface | Vision → POMDP bridge | ✅ Done |
| 1.1.4 | IPatientContext interface | Age/gender/genetics | ✅ Done |
| 1.1.5 | ITrichologyBeliefState interface | Belief distribution | ✅ Done |

**Состояния фолликул (10 states):**
```typescript
enum FollicleState {
  // Здоровые состояния
  HEALTHY_ANAGEN,      // Активный рост
  HEALTHY_CATAGEN,     // Переходная фаза
  HEALTHY_TELOGEN,     // Фаза покоя

  // Патологические состояния
  EARLY_MINIATURIZATION,     // Ранняя миниатюризация
  ADVANCED_MINIATURIZATION,  // Продвинутая АГА
  STRESS_INDUCED,            // Телоген эффлювиум
  INFLAMMATION,              // Перифолликулярное воспаление
  SENILE_ALOPECIA,           // Возрастная алопеция

  // Терминальные состояния
  DORMANT,             // Потенциально обратимая потеря
  TERMINAL,            // Необратимая потеря
}
```

---

### 1.2 Safety Rules (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 1.2.1 | NEVER_FINASTERIDE_FEMALE | Hard blocker | ✅ Done |
| 1.2.2 | NEVER_IGNORE_INFLAMMATION | Block stimulation | ✅ Done |
| 1.2.3 | CONTRAINDICATION_CHECK | Medical history | ✅ Done |
| 1.2.4 | SPECIALIST_REFERRAL | Severe cases | ✅ Done |
| 1.2.5 | PROGRESSION_ESCALATION | >10% density loss | ✅ Done |

**9 Safety Rules implemented** с типами:
- `HARD_CONSTRAINT` — блокирующие правила
- `SOFT_CONSTRAINT` — предупреждения
- `ESCALATION_TRIGGER` — триггеры эскалации

---

### 1.3 FolliCoreEngine (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 1.3.1 | Thompson Sampling | Action selection | ✅ Done |
| 1.3.2 | Bayesian Belief Update | Observation → Belief | ✅ Done |
| 1.3.3 | Treatment Recommendation | Strategy generation | ✅ Done |
| 1.3.4 | Trajectory Prediction | KalmanFormer-style | ✅ Done |
| 1.3.5 | Outcome Learning | Arm updates | ✅ Done |

**Core API:**
```typescript
class FolliCoreEngine {
  initializePatient(patientId, context): ITrichologyBeliefState;
  updateBelief(patientId, observation, acoustic?, context?): ITrichologyBeliefState;
  getRecommendation(patientId, context): ITreatmentRecommendation;
  predictTrajectory(patientId, horizonMonths?): ITrajectoryPrediction;
  updateOutcome(patientId, action, outcome): void;
}
```

---

### Phase 1 Results

**Тесты:** 145 тестов пройдено
**Покрытие:** ~80%

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 1 COMPLETE                                       [January 2026] │
├──────────────────────────────────────────────────────────────────────┤
│ ✅ TrichologyStates.ts     - 10 states, 14 actions, PGMU norms       │
│ ✅ TrichologySafetyRules.ts - 9 safety rules, isActionSafe()         │
│ ✅ FolliCoreEngine.ts      - Thompson Sampling, Belief Update        │
│ ✅ 145 tests passing       - Domain + Engine coverage                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 2: Vision Module ✅ COMPLETED
### "DINOv2 + SAM Integration"

**Цель:** Computer Vision pipeline для анализа трихоскопических изображений

### 2.1 Research (✅ Complete)

| Исследование | Вывод | Применение |
|--------------|-------|------------|
| DINOv2 в медицине | +11% MCC vs supervised | Feature extractor |
| MedSAM | 1.5M image-mask pairs | Segmentation |
| ViT-CX | Explainability | Attention maps |
| Mamba/SSM | O(n) complexity | Future edge deployment |

**Отчёт:** `research/VISION_MODULE_ADVANCED_RESEARCH.md`

---

### 2.2 VisionTypes (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 2.2.1 | ITrichoscopyImage | Image input format | ✅ Done |
| 2.2.2 | IImageEmbedding | 1024-dim DINOv2 vector | ✅ Done |
| 2.2.3 | IMorphometryResult | Bulb/shaft measurements | ✅ Done |
| 2.2.4 | IDensityResult | Hair count, FU distribution | ✅ Done |
| 2.2.5 | ICycleAnalysis | Anagen/telogen/vellus ratios | ✅ Done |
| 2.2.6 | ITrichoscopyAnalysis | Complete analysis result | ✅ Done |

**Default Config:**
```typescript
const DEFAULT_VISION_CONFIG = {
  featureExtractor: { model: 'dinov2-large', device: 'cuda', precision: 'fp16' },
  segmentation: { model: 'medsam', promptMode: 'automatic' },
  morphometry: { minSampleSize: 10, confidenceThreshold: 0.7 },
  explainability: { enabled: true, method: 'vit-cx' },
};
```

---

### 2.3 TrichoscopyAnalyzer (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 2.3.1 | Pluggable backend interfaces | IFeatureExtractor, etc. | ✅ Done |
| 2.3.2 | Image validation | Format, size checks | ✅ Done |
| 2.3.3 | analyze() | Full pipeline execution | ✅ Done |
| 2.3.4 | analyzeBatch() | Multi-image processing | ✅ Done |
| 2.3.5 | interactiveSegment() | SAM point prompts | ✅ Done |

**Архитектура:**
```
Image → [DINOv2] → Embedding
              ↓
        [MedSAM] → Segmentation
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[Morpho]  [Density]  [Cycle]
    ↓         ↓         ↓
    └─────────┼─────────┘
              ↓
      ITrichoscopyAnalysis
```

---

### 2.4 MorphometryExtractor (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 2.4.1 | PGMU-aligned measurements | 60-80μm bulb width | ✅ Done |
| 2.4.2 | Density analysis | FU distribution | ✅ Done |
| 2.4.3 | Cycle classification | Anagen/telogen | ✅ Done |
| 2.4.4 | Calibration support | px/μm conversion | ✅ Done |

**PGMU Norms Reference:**
- Bulb width: 74.6μm (21-35) → 71.2μm (75-86)
- Shaft thickness: 33.8μm (21-35) → 31.8μm (75-86)

---

### 2.5 VisionBeliefAdapter (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 2.5.1 | toObservation() | Analysis → IFollicleObservation | ✅ Done |
| 2.5.2 | inferState() | State probability distribution | ✅ Done |
| 2.5.3 | calculateAgeDelta() | Biological vs chronological | ✅ Done |
| 2.5.4 | calculateProgressionRisk() | 0-1 risk score | ✅ Done |
| 2.5.5 | calculateRecoveryPotential() | 0-1 potential score | ✅ Done |

**Bridge Logic:**
```typescript
// Vision → POMDP
const observation = adapter.toObservation(analysis, patientContext);
engine.updateBelief(patientId, observation, null, patientContext);
const recommendation = engine.getRecommendation(patientId, patientContext);
```

---

### 2.6 VisionEngineIntegration (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 2.6.1 | End-to-end pipeline | Image → Recommendation | ✅ Done |
| 2.6.2 | Batch processing | Multi-zone analysis | ✅ Done |
| 2.6.3 | analyzeOnly() | Preview without belief update | ✅ Done |
| 2.6.4 | Manual operations | Direct engine access | ✅ Done |

**High-Level API:**
```typescript
const integration = createVisionEngineIntegration();
await integration.initialize(mlBackends);

// Complete pipeline
const result = await integration.runPipeline(patientId, image, context);
// result.analysis → CV результат
// result.observation → POMDP-совместимое наблюдение
// result.stateInference → Вероятностное распределение состояний
// result.beliefState → Обновлённый belief state
// result.recommendation → Рекомендация лечения

// Batch analysis
const batch = await integration.runBatchPipeline(patientId, images, context);
// batch.finalRecommendation → Рекомендация на основе всех зон
```

---

### Phase 2 Results

**Тесты:** 301 тест пройден
**Покрытие:** 95.7% statements, 81.19% branches

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 2 COMPLETE                                       [January 2026] │
├──────────────────────────────────────────────────────────────────────┤
│ ✅ VisionTypes.ts           - Type definitions, VisionError          │
│ ✅ TrichoscopyAnalyzer.ts   - Pluggable CV pipeline                  │
│ ✅ MorphometryExtractor.ts  - PGMU-aligned measurements              │
│ ✅ VisionBeliefAdapter.ts   - Vision → POMDP bridge                  │
│ ✅ VisionEngineIntegration.ts - End-to-end orchestration             │
│ ✅ 301 tests passing        - Full coverage achieved                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Файловая структура:**
```
FolliCore/src/
├── trichology/
│   ├── domain/
│   │   ├── TrichologyStates.ts
│   │   └── TrichologySafetyRules.ts
│   ├── FolliCoreEngine.ts
│   └── index.ts
├── vision/
│   ├── VisionTypes.ts
│   ├── TrichoscopyAnalyzer.ts
│   ├── MorphometryExtractor.ts
│   ├── VisionBeliefAdapter.ts
│   └── index.ts
├── acoustic/                          ← Phase 3
│   ├── AcousticTypes.ts
│   ├── AcousticAnalyzer.ts
│   └── index.ts
├── integration/
│   ├── VisionEngineIntegration.ts
│   ├── AcousticEngineIntegration.ts   ← Phase 3
│   ├── MultimodalIntegration.ts       ← Phase 3
│   └── index.ts
└── index.ts
```

---

## PHASE 3: Acoustic Module 🔄 IN PROGRESS
### "Hair Shaft Analysis via Sound"

**Цель:** Неинвазивный акустический анализ структуры волоса

### 3.1 Research (✅ Complete)

| Исследование | Вывод | Применение |
|--------------|-------|------------|
| Wav2Vec2-Conformer | SOTA speech recognition | Audio feature extraction |
| Acoustic impedance | Structure correlation | Porosity/hydration mapping |
| Multi-sensor arrays | Spatial analysis | Scalp zone differentiation |
| SSL embeddings | 768-dim representations | Similarity search |

**Научная база:** arXiv:2506.14148 (Interspeech 2025)
**Отчёт:** `research/ACOUSTIC_MODULE_RESEARCH.md`

---

### 3.2 AcousticTypes (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 3.2.1 | IAcousticRecording | Audio input format | ✅ Done |
| 3.2.2 | IAudioSignal | Multi-channel signals | ✅ Done |
| 3.2.3 | IAcousticEnvironment | Sensor array config | ✅ Done |
| 3.2.4 | IAudioEmbedding | 768-dim Wav2Vec2 vector | ✅ Done |
| 3.2.5 | IAcousticAnalysis | Complete analysis result | ✅ Done |
| 3.2.6 | IAcousticObservation | POMDP-compatible format | ✅ Done |

**Implemented Interface:**
```typescript
interface IAcousticObservation {
  porosity: number;           // 0-1 (lower is healthier)
  hydration: number;          // 0-1 (higher is healthier)
  structureClass: 'healthy' | 'weathered' | 'damaged';
  structureDamageScore: number;
  confidence: number;
  zone: ScalpZone;
}
```

---

### 3.3 AcousticAnalyzer (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 3.3.1 | Pluggable backend interfaces | IFeatureExtractor, etc. | ✅ Done |
| 3.3.2 | Recording validation | Duration, sample rate | ✅ Done |
| 3.3.3 | analyze() | Full pipeline execution | ✅ Done |
| 3.3.4 | analyzeBatch() | Multi-recording processing | ✅ Done |
| 3.3.5 | compareToNorms() | Health score calculation | ✅ Done |
| 3.3.6 | toAcousticObservation() | Analysis → Observation | ✅ Done |

**Архитектура:**
```
Recording → [Preprocessor] → Signal
                  ↓
          [Wav2Vec2] → Embedding
                  ↓
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
[Porosity]   [Hydration]   [Structure]
    ↓             ↓             ↓
    └─────────────┼─────────────┘
                  ↓
        IAcousticAnalysis
```

---

### 3.4 AcousticEngineIntegration (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 3.4.1 | End-to-end pipeline | Recording → Recommendation | ✅ Done |
| 3.4.2 | Multi-zone analysis | Scalp mapping | ✅ Done |
| 3.4.3 | analyzeOnly() | Preview without belief update | ✅ Done |
| 3.4.4 | Edge-optimized factory | createEdgeAcousticIntegration() | ✅ Done |

**API:**
```typescript
const integration = createAcousticEngineIntegration();
await integration.initialize(components);

// Single zone
const result = await integration.runPipeline(patientId, recording, context);

// Multi-zone scalp mapping
const mapping = await integration.runMultiZonePipeline(patientId, recordings, context);
```

---

### 3.5 MultimodalIntegration (✅ Complete)

| Задача | Описание | Deliverable | Status |
|--------|----------|-------------|--------|
| 3.5.1 | Vision + Acoustic fusion | Late fusion strategy | ✅ Done |
| 3.5.2 | Modality agreement analysis | Discrepancy detection | ✅ Done |
| 3.5.3 | Scalp mapping | Multi-zone inputs | ✅ Done |
| 3.5.4 | Configurable weights | 60% vision / 40% acoustic | ✅ Done |

**Fusion Strategy:**
```typescript
const integration = createMultimodalIntegration({
  fusionStrategy: 'late',
  visionWeight: 0.6,
  acousticWeight: 0.4,
  includeModalityComparison: true,
});

const result = await integration.runPipeline(patientId, {
  image: trichoscopyImage,
  recording: acousticRecording,
  zone: 'temporal',
}, context);

// result.fusedObservation → Combined observation
// result.modalityAgreement → Cross-modal analysis
// result.recommendation → Treatment strategy
```

---

### 3.6 Hardware Integration (⏳ Pending)

| Задача | Описание | Timeline |
|--------|----------|----------|
| 3.6.1 | Прототип акустического датчика | Q2 2026 |
| 3.6.2 | Калибровка и валидация | Q2 2026 |
| 3.6.3 | Клиническая корреляция | Q3 2026 |

---

### Phase 3 Progress

**Тесты:** 482 теста пройдено (+181 новых)
**Покрытие:** 96.7% statements, 81.33% branches

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 3 SOFTWARE COMPLETE                              [January 2026] │
├──────────────────────────────────────────────────────────────────────┤
│ ✅ AcousticTypes.ts              - Type definitions, norms           │
│ ✅ AcousticAnalyzer.ts           - Pluggable audio pipeline          │
│ ✅ AcousticEngineIntegration.ts  - Acoustic → POMDP bridge           │
│ ✅ MultimodalIntegration.ts      - Vision + Acoustic fusion          │
│ ✅ 482 tests passing             - 81.33% branch coverage            │
│ ⏳ Hardware prototype            - Pending Q2 2026                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 3.7: ML Pipeline Implementation 🆕
### "Интеграция моделей из исследования"

**Цель:** Внедрение cutting-edge моделей из FOLLICORE_RESEARCH_2025.md

### 3.7.1 Datasets Acquisition

| Задача | Датасет | Источник | Приоритет |
|--------|---------|----------|-----------|
| 3.7.1.1 | Hair Loss Segmentation | Kaggle | **CRITICAL** |
| 3.7.1.2 | HAM10000 (10,015 images) | Kaggle | **CRITICAL** |
| 3.7.1.3 | Bald Women Ludwig Scale | Kaggle | HIGH |
| 3.7.1.4 | SA-Med2D-20M | HuggingFace | HIGH |
| 3.7.1.5 | Skin Lesion Hair Mask | Kaggle | MEDIUM |

### 3.7.2 Model Fine-tuning Pipeline

```
Этап 1: Foundation
├── facebook/dinov2-base → download
├── Fine-tune на HAM10000 → dinov2-dermoscopy
└── Валидация на тестовом сете

Этап 2: Domain Adaptation
├── dinov2-dermoscopy → Fine-tune на Hair Loss Segmentation
├── → dinov2-trichoscopy
└── Метрики: IoU, F1, accuracy

Этап 3: Segmentation
├── wanglab/MedSAM2 → интеграция
├── Fine-tune на hair-specific masks
└── → MedSAM2-hair

Этап 4: Integration
├── Заменить mock backends на реальные модели
├── VisionTypes.ts → реальные эмбеддинги
└── End-to-end тестирование
```

### 3.7.3 GitHub Integrations

| Репозиторий | Интеграция | Задача |
|-------------|------------|--------|
| [ScalpVision](https://github.com/winston1214/ScalpVision) | Архитектура | Адаптировать U2-Net + DiffuseIT |
| [MedSAM](https://github.com/bowang-lab/MedSAM) | Сегментация | Интегрировать MedSAM2 |
| [Hair-Analysis-Tool](https://github.com/nazil-the-professor/Hair-Analysis-Tool) | Плотность | Портировать алгоритмы |
| [Intelligent_hair_analysis](https://github.com/macarize/Intelligent_hair_analysis_system) | Классификация | Norwood-Hamilton staging |

---

## PHASE 4: Россия — Тестовый Рынок 🇷🇺
### "Russia First Strategy"

**Цель:** Запуск MVP в России с упрощённой регуляторикой, сбор клинических данных

### Почему Россия первая?

| Фактор | Россия | США/ЕС |
|--------|--------|--------|
| Регуляторика | Росздравнадзор (проще) | FDA 510(k) / CE MDR (сложно) |
| Время до рынка | 6-12 месяцев | 18-36 месяцев |
| Стоимость сертификации | ~500K-2M ₽ | $100K-500K+ |
| Клинические испытания | Упрощённые для wellness | Строгие RCT требования |
| Доступ к пациентам | Партнёрства с клиниками | Сложная логистика |

### 4.1 Hardware Prototype (Q2 2026)

| Задача | Описание | Deliverable |
|--------|----------|-------------|
| 4.1.1 | Закупка Raspberry Pi 5 + Hailo-8L | Dev kit |
| 4.1.2 | Трихоскопическая камера (USB microscope) | 50-200x увеличение |
| 4.1.3 | MEMS микрофон (Knowles SPH0645) | Акустический сенсор |
| 4.1.4 | 3D-печать корпуса | Эргономичный дизайн |
| 4.1.5 | Сборка прототипа v0.1 | Working device |

**BOM (Bill of Materials):**
```
Raspberry Pi 5 (8GB)         — 12,000 ₽
Hailo-8L AI Kit              — 8,000 ₽
USB Trichoscopy Camera       — 15,000 ₽
MEMS Microphone Array        — 2,000 ₽
Power Supply + Battery       — 3,000 ₽
3D Printed Enclosure         — 5,000 ₽
Miscellaneous                — 5,000 ₽
─────────────────────────────────────
TOTAL                        — ~50,000 ₽ (~$500)
```

### 4.2 Software Deployment (Q2-Q3 2026)

| Задача | Описание | Deliverable |
|--------|----------|-------------|
| 4.2.1 | ONNX экспорт моделей | Оптимизированные веса |
| 4.2.2 | TensorFlow Lite конверсия | Edge-ready models |
| 4.2.3 | Hailo Model Zoo интеграция | HEF compilation |
| 4.2.4 | Real-time inference pipeline | <2s на анализ |
| 4.2.5 | Мобильное приложение (Flutter) | iOS/Android клиент |

### 4.3 Партнёрства в России (Q2-Q3 2026)

| Партнёр | Тип | Цель |
|---------|-----|------|
| Трихологические клиники Москвы | Пилот | 5-10 клиник для тестирования |
| РНИМУ им. Пирогова | Академия | Научная валидация |
| Сеченовский университет | Академия | Клинические исследования |
| Сеть "Реднор" / "Трихолог" | B2B | Масштабирование |

### 4.4 Регуляторика РФ (Q3-Q4 2026)

| Задача | Описание | Timeline |
|--------|----------|----------|
| 4.4.1 | Классификация изделия | Wellness vs МИ класс I |
| 4.4.2 | Регистрационное досье | Если МИ — Росздравнадзор |
| 4.4.3 | Технические испытания | Аккредитованная лаборатория |
| 4.4.4 | Клинические испытания | N=30-50 feasibility |
| 4.4.5 | Получение РУ | Регистрационное удостоверение |

**Стратегия регуляторики:**
```
Вариант A: Wellness Device (быстрый путь)
├── Позиционирование: "консультационный инструмент"
├── Без диагностических заявлений
├── Не требует РУ Росздравнадзора
└── Срок: 3-6 месяцев

Вариант B: Медицинское изделие класса I (средний путь)
├── Позиционирование: "вспомогательное диагностическое средство"
├── Упрощённая процедура регистрации
├── Требует РУ, но без клинических испытаний
└── Срок: 6-12 месяцев

Вариант C: Медицинское изделие класса IIa (полный путь)
├── Позиционирование: "диагностическое устройство"
├── Полная процедура с клиническими испытаниями
├── Максимальная защита, но долго
└── Срок: 12-18 месяцев
```

**Рекомендация:** Начать с **Варианта A** (Wellness), собрать данные, затем перейти к **Варианту B**.

### 4.5 Пилотное исследование (Q4 2026)

| Задача | Описание | Deliverable |
|--------|----------|-------------|
| 4.5.1 | Протокол исследования | Утверждённый протокол |
| 4.5.2 | Этический комитет | Одобрение ЭК |
| 4.5.3 | Набор пациентов N=50 | Informed consent |
| 4.5.4 | Сбор данных | Vision + Acoustic + эксперт |
| 4.5.5 | Анализ: AI vs Трихолог | ICC, Bland-Altman |
| 4.5.6 | Публикация | Российский журнал дерматологии |

---

## PHASE 5: Международная экспансия (2027+)
### "Global Scale"

**Цель:** После валидации в РФ — выход на международные рынки

### 5.1 CE Marking (ЕС)

| Задача | Описание | Timeline |
|--------|----------|----------|
| 5.1.1 | MDR классификация | Q1 2027 |
| 5.1.2 | Notified Body выбор | Q1 2027 |
| 5.1.3 | Technical File | Q2 2027 |
| 5.1.4 | CE маркировка | Q3 2027 |

### 5.2 FDA 510(k) (США)

| Задача | Описание | Timeline |
|--------|----------|----------|
| 5.2.1 | Pre-Submission meeting | Q2 2027 |
| 5.2.2 | Predicate device analysis | Q2 2027 |
| 5.2.3 | 510(k) submission | Q3 2027 |
| 5.2.4 | FDA clearance | Q4 2027 |

### 5.3 Масштабирование

| Рынок | Стратегия | Timeline |
|-------|-----------|----------|
| СНГ (Казахстан, Беларусь) | ЕАЭС регистрация | Q1 2027 |
| Европа | CE + дистрибьюторы | Q3 2027 |
| США | FDA + партнёрства | Q4 2027 |
| Азия (Индия, Китай) | Локальные партнёры | 2028 |

---

## Master Timeline

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     FOLLICORE MASTER TIMELINE (RUSSIA FIRST)                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│ 2026                                               2027                           │
│ Q1         Q2         Q3         Q4               Q1         Q2         Q3       │
│ ├──────────┼──────────┼──────────┼────────────────┼──────────┼──────────┼────────│
│  ▲                                                                                │
│  │ WE ARE HERE (January 2026)                                                     │
│                                                                                   │
│ ██████████████████████████████████                                                │
│ PHASE 1+2+3: Software Complete [100%] ✅                                          │
│ • POMDP Engine ✅  • Vision Pipeline ✅  • Acoustic Pipeline ✅                    │
│ • 482 tests ✅     • 96.7% coverage ✅   • Multimodal Fusion ✅                    │
│                                                                                   │
│ ▼ v0.3.0 (current)                                                                │
│                                                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐          │
│ │ PHASE 3.7: ML Pipeline [Q1-Q2 2026]                                 │          │
│ │ • Download datasets (HAM10000, Hair Loss Segmentation)              │          │
│ │ • Fine-tune DINOv2 → dinov2-trichoscopy                            │          │
│ │ • Integrate MedSAM2 for segmentation                                │          │
│ │ • Port ScalpVision architecture                                     │          │
│ └─────────────────────────────────────────────────────────────────────┘          │
│            ▼ v0.4.0                                                               │
│                                                                                   │
│            ┌─────────────────────────────────────────────────────────┐           │
│            │ PHASE 4: 🇷🇺 РОССИЯ MVP [Q2-Q4 2026]                    │           │
│            │ • Hardware: Pi 5 + Hailo-8L (~50K ₽)                    │           │
│            │ • Партнёрства: клиники Москвы                           │           │
│            │ • Регуляторика: Wellness → МИ класс I                   │           │
│            │ • Пилот: N=50 пациентов                                 │           │
│            └─────────────────────────────────────────────────────────┘           │
│                                    ▼ v0.5.0 (Russia MVP)                          │
│                                                                                   │
│                                    ┌────────────────────────────────────────────┐│
│                                    │ PHASE 5: МЕЖДУНАРОДНАЯ ЭКСПАНСИЯ [2027]   ││
│                                    │ • Q1: СНГ (ЕАЭС регистрация)              ││
│                                    │ • Q2: CE Marking (Европа)                 ││
│                                    │ • Q3: FDA 510(k) submission               ││
│                                    │ • Q4: Global launch                       ││
│                                    └────────────────────────────────────────────┘│
│                                                                    ▼ v1.0.0      │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Ближайшие конкретные шаги (Next Actions)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🎯 IMMEDIATE NEXT STEPS (Январь-Февраль 2026)                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ НЕДЕЛЯ 1-2: Датасеты                                                         │
│ □ Скачать HAM10000 с Kaggle                                                  │
│ □ Скачать Hair Loss Segmentation Dataset                                     │
│ □ Скачать Bald Women Ludwig Scale                                            │
│ □ Организовать data pipeline (train/val/test split)                          │
│                                                                               │
│ НЕДЕЛЯ 3-4: DINOv2 Fine-tuning                                               │
│ □ Установить PyTorch + CUDA environment                                      │
│ □ Загрузить facebook/dinov2-base                                             │
│ □ Fine-tune на HAM10000 (dermoscopy baseline)                                │
│ □ Fine-tune на hair datasets → dinov2-trichoscopy                            │
│ □ Валидация: IoU, F1, accuracy метрики                                       │
│                                                                               │
│ НЕДЕЛЯ 5-6: MedSAM2 Integration                                              │
│ □ Clone bowang-lab/MedSAM                                                    │
│ □ Адаптировать для hair segmentation                                         │
│ □ Интегрировать в TrichoscopyAnalyzer.ts                                     │
│ □ Заменить mock backend на реальную модель                                   │
│                                                                               │
│ НЕДЕЛЯ 7-8: Hardware Prototype v0.1                                          │
│ □ Заказать Raspberry Pi 5 (8GB)                                              │
│ □ Заказать Hailo-8L AI Kit                                                   │
│ □ Заказать USB trichoscopy camera                                            │
│ □ Заказать MEMS microphone                                                   │
│ □ Первая сборка и тестирование                                               │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Test Results Summary

```
═══════════════════════════════════════════════════════════════
📊 FOLLICORE TEST RESULTS                        [January 2026]
═══════════════════════════════════════════════════════════════
Test Suites: 12 passed, 12 total
Tests:       482 passed, 482 total

Coverage:
  Statements : 96.70% ( 1144/1183 )
  Branches   : 81.33% ( 292/359 )
  Functions  : 98.66% ( 221/224 )
  Lines      : 97.40% ( 1087/1116 )

Module breakdown:
  acoustic/                     95.95% statements
  integration/                  96.50% statements
  trichology/                   94.23% statements
  vision/                       95.20% statements
═══════════════════════════════════════════════════════════════
```

---

## Версионирование

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.1.0 | 2026-01-15 | Initial setup, Phase 1 domain model |
| 0.1.1 | 2026-01-16 | Phase 1 complete: FolliCoreEngine + Safety Rules |
| 0.2.0 | 2026-01-17 | **Phase 2 complete**: Vision module + Integration layer |
| 0.3.0 | 2026-01-17 | **Phase 3 software**: Acoustic module + Multimodal fusion |
| 0.3.1 | 2026-01-20 | **Research**: AI/ML research report + Russia First strategy |

---

## Связь с CogniCore

FolliCore использует архитектурные паттерны CogniCore Engine:
- **POMDP Belief State** — управление неопределённостью диагноза
- **Thompson Sampling** — балансировка exploration/exploitation в лечении
- **Safety Rules** — Constitutional AI для медицинских ограничений
- **Trajectory Prediction** — KalmanFormer-style прогнозирование

---

**© 2026 Благотворительный фонд "Другой путь"**
**FolliCore | awfond.ru**
