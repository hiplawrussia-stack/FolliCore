/**
 * Tests for AcousticEngineIntegration
 */

import {
  AcousticEngineIntegration,
  createAcousticEngineIntegration,
  createEdgeAcousticIntegration,
  DEFAULT_ACOUSTIC_INTEGRATION_CONFIG,
} from './AcousticEngineIntegration';

import {
  type IAcousticRecording,
  type IAudioSignal,
  type IAcousticEnvironment,
  type IAudioEmbedding,
  type IAcousticTokens,
  type IMelSpectrogram,
  type ISpectralFeatures,
  type IPorosityAnalysis,
  type IHydrationAnalysis,
  type IStructuralAnalysis,
  DEFAULT_SENSOR_ARRAY,
} from '../acoustic/AcousticTypes';

import {
  type ISignalPreprocessor,
  type IAcousticAnalyzerComponents,
  type IAcousticVectorDatabase,
  type IAcousticSimilarCase,
} from '../acoustic/AcousticAnalyzer';

import {
  type IFeatureExtractorBackend,
  type IHairAnalysisBackend,
  type ISpectralAnalysisBackend,
} from '../acoustic/AcousticTypes';

import { type IPatientContext, type IFollicleObservation } from '../trichology/domain/TrichologyStates';
import { type ScalpZone } from '../vision/VisionTypes';

describe('AcousticEngineIntegration', () => {
  // ===========================================================================
  // MOCK IMPLEMENTATIONS
  // ===========================================================================

  const createMockSignal = (
    duration = 10,
    sampleRate = 48000
  ): IAudioSignal => ({
    data: new Float32Array(duration * sampleRate).fill(0.1),
    sampleRate,
    channels: 1,
    duration,
    capturedAt: new Date(),
    sourceChannel: 'primary',
  });

  const createMockEnvironment = (qualityScore = 0.9): IAcousticEnvironment => ({
    ambientNoiseDb: 45,
    temperature: 22,
    humidity: 50,
    contactPressure: 0.5,
    qualityScore,
  });

  const createMockRecording = (
    zone: ScalpZone = 'temporal',
    duration = 10
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

  const createMockFeatureExtractor = (): IFeatureExtractorBackend => ({
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

  const createMockVectorDb = (): IAcousticVectorDatabase => ({
    search: jest.fn().mockResolvedValue([
      {
        caseId: 'case_001',
        similarity: 0.92,
        condition: 'healthy',
        treatment: 'none',
        outcome: 'positive',
      },
    ] as IAcousticSimilarCase[]),
    addCase: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  });

  const createMockComponents = (): IAcousticAnalyzerComponents => ({
    preprocessor: createMockPreprocessor(),
    spectralBackend: createMockSpectralBackend(),
    featureExtractor: createMockFeatureExtractor(),
    hairAnalysisBackend: createMockHairAnalysisBackend(),
    vectorDb: createMockVectorDb(),
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

  const createMockVisionObservation = (): IFollicleObservation => ({
    bulbWidth: 72.5,
    shaftThickness: 32.0,
    density: 180,
    follicularUnits: 82,
    anagenTelogenRatio: 0.82,
    vellusTerminalRatio: 0.15,
    zone: 'temporal',
    confidence: 0.88,
  });

  // ===========================================================================
  // INITIALIZATION TESTS
  // ===========================================================================

  describe('Initialization', () => {
    it('should create integration with default config', () => {
      const integration = new AcousticEngineIntegration();
      expect(integration).toBeDefined();
      expect(integration.isReady()).toBe(false);
    });

    it('should create integration via factory function', () => {
      const integration = createAcousticEngineIntegration();
      expect(integration).toBeDefined();
    });

    it('should create edge-optimized integration', () => {
      const integration = createEdgeAcousticIntegration();
      expect(integration).toBeDefined();
    });

    it('should accept custom config', () => {
      const integration = new AcousticEngineIntegration({
        autoUpdateBelief: false,
        includeNormComparison: false,
      });
      expect(integration).toBeDefined();
    });

    it('should be ready after initialization', async () => {
      const integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
      expect(integration.isReady()).toBe(true);
    });

    it('should initialize patient with belief state', async () => {
      const integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());

      const context = createMockContext();
      const belief = integration.initializePatient('patient_001', context);

      expect(belief).toBeDefined();
      expect(belief.stateDistribution.size).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // PIPELINE TESTS
  // ===========================================================================

  describe('runPipeline()', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should throw if not initialized', async () => {
      const uninitializedIntegration = new AcousticEngineIntegration();
      const context = createMockContext();
      const recording = createMockRecording();

      uninitializedIntegration.initializePatient('patient_001', context);

      await expect(
        uninitializedIntegration.runPipeline('patient_001', recording, context)
      ).rejects.toThrow('Integration not initialized');
    });

    it('should return complete pipeline result', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result).toBeDefined();
      expect(result.patientId).toBe('patient_001');
      expect(result.analysis).toBeDefined();
      expect(result.observation).toBeDefined();
    });

    it('should include norm comparison when configured', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result.normComparison).toBeDefined();
      expect(result.normComparison?.healthScore).toBeGreaterThanOrEqual(0);
    });

    it('should update belief when autoUpdateBelief is true', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result.beliefState).toBeDefined();
      expect(result.beliefState?.beliefHistory.length).toBeGreaterThan(0);
    });

    it('should include treatment recommendation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation?.primaryAction).toBeDefined();
    });

    it('should track processing times', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result.metadata.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.acousticTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.engineTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should accept vision observation for multimodal fusion', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();
      const visionObs = createMockVisionObservation();

      const result = await integration.runPipeline(
        'patient_001',
        recording,
        context,
        visionObs
      );

      expect(result).toBeDefined();
      expect(result.beliefState).toBeDefined();
    });
  });

  // ===========================================================================
  // MULTI-ZONE PIPELINE TESTS
  // ===========================================================================

  describe('runMultiZonePipeline()', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should analyze multiple zones', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await integration.runMultiZonePipeline(
        'patient_001',
        recordings,
        context
      );

      expect(result.summary.zonesAnalyzed).toBe(2);
      expect(result.zoneResults.size).toBe(2);
    });

    it('should return aggregated analysis', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await integration.runMultiZonePipeline(
        'patient_001',
        recordings,
        context
      );

      expect(result.multiZoneAnalysis).toBeDefined();
      expect(result.multiZoneAnalysis.aggregated).toBeDefined();
    });

    it('should return final recommendation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await integration.runMultiZonePipeline(
        'patient_001',
        recordings,
        context
      );

      expect(result.finalRecommendation).toBeDefined();
    });

    it('should calculate summary statistics', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await integration.runMultiZonePipeline(
        'patient_001',
        recordings,
        context
      );

      expect(result.summary.averageConfidence).toBeGreaterThan(0);
      expect(result.summary.avgPorosity).toBeDefined();
      expect(result.summary.avgHydration).toBeDefined();
    });
  });

  // ===========================================================================
  // ANALYZE ONLY TESTS
  // ===========================================================================

  describe('analyzeOnly()', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should analyze without updating belief', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const beliefBefore = integration.getBeliefState('patient_001');
      const historyLengthBefore = beliefBefore?.beliefHistory.length || 0;

      const result = await integration.analyzeOnly(recording);

      const beliefAfter = integration.getBeliefState('patient_001');
      const historyLengthAfter = beliefAfter?.beliefHistory.length || 0;

      expect(result.analysis).toBeDefined();
      expect(result.observation).toBeDefined();
      expect(result.normComparison).toBeDefined();
      expect(historyLengthAfter).toBe(historyLengthBefore);
    });
  });

  // ===========================================================================
  // BELIEF UPDATE TESTS
  // ===========================================================================

  describe('Belief Updates', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should update belief with multimodal observations', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const visionObs = createMockVisionObservation();
      const acousticObs = {
        porosity: 0.25,
        hydration: 0.75,
        structureClass: 'healthy' as const,
        confidence: 0.9,
      };

      const belief = integration.updateBeliefMultimodal(
        'patient_001',
        visionObs,
        acousticObs,
        context
      );

      expect(belief).toBeDefined();
      expect(belief.beliefHistory.length).toBeGreaterThan(0);
    });

    it('should update belief with acoustic only', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const acousticObs = {
        porosity: 0.25,
        hydration: 0.75,
        structureClass: 'healthy' as const,
        confidence: 0.9,
      };

      const belief = integration.updateBeliefAcousticOnly(
        'patient_001',
        acousticObs,
        'temporal',
        context
      );

      expect(belief).toBeDefined();
      expect(belief.beliefHistory.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // RECOMMENDATION AND PREDICTION TESTS
  // ===========================================================================

  describe('Recommendations and Predictions', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should get recommendation', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recording = createMockRecording();
      await integration.runPipeline('patient_001', recording, context);

      const recommendation = integration.getRecommendation('patient_001', context);

      expect(recommendation).toBeDefined();
      expect(recommendation.primaryAction).toBeDefined();
    });

    it('should predict trajectory', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recording = createMockRecording();
      await integration.runPipeline('patient_001', recording, context);

      const trajectory = integration.predictTrajectory('patient_001', 12);

      expect(trajectory).toBeDefined();
      expect(trajectory.horizon).toBe(12);
      expect(trajectory.trend).toBeDefined();
    });

    it('should record treatment outcome', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);

      const recording = createMockRecording();
      await integration.runPipeline('patient_001', recording, context);

      // Should not throw
      integration.recordOutcome('patient_001', 'minoxidil_5%', 'positive');
    });
  });

  // ===========================================================================
  // SIMILARITY SEARCH TESTS
  // ===========================================================================

  describe('Similarity Search', () => {
    let integration: AcousticEngineIntegration;

    beforeEach(async () => {
      integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
    });

    afterEach(async () => {
      await integration.dispose();
    });

    it('should find similar cases', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);
      const similar = await integration.findSimilarCases(result.analysis);

      expect(similar).toHaveLength(1);
      expect(similar[0].caseId).toBe('case_001');
    });

    it('should add to database', async () => {
      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      // Should not throw
      await integration.addToDatabase(result.analysis, {
        condition: 'healthy',
        porosityLevel: 'normal',
        hydrationLevel: 'optimal',
      });
    });
  });

  // ===========================================================================
  // COMPONENT ACCESS TESTS
  // ===========================================================================

  describe('Component Access', () => {
    it('should expose underlying components', async () => {
      const integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());

      const components = integration.getComponents();

      expect(components.analyzer).toBeDefined();
      expect(components.engine).toBeDefined();

      await integration.dispose();
    });
  });

  // ===========================================================================
  // CLEANUP TESTS
  // ===========================================================================

  describe('dispose()', () => {
    it('should cleanup resources', async () => {
      const integration = new AcousticEngineIntegration();
      await integration.initialize(createMockComponents());
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
      expect(DEFAULT_ACOUSTIC_INTEGRATION_CONFIG.autoUpdateBelief).toBe(true);
      expect(DEFAULT_ACOUSTIC_INTEGRATION_CONFIG.includeNormComparison).toBe(true);
      expect(DEFAULT_ACOUSTIC_INTEGRATION_CONFIG.useEdgeConfig).toBe(false);
    });
  });

  // ===========================================================================
  // BRANCH COVERAGE TESTS
  // ===========================================================================

  describe('Branch Coverage - autoUpdateBelief disabled', () => {
    it('should skip belief update when autoUpdateBelief is false', async () => {
      const integration = new AcousticEngineIntegration({
        autoUpdateBelief: false,
      });
      await integration.initialize(createMockComponents());

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const beliefBefore = integration.getBeliefState('patient_001');
      const historyLengthBefore = beliefBefore?.beliefHistory.length || 0;

      const result = await integration.runPipeline('patient_001', recording, context);

      // Belief should not be updated (history length unchanged)
      expect(result.beliefState).toBeDefined();
      expect(result.beliefState?.beliefHistory.length).toBe(historyLengthBefore);

      await integration.dispose();
    });

    it('should still return analysis and observation when autoUpdateBelief is false', async () => {
      const integration = new AcousticEngineIntegration({
        autoUpdateBelief: false,
      });
      await integration.initialize(createMockComponents());

      const context = createMockContext();
      integration.initializePatient('patient_001', context);
      const recording = createMockRecording();

      const result = await integration.runPipeline('patient_001', recording, context);

      expect(result.analysis).toBeDefined();
      expect(result.observation).toBeDefined();
      expect(result.metadata.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);

      await integration.dispose();
    });
  });

  describe('Branch Coverage - runMultiZonePipeline uninitialized', () => {
    it('should throw if runMultiZonePipeline called before initialization', async () => {
      const integration = new AcousticEngineIntegration();
      const context = createMockContext();

      integration.initializePatient('patient_001', context);

      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      await expect(
        integration.runMultiZonePipeline('patient_001', recordings, context)
      ).rejects.toThrow('Integration not initialized');
    });
  });

  describe('Branch Coverage - analyzeOnly uninitialized', () => {
    it('should throw if analyzeOnly called before initialization', async () => {
      const integration = new AcousticEngineIntegration();
      const recording = createMockRecording();

      await expect(integration.analyzeOnly(recording)).rejects.toThrow(
        'Integration not initialized'
      );
    });
  });
});
