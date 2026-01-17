# Changelog

All notable changes to FolliCore will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-01-17

### Added

#### Acoustic Module
- `AcousticTypes.ts` - Complete type system for acoustic analysis
  - `IAcousticRecording` - Audio input format with multi-channel support
  - `IAudioSignal` - Signal representation with metadata
  - `IAcousticEnvironment` - Sensor array configuration
  - `IAudioEmbedding` - 768-dim Wav2Vec2 vector format
  - `IAcousticAnalysis` - Complete analysis result structure
  - `IAcousticObservation` - POMDP-compatible observation format
  - `ACOUSTIC_NORMS` - Reference values for healthy hair

- `AcousticAnalyzer.ts` - Pluggable audio analysis pipeline
  - Wav2Vec2-Conformer feature extraction
  - Porosity detection from acoustic impedance
  - Hydration estimation from signal absorption
  - Structure classification (healthy/weathered/damaged)
  - Batch analysis with error handling
  - Norm comparison and health scoring
  - Similarity search integration

#### Integration Layer
- `AcousticEngineIntegration.ts` - Acoustic-only pipeline
  - Single recording analysis with belief updates
  - Multi-zone scalp mapping
  - `createEdgeAcousticIntegration()` factory for edge devices
  - Treatment recommendations from acoustic data

- `MultimodalIntegration.ts` - Vision + Acoustic fusion
  - Late fusion strategy with configurable weights (60/40 default)
  - Cross-modal agreement analysis
  - Modality discrepancy detection
  - Scalp mapping with trajectory prediction
  - Fused observations for enhanced accuracy

### Changed
- Updated `integration/index.ts` with new exports
- Extended file structure documentation in ROADMAP

### Tests
- Added 51 new integration tests (28 acoustic + 23 multimodal)
- Total: 470 tests passing
- Coverage: 95.43% statements, 76.6% branches

---

## [0.2.0] - 2026-01-17

### Added

#### Vision Module
- `VisionTypes.ts` - Complete type system for trichoscopy analysis
  - `ITrichoscopyImage` - Image input format
  - `IImageEmbedding` - 1024-dim DINOv2 vector
  - `IMorphometryResult` - Bulb/shaft measurements
  - `IDensityResult` - Hair count, FU distribution
  - `ICycleAnalysis` - Anagen/telogen/vellus ratios
  - `ITrichoscopyAnalysis` - Complete analysis result
  - `VisionError` - Typed error handling

- `TrichoscopyAnalyzer.ts` - Pluggable CV pipeline
  - DINOv2-Large feature extraction
  - MedSAM segmentation
  - Morphometry, density, and cycle analysis heads
  - Batch processing support
  - Interactive segmentation with point prompts

- `MorphometryExtractor.ts` - PGMU-aligned measurements
  - Bulb width extraction (60-80μm range)
  - Shaft thickness measurement
  - Calibration support (px/μm conversion)
  - Confidence scoring

- `VisionBeliefAdapter.ts` - Vision to POMDP bridge
  - `toObservation()` - Analysis → IFollicleObservation
  - `inferState()` - State probability distribution
  - `calculateAgeDelta()` - Biological vs chronological age
  - `calculateProgressionRisk()` - 0-1 risk score
  - `calculateRecoveryPotential()` - 0-1 potential score

#### Integration Layer
- `VisionEngineIntegration.ts` - End-to-end orchestration
  - Complete pipeline: Image → Recommendation
  - Batch processing for multi-zone analysis
  - `analyzeOnly()` for preview without belief update

### Tests
- Added 156 vision module tests
- Total: 301 tests passing
- Coverage: 95.7% statements, 81.19% branches

---

## [0.1.1] - 2026-01-16

### Added

#### Safety Rules
- `TrichologySafetyRules.ts` - Medical safety constraints
  - `NEVER_FINASTERIDE_FEMALE` - Hard blocker for pregnancy risk
  - `NEVER_IGNORE_INFLAMMATION` - Block stimulation with active inflammation
  - `CONTRAINDICATION_CHECK` - Medical history validation
  - `SPECIALIST_REFERRAL` - Escalation for severe cases
  - `PROGRESSION_ESCALATION` - Alert on >10% density loss
  - 9 total safety rules (hard/soft constraints, escalation triggers)

### Changed
- Enhanced `FolliCoreEngine` with safety rule integration
- `getRecommendation()` now filters through safety rules

### Tests
- Added safety rule tests
- Total: 145 tests passing

---

## [0.1.0] - 2026-01-15

### Added

#### Domain Model
- `TrichologyStates.ts` - Core domain definitions
  - `FollicleState` enum (10 states: healthy, pathological, terminal)
  - `TrichologyAction` enum (14 actions: pharma, procedural, lifestyle)
  - `IFollicleObservation` - Vision → POMDP bridge interface
  - `IPatientContext` - Age/gender/genetics context
  - `ITrichologyBeliefState` - Belief distribution
  - `PGMU_NORMS` - Age/gender reference values
  - `getAgeGroup()` - Age bracket classification
  - `estimateFollicleAge()` - Biological age estimation

#### POMDP Engine
- `FolliCoreEngine.ts` - Core decision engine
  - `initializePatient()` - Create patient belief state
  - `updateBelief()` - Bayesian belief update from observations
  - `getRecommendation()` - Thompson Sampling action selection
  - `predictTrajectory()` - KalmanFormer-style prediction
  - `updateOutcome()` - Treatment outcome learning
  - Multi-armed bandit with Beta distributions

### Infrastructure
- TypeScript project setup
- Jest testing configuration
- ESLint configuration

### Tests
- Initial test suite
- Coverage foundation established

---

## Links

- [0.3.0]: https://github.com/hiplawrussia-stack/FolliCore/releases/tag/v0.3.0
- [0.2.0]: https://github.com/hiplawrussia-stack/FolliCore/releases/tag/v0.2.0
- [0.1.1]: https://github.com/hiplawrussia-stack/FolliCore/releases/tag/v0.1.1
- [0.1.0]: https://github.com/hiplawrussia-stack/FolliCore/releases/tag/v0.1.0
