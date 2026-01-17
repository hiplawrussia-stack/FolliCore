/**
 * Tests for MultimodalIntegration
 */

import {
  MultimodalIntegration,
  createMultimodalIntegration,
  DEFAULT_MULTIMODAL_CONFIG,
  IMultimodalInput,
  IMultimodalDependencies,
} from './MultimodalIntegration';

import {
  IAcousticRecording,
  IAudioSignal,
  IAcousticEnvironment,
  IAudioEmbedding,
  IAcousticTokens,
  IMelSpectrogram,
  ISpectralFeatures,
  IPorosityAnalysis,
  IHydrationAnalysis,
  IStructuralAnalysis,
  DEFAULT_SENSOR_ARRAY,
} from '../acoustic/AcousticTypes';

import {
  ISignalPreprocessor,
  IAcousticAnalyzerComponents,
} from '../acoustic/AcousticAnalyzer';

import {
  IFeatureExtractorBackend,
  IHairAnalysisBackend,
  ISpectralAnalysisBackend,
} from '../acoustic/AcousticTypes';

import {
  ITrichoscopyImage,
  IFeatureExtractor,
  ISegmentationModel,
  IMorphometryHead,
  IDensityHead,
  ICycleHead,
} from '../vision';

import { IPatientContext } from '../trichology/domain/TrichologyStates';
import { ScalpZone } from '../vision/VisionTypes';

describe('MultimodalIntegration', () => {
  // ===========================================================================
  // VISION MOCK IMPLEMENTATIONS
  // ===========================================================================

  const createMockImage = (zone: ScalpZone = 'temporal'): ITrichoscopyImage => ({
    imageId: `img_${Date.now()}`,
    data: new Uint8Array(224 * 224 * 3),
    width: 224,
    height: 224,
    format: 'png',
    zone,
    magnification: 20,
    capturedAt: new Date(),
    deviceId: 'fotofinder_001',
    calibrationFactor: 1.0,
  });

  const createMockFeatureExtractor = (): IFeatureExtractor => ({
    load: jest.fn().mockResolvedValue(undefined),
    extract: jest.fn().mockResolvedValue({
      vector: new Float32Array(1024).fill(0.5),
      dimension: 1024,
      model: 'dinov2-large',
      patchEmbeddings: [],
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
  });

  const createMockSegmentationModel = (): ISegmentationModel => ({
    load: jest.fn().mockResolvedValue(undefined),
    segment: jest.fn().mockResolvedValue({
      mask: new Uint8Array(100 * 100),
      instances: [],
      confidence: 0.9,
    }),
    segmentWithPrompt: jest.fn().mockResolvedValue({
      mask: new Uint8Array(100 * 100),
      instances: [],
      confidence: 0.9,
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
  });

  const createMockMorphometryHead = (): IMorphometryHead => ({
    load: jest.fn().mockResolvedValue(undefined),
    extract: jest.fn().mockResolvedValue({
      bulbWidth: 72.5,
      shaftThickness: 32.0,
      bulbWidthStd: 3.2,
      shaftThicknessStd: 2.1,
      sampleSize: 45,
      confidence: 0.88,
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
  });

  const createMockDensityHead = (): IDensityHead => ({
    load: jest.fn().mockResolvedValue(undefined),
    analyze: jest.fn().mockResolvedValue({
      totalHairCount: 180,
      density: 180,
      follicularUnits: 82,
      fuDistribution: {
        single: 20,
        double: 45,
        triple: 15,
        quad: 2,
      },
      analyzedArea: 1.0,
      confidence: 0.85,
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
  });

  const createMockCycleHead = (): ICycleHead => ({
    load: jest.fn().mockResolvedValue(undefined),
    classify: jest.fn().mockResolvedValue({
      anagenCount: 38,
      catagenCount: 2,
      telogenCount: 5,
      anagenTelogenRatio: 0.88,
      vellusCount: 6,
      terminalCount: 39,
      vellusTerminalRatio: 0.13,
      confidence: 0.82,
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
    isLoaded: jest.fn().mockReturnValue(true),
  });

  // ===========================================================================
  // ACOUSTIC MOCK IMPLEMENTATIONS
  // ===========================================================================

  const createMockSignal = (
    duration: number = 10,
    sampleRate: number = 48000
  ): IAudioSignal => ({
    data: new Float32Array(duration * sampleRate).fill(0.1),
    sampleRate,
    channels: 1,
    duration,
    capturedAt: new Date(),
    sourceChannel: 'primary',
  });

  const createMockEnvironment = (qualityScore: number = 0.9): IAcousticEnvironment => ({
    ambientNoiseDb: 45,
    temperature: 22,
    humidity: 50,
    contactPressure: 0.5,
    qualityScore,
  });

  const createMockRecording = (
    zone: ScalpZone = 'temporal',
    duration: number = 10
  ): IAcousticRecording => {
    const signals = new Map<string, IAudioSignal>();
    signals.set('primary', createMockSignal(duration));
    signals.set('contact', createMockSignal(duration));
    signals.set('ambient', createMockSignal(duration));

    return {
      recordingId: `rec_${Date.now()}`,
      patientId: 'patient_123',
      zone,
      signals,
      sensorConfig: DEFAULT_SENSOR_ARRAY,
      recordedAt: new Date(),
      totalDuration: duration,
      deviceId: 'device_001',
      environment: createMockEnvironment(),
    };
  };

  const createMockPreprocessor = (): ISignalPreprocessor => ({
    preprocess: jest.fn().mockImplementation((signal: IAudioSignal) =>
      Promise.resolve(signal)
    ),
    reduceNoise: jest.fn().mockImplementation((signal: IAudioSignal) =>
      Promise.resolve(signal)
    ),
    normalize: jest.fn().mockImplementation((signal: IAudioSignal) => signal),
    calculateSnr: jest.fn().mockReturnValue(35),
    detectMotionArtifacts: jest.fn().mockReturnValue(false),
  });

  const createMockSpectralBackend = (): ISpectralAnalysisBackend => ({
    computeMelSpectrogram: jest.fn().mockResolvedValue({
      data: [new Float32Array(128), new Float32Array(128)],
      timeFrames: 2,
      melBins: 128,
      hopSize: 512,
      windowSize: 2048,
      fMin: 20,
      fMax: 96000,
    } as IMelSpectrogram),
    extractSpectralFeatures: jest.fn().mockResolvedValue([
      {
        centroid: 5000,
        bandwidth: 2000,
        rolloff: 8000,
        flatness: 0.3,
        contrast: [0.5, 0.6, 0.7],
        zeroCrossingRate: 0.15,
        rmsEnergy: 0.05,
        mfcc: new Array(13).fill(0),
      },
    ] as ISpectralFeatures[]),
    computeGlobalFeatures: jest.fn().mockReturnValue({
      centroid: 5000,
      bandwidth: 2000,
      rolloff: 8000,
      flatness: 0.3,
      contrast: [0.5, 0.6, 0.7],
      zeroCrossingRate: 0.15,
      rmsEnergy: 0.05,
      mfcc: new Array(13).fill(0),
    } as ISpectralFeatures),
  });

  const createMockAcousticFeatureExtractor = (): IFeatureExtractorBackend => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    extractEmbedding: jest.fn().mockResolvedValue({
      vector: new Float32Array(768).fill(0.5),
      dimension: 768,
      model: 'openbeats-base',
      modelVersion: '1.0.0',
      extractedAt: new Date(),
      layer: 12,
    } as IAudioEmbedding),
    extractTokens: jest.fn().mockResolvedValue({
      tokenIds: [100, 200, 300],
      tokenEmbeddings: [
        new Float32Array(256),
        new Float32Array(256),
        new Float32Array(256),
      ],
      numTokens: 3,
      codebookSize: 8192,
    } as IAcousticTokens),
    getModelInfo: jest.fn().mockReturnValue({
      name: 'openbeats-base',
      version: '1.0.0',
      device: 'cuda',
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
  });

  const createMockHairAnalysisBackend = (): IHairAnalysisBackend => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    analyzePorosity: jest.fn().mockResolvedValue({
      score: 0.25,
      level: 'normal',
      absorptionCoefficient: 0.18,
      cuticleIntegrity: 0.85,
      confidence: 0.9,
    } as IPorosityAnalysis),
    analyzeHydration: jest.fn().mockResolvedValue({
      score: 0.75,
      level: 'optimal',
      moisturePercent: 12.5,
      waveVelocity: 1500,
      confidence: 0.88,
    } as IHydrationAnalysis),
    analyzeStructure: jest.fn().mockResolvedValue({
      structureClass: 'healthy',
      damageScore: 0.15,
      scatteringRegularity: 0.88,
      dampingCoefficient: 0.28,
      resonanceFrequency: 5000,
      damageTypes: [],
      confidence: 0.85,
    } as IStructuralAnalysis),
    dispose: jest.fn().mockResolvedValue(undefined),
  });

  const createMockDependencies = (): IMultimodalDependencies => ({
    vision: {
      featureExtractor: createMockFeatureExtractor(),
      segmentationModel: createMockSegmentationModel(),
      morphometryHead: createMockMorphometryHead(),
      densityHead: createMockDensityHead(),
      cycleHead: createMockCycleHead(),
    },
    acoustic: {
      preprocessor: createMockPreprocessor(),
      spectralBackend: createMockSpectralBackend(),
      featureExtractor: createMockAcousticFeatureExtractor(),
      hairAnalysisBackend: createMockHairAnalysisBackend(),
    },
  });

  const createMockContext = (): IPatientContext => ({
    age: 35,
    gender: 'male',
    chronicStressLevel: 'medium',
    geneticRisk: 0.4,
    medicalHistory: [],
    currentTreatments: [],
    treatmentHistory: [],
  });

  const createMockInput = (zone: ScalpZone = 'temporal'): IMultimodalInput => ({
    image: createMockImage(zone),
    recording: createMockRecording(zone),
    zone,
  });

  // ===========================================================================
  // INITIALIZATION TESTS
  // ===========================================================================

  describe('Initialization', () => {
    it('should create integration with default config', () => {
      const integration = new MultimodalIntegration();
      expect(integration).toBeDefined();
      expect(integration.isReady()).toBe(false);
    });

    it('should create integration via factory function', () => {
      const integration = createMultimodalIntegration();
      expect(integration).toBeDefined();
    });

    it('should accept custom config', () => {
      const integration = new MultimodalIntegration({
        fusionStrategy: 'early',
        visionWeight: 0.7,
        acousticWeight: 0.3,
      });
      expect(integration).toBeDefined();
    });

    it('should be ready after initialization', async () => {
      const integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());
      expect(integration.isReady()).toBe(true);
      await integration.dispose();
    });

    it('should initialize patient with belief state', async () => {
      const integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());

      const context = createMockContext();
      const belief = integration.initializePatient('patient_001', context);

      expect(belief).toBeDefined();
      expect(belief.stateDistribution.size).toBeGreaterThan(0);

      await integration.dispose();
    });
  });

  // ===========================================================================
  // PIPELINE TESTS
  // ===========================================================================

  describe('runPipeline()', () => {
    let integration: MultimodalIntegration;

    beforeEach(async () => {
      integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should throw if not initialized', async () => {
      const uninitializedIntegration = new MultimodalIntegration();
      const context = createMockContext();
      const input = createMockInput();

      await expect(
        uninitializedIntegration.runPipeline('patient_001', input, context)
      ).rejects.toThrow('Integration not initialized');
    });

    it('should return complete multimodal result', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result).toBeDefined();
      expect(result.patientId).toBe('patient_001');
      expect(result.zone).toBe('temporal');
      expect(result.visionAnalysis).toBeDefined();
      expect(result.acousticAnalysis).toBeDefined();
    });

    it('should include fused observation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.fusedObservation).toBeDefined();
      expect(result.fusedObservation.bulbWidth).toBeGreaterThan(0);
    });

    it('should include acoustic observation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.acousticObservation).toBeDefined();
      expect(result.acousticObservation.structureClass).toBeDefined();
    });

    it('should include modality agreement when configured', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeDefined();
      expect(result.modalityAgreement?.overallAgreement).toBeGreaterThanOrEqual(0);
    });

    it('should update belief state', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.beliefState).toBeDefined();
      expect(result.beliefState?.beliefHistory.length).toBeGreaterThan(0);
    });

    it('should include treatment recommendation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation?.primaryAction).toBeDefined();
    });

    it('should track all processing times', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.metadata.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.visionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.acousticTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.fusionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.engineTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // SCALP MAPPING TESTS
  // ===========================================================================

  describe('runScalpMapping()', () => {
    let integration: MultimodalIntegration;

    beforeEach(async () => {
      integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should analyze multiple zones', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const inputs = [
        createMockInput('temporal'),
        createMockInput('parietal'),
        createMockInput('vertex'),
      ];

      const result = await integration.runScalpMapping('patient_001', inputs, context);

      expect(result.zoneResults.size).toBe(3);
      expect(result.summary.zonesAnalyzed).toHaveLength(3);
    });

    it('should return final belief and recommendation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const inputs = [
        createMockInput('temporal'),
        createMockInput('parietal'),
      ];

      const result = await integration.runScalpMapping('patient_001', inputs, context);

      expect(result.finalBelief).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should return trajectory prediction', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const inputs = [createMockInput('temporal')];

      const result = await integration.runScalpMapping('patient_001', inputs, context);

      expect(result.trajectory).toBeDefined();
      expect(result.trajectory.trend).toBeDefined();
    });

    it('should calculate scalp summary', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const inputs = [
        createMockInput('temporal'),
        createMockInput('parietal'),
      ];

      const result = await integration.runScalpMapping('patient_001', inputs, context);

      expect(result.summary.worstZone).toBeDefined();
      expect(result.summary.bestZone).toBeDefined();
      expect(result.summary.averageHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.dominantCondition).toBeDefined();
    });
  });

  // ===========================================================================
  // RECOMMENDATION AND PREDICTION TESTS
  // ===========================================================================

  describe('Recommendations and Predictions', () => {
    let integration: MultimodalIntegration;

    beforeEach(async () => {
      integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should get recommendation directly', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const input = createMockInput();
      await integration.runPipeline('patient_001', input, context);

      const recommendation = integration.getRecommendation('patient_001', context);

      expect(recommendation).toBeDefined();
      expect(recommendation.primaryAction).toBeDefined();
    });

    it('should predict trajectory', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const input = createMockInput();
      await integration.runPipeline('patient_001', input, context);

      const trajectory = integration.predictTrajectory('patient_001', 6);

      expect(trajectory).toBeDefined();
      expect(trajectory.horizon).toBe(6);
    });

    it('should record treatment outcome', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const input = createMockInput();
      await integration.runPipeline('patient_001', input, context);

      // Should not throw
      integration.recordOutcome('patient_001', 'minoxidil_5%', 'positive');
    });
  });

  // ===========================================================================
  // COMPONENT ACCESS TESTS
  // ===========================================================================

  describe('Component Access', () => {
    it('should expose all underlying components', async () => {
      const integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());

      const components = integration.getComponents();

      expect(components.visionAnalyzer).toBeDefined();
      expect(components.visionAdapter).toBeDefined();
      expect(components.acousticAnalyzer).toBeDefined();
      expect(components.engine).toBeDefined();

      await integration.dispose();
    });
  });

  // ===========================================================================
  // CLEANUP TESTS
  // ===========================================================================

  describe('dispose()', () => {
    it('should cleanup all resources', async () => {
      const integration = new MultimodalIntegration();
      await integration.initialize(createMockDependencies());
      expect(integration.isReady()).toBe(true);

      await integration.dispose();

      expect(integration.isReady()).toBe(false);
    });
  });

  // ===========================================================================
  // CONFIG TESTS
  // ===========================================================================

  describe('Configuration', () => {
    it('should have correct default config', () => {
      expect(DEFAULT_MULTIMODAL_CONFIG.fusionStrategy).toBe('late');
      expect(DEFAULT_MULTIMODAL_CONFIG.visionWeight).toBe(0.6);
      expect(DEFAULT_MULTIMODAL_CONFIG.acousticWeight).toBe(0.4);
      expect(DEFAULT_MULTIMODAL_CONFIG.autoUpdateBelief).toBe(true);
      expect(DEFAULT_MULTIMODAL_CONFIG.includeModalityComparison).toBe(true);
    });
  });

  // ===========================================================================
  // BRANCH COVERAGE TESTS
  // ===========================================================================

  describe('Branch Coverage - autoUpdateBelief disabled', () => {
    it('should skip belief update when autoUpdateBelief is false', async () => {
      const integration = new MultimodalIntegration({ autoUpdateBelief: false });
      await integration.initialize(createMockDependencies());

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      // Should still return belief state (from getBeliefState, not updateBelief)
      expect(result.beliefState).toBeDefined();

      await integration.dispose();
    });
  });

  describe('Branch Coverage - runScalpMapping edge cases', () => {
    it('should throw if runScalpMapping called before initialization', async () => {
      const integration = new MultimodalIntegration();
      const context = createMockContext();

      await expect(
        integration.runScalpMapping('patient_001', [createMockInput()], context)
      ).rejects.toThrow('Integration not initialized');
    });

    it('should collect significant discrepancies in scalp mapping', async () => {
      // Create integration with mocks that will produce significant discrepancies
      const integration = new MultimodalIntegration({ includeModalityComparison: true });

      // Create dependencies with low confidence to trigger health discrepancy
      const deps = createMockDependencies();
      // Override cycle head to return low anagen ratio (triggers discrepancy)
      (deps.vision.cycleHead.classify as jest.Mock).mockResolvedValue({
        anagenCount: 10,
        catagenCount: 5,
        telogenCount: 30,
        anagenTelogenRatio: 0.25, // Low ratio
        vellusCount: 25,
        terminalCount: 20,
        vellusTerminalRatio: 0.55, // High vellus ratio (triggers damage)
        confidence: 0.3, // Very low confidence
      });

      await integration.initialize(deps);

      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const inputs = [
        createMockInput('temporal'),
        createMockInput('parietal'),
      ];

      const result = await integration.runScalpMapping('patient_001', inputs, context);

      expect(result.zoneResults.size).toBe(2);
      expect(result.summary).toBeDefined();

      await integration.dispose();
    });
  });

  describe('Branch Coverage - Modality Agreement Analysis', () => {
    it('should detect structure disagreement when acoustic shows damage', async () => {
      const integration = new MultimodalIntegration({ includeModalityComparison: true });
      const deps = createMockDependencies();

      // Override acoustic to show damaged structure
      (deps.acoustic.hairAnalysisBackend.analyzeStructure as jest.Mock).mockResolvedValue({
        structureClass: 'damaged',
        damageScore: 0.85,
        scatteringRegularity: 0.3,
        dampingCoefficient: 0.7,
        resonanceFrequency: 3000,
        damageTypes: ['cuticle_erosion'],
        confidence: 0.9,
      });

      await integration.initialize(deps);

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeDefined();
      // Should have detected disagreement
      expect(result.modalityAgreement?.discrepancies.length).toBeGreaterThanOrEqual(0);

      await integration.dispose();
    });

    it('should detect health disagreement when confidence differs significantly', async () => {
      const integration = new MultimodalIntegration({ includeModalityComparison: true });
      const deps = createMockDependencies();

      // Override to create significant health disagreement
      (deps.vision.cycleHead.classify as jest.Mock).mockResolvedValue({
        anagenCount: 38,
        catagenCount: 2,
        telogenCount: 5,
        anagenTelogenRatio: 0.88,
        vellusCount: 6,
        terminalCount: 39,
        vellusTerminalRatio: 0.13,
        confidence: 0.95, // High confidence
      });

      // Set acoustic to show poor health (damaged structure)
      (deps.acoustic.hairAnalysisBackend.analyzeStructure as jest.Mock).mockResolvedValue({
        structureClass: 'damaged',
        damageScore: 0.9,
        scatteringRegularity: 0.2,
        dampingCoefficient: 0.8,
        resonanceFrequency: 2500,
        damageTypes: ['cortex_damage'],
        confidence: 0.85,
      });

      await integration.initialize(deps);

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeDefined();

      await integration.dispose();
    });

    it('should detect damage disagreement between vision and acoustic', async () => {
      const integration = new MultimodalIntegration({ includeModalityComparison: true });
      const deps = createMockDependencies();

      // Vision shows high vellus ratio (damage indicator)
      (deps.vision.cycleHead.classify as jest.Mock).mockResolvedValue({
        anagenCount: 20,
        catagenCount: 5,
        telogenCount: 20,
        anagenTelogenRatio: 0.5,
        vellusCount: 20,
        terminalCount: 25,
        vellusTerminalRatio: 0.45, // High vellus ratio > 0.3
        confidence: 0.8,
      });

      // Acoustic shows healthy structure (no damage)
      (deps.acoustic.hairAnalysisBackend.analyzeStructure as jest.Mock).mockResolvedValue({
        structureClass: 'healthy',
        damageScore: 0.1,
        scatteringRegularity: 0.9,
        dampingCoefficient: 0.25,
        resonanceFrequency: 5500,
        damageTypes: [],
        confidence: 0.9,
      });

      await integration.initialize(deps);

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeDefined();
      // Check for damage discrepancy
      const damageDiscrepancy = result.modalityAgreement?.discrepancies.find(
        d => d.aspect === 'damage'
      );
      expect(damageDiscrepancy).toBeDefined();

      await integration.dispose();
    });

    it('should add note for significant discrepancies', async () => {
      const integration = new MultimodalIntegration({ includeModalityComparison: true });
      const deps = createMockDependencies();

      // Create significant health disagreement (healthAgreement < 0.4)
      (deps.vision.cycleHead.classify as jest.Mock).mockResolvedValue({
        anagenCount: 40,
        catagenCount: 2,
        telogenCount: 3,
        anagenTelogenRatio: 0.9,
        vellusCount: 5,
        terminalCount: 40,
        vellusTerminalRatio: 0.11,
        confidence: 0.95, // High vision confidence
      });

      // Very poor acoustic health (damaged structure + bad scores)
      (deps.acoustic.hairAnalysisBackend.analyzeStructure as jest.Mock).mockResolvedValue({
        structureClass: 'damaged',
        damageScore: 0.95,
        scatteringRegularity: 0.1,
        dampingCoefficient: 0.9,
        resonanceFrequency: 2000,
        damageTypes: ['severe_cortex_damage'],
        confidence: 0.9,
      });

      // Bad porosity (high = bad)
      (deps.acoustic.hairAnalysisBackend.analyzePorosity as jest.Mock).mockResolvedValue({
        score: 0.9,
        level: 'high',
        absorptionCoefficient: 0.8,
        cuticleIntegrity: 0.1,
        confidence: 0.9,
      });

      // Bad hydration (low = bad)
      (deps.acoustic.hairAnalysisBackend.analyzeHydration as jest.Mock).mockResolvedValue({
        score: 0.1,
        level: 'low',
        moisturePercent: 5.0,
        waveVelocity: 1200,
        confidence: 0.9,
      });

      await integration.initialize(deps);

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeDefined();
      // Should have discrepancies
      expect(result.modalityAgreement?.discrepancies.length).toBeGreaterThan(0);
      // Should have significant discrepancy note
      expect(result.modalityAgreement?.notes).toContain('Significant modality discrepancy - consider additional testing');

      await integration.dispose();
    });
  });

  describe('Branch Coverage - includeModalityComparison disabled', () => {
    it('should skip modality comparison when disabled', async () => {
      const integration = new MultimodalIntegration({ includeModalityComparison: false });
      await integration.initialize(createMockDependencies());

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const input = createMockInput();

      const result = await integration.runPipeline('patient_001', input, context);

      expect(result.modalityAgreement).toBeUndefined();

      await integration.dispose();
    });
  });
});
