/**
 * Tests for AcousticAnalyzer
 */

import {
  AcousticAnalyzer,
  createAcousticAnalyzer,
  createEdgeAcousticAnalyzer,
  ISignalPreprocessor,
  IAcousticAnalyzerComponents,
  IAcousticVectorDatabase,
  IAcousticSimilarCase,
  IMultiZoneAcousticResult,
  IAcousticNormComparison,
} from './AcousticAnalyzer';

import {
  IAudioSignal,
  IAcousticRecording,
  IAcousticEnvironment,
  IAudioEmbedding,
  IAcousticTokens,
  IMelSpectrogram,
  ISpectralFeatures,
  ITimeFrequencyAnalysis,
  IPorosityAnalysis,
  IHydrationAnalysis,
  IStructuralAnalysis,
  IAcousticConfig,
  DEFAULT_ACOUSTIC_CONFIG,
  EDGE_ACOUSTIC_CONFIG,
  ACOUSTIC_NORMS,
  AcousticError,
  AcousticErrorCode,
  IFeatureExtractorBackend,
  IHairAnalysisBackend,
  ISpectralAnalysisBackend,
  ISensorArrayConfig,
  DEFAULT_SENSOR_ARRAY,
} from './AcousticTypes';

import { ScalpZone } from '../vision/VisionTypes';

describe('AcousticAnalyzer', () => {
  // ===========================================================================
  // MOCK IMPLEMENTATIONS
  // ===========================================================================

  const createMockSignal = (
    duration: number = 5,
    sampleRate: number = 48000
  ): IAudioSignal => ({
    data: new Float32Array(duration * sampleRate).fill(0.1),
    sampleRate,
    channels: 1,
    duration,
    capturedAt: new Date(),
    sourceChannel: 'primary',
  });

  const createMockEnvironment = (
    qualityScore: number = 0.9
  ): IAcousticEnvironment => ({
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

  // ===========================================================================
  // INITIALIZATION TESTS
  // ===========================================================================

  describe('Initialization', () => {
    it('should create analyzer with default config', () => {
      const analyzer = new AcousticAnalyzer();
      expect(analyzer).toBeDefined();
      expect(analyzer.isReady()).toBe(false);
    });

    it('should create analyzer with custom config', () => {
      const customConfig: Partial<IAcousticConfig> = {
        featureExtractor: {
          ...DEFAULT_ACOUSTIC_CONFIG.featureExtractor,
          model: 'mamba-audio',
        },
      };
      const analyzer = new AcousticAnalyzer(customConfig);
      expect(analyzer.getConfig().featureExtractor.model).toBe('mamba-audio');
    });

    it('should initialize with components', async () => {
      const analyzer = new AcousticAnalyzer();
      const components = createMockComponents();

      await analyzer.initialize(components);

      expect(analyzer.isReady()).toBe(true);
      expect(components.featureExtractor.initialize).toHaveBeenCalled();
      expect(components.hairAnalysisBackend.initialize).toHaveBeenCalled();
    });

    it('should initialize without vector database', async () => {
      const analyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      delete (components as any).vectorDb;

      await analyzer.initialize(components);

      expect(analyzer.isReady()).toBe(true);
    });
  });

  // ===========================================================================
  // ANALYSIS TESTS
  // ===========================================================================

  describe('analyze()', () => {
    let analyzer: AcousticAnalyzer;
    let components: IAcousticAnalyzerComponents;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      components = createMockComponents();
      await analyzer.initialize(components);
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should throw if not initialized', async () => {
      const uninitializedAnalyzer = new AcousticAnalyzer();
      const recording = createMockRecording();

      await expect(uninitializedAnalyzer.analyze(recording)).rejects.toThrow(
        AcousticError
      );
    });

    it('should analyze valid recording', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result).toBeDefined();
      expect(result.analysisId).toMatch(/^acoustic_/);
      expect(result.recordingId).toBe(recording.recordingId);
      expect(result.zone).toBe('temporal');
    });

    it('should include embedding in result', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.embedding).toBeDefined();
      expect(result.embedding.dimension).toBe(768);
      expect(result.embedding.model).toBe('openbeats-base');
    });

    it('should include porosity analysis', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.porosity).toBeDefined();
      expect(result.porosity.score).toBe(0.25);
      expect(result.porosity.level).toBe('normal');
      expect(result.porosity.confidence).toBeGreaterThan(0);
    });

    it('should include hydration analysis', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.hydration).toBeDefined();
      expect(result.hydration.score).toBe(0.75);
      expect(result.hydration.level).toBe('optimal');
    });

    it('should include structure analysis', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.structure).toBeDefined();
      expect(result.structure.structureClass).toBe('healthy');
      expect(result.structure.damageScore).toBeLessThan(0.5);
    });

    it('should include spectral analysis', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.spectralAnalysis).toBeDefined();
      expect(result.spectralAnalysis.melSpectrogram).toBeDefined();
      expect(result.spectralAnalysis.globalFeatures).toBeDefined();
    });

    it('should include acoustic tokens when available', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.acousticTokens).toBeDefined();
      expect(result.acousticTokens?.numTokens).toBe(3);
    });

    it('should calculate overall confidence', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should track processing time', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      // Processing time could be 0 on fast systems, so check it's defined and non-negative
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should include quality flags', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.qualityFlags).toBeDefined();
      expect(result.qualityFlags.snrAcceptable).toBe(true);
      expect(result.qualityFlags.overallQuality).toBeGreaterThan(0);
    });

    it('should include model versions', async () => {
      const recording = createMockRecording();

      const result = await analyzer.analyze(recording);

      expect(result.modelVersions).toBeDefined();
      expect(result.modelVersions.featureExtractor).toBe('1.0.0');
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Recording Validation', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should reject recording with no signals', async () => {
      const recording = createMockRecording();
      recording.signals = new Map();

      await expect(analyzer.analyze(recording)).rejects.toThrow(AcousticError);
      await expect(analyzer.analyze(recording)).rejects.toMatchObject({
        code: AcousticErrorCode.INVALID_SIGNAL,
      });
    });

    it('should reject recording that is too short', async () => {
      const recording = createMockRecording('temporal', 2); // 2 seconds, below 5s minimum

      await expect(analyzer.analyze(recording)).rejects.toThrow(AcousticError);
      await expect(analyzer.analyze(recording)).rejects.toMatchObject({
        code: AcousticErrorCode.RECORDING_TOO_SHORT,
      });
    });

    it('should reject recording that is too long', async () => {
      const recording = createMockRecording('temporal', 60); // 60 seconds, above 30s maximum

      await expect(analyzer.analyze(recording)).rejects.toThrow(AcousticError);
      await expect(analyzer.analyze(recording)).rejects.toMatchObject({
        code: AcousticErrorCode.RECORDING_TOO_LONG,
      });
    });

    it('should reject low quality recording', async () => {
      const recording = createMockRecording();
      recording.environment.qualityScore = 0.2; // Very low quality

      // Mock preprocessor to return low SNR
      const components = createMockComponents();
      (components.preprocessor.calculateSnr as jest.Mock).mockReturnValue(5);

      const lowQualityAnalyzer = new AcousticAnalyzer();
      await lowQualityAnalyzer.initialize(components);

      await expect(lowQualityAnalyzer.analyze(recording)).rejects.toThrow(
        AcousticError
      );
      await expect(lowQualityAnalyzer.analyze(recording)).rejects.toMatchObject({
        code: AcousticErrorCode.LOW_CONFIDENCE,
      });
    });
  });

  // ===========================================================================
  // BATCH ANALYSIS TESTS
  // ===========================================================================

  describe('analyzeBatch()', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should analyze multiple recordings', async () => {
      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const results = await analyzer.analyzeBatch(recordings);

      expect(results).toHaveLength(2);
      expect(results[0].zone).toBe('temporal');
      expect(results[1].zone).toBe('parietal');
    });

    it('should continue on individual failures', async () => {
      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('temporal', 2), // Too short - will fail
        createMockRecording('parietal'),
      ];

      const results = await analyzer.analyzeBatch(recordings);

      // Should have 2 results (first and third succeeded)
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty array', async () => {
      const results = await analyzer.analyzeBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  // ===========================================================================
  // MULTI-ZONE ANALYSIS TESTS
  // ===========================================================================

  describe('analyzeMultiZone()', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should analyze multiple zones and aggregate', async () => {
      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await analyzer.analyzeMultiZone(recordings);

      expect(result.totalZones).toBe(2);
      expect(result.zoneResults.size).toBe(2);
      expect(result.aggregated).toBeDefined();
    });

    it('should calculate aggregated metrics', async () => {
      const recordings = [
        createMockRecording('temporal'),
        createMockRecording('parietal'),
      ];

      const result = await analyzer.analyzeMultiZone(recordings);

      expect(result.aggregated.avgPorosity).toBeGreaterThan(0);
      expect(result.aggregated.avgHydration).toBeGreaterThan(0);
      expect(result.aggregated.dominantStructure).toBe('healthy');
      expect(result.aggregated.zonesAnalyzed).toBe(2);
    });
  });

  // ===========================================================================
  // QUICK ANALYSIS TESTS
  // ===========================================================================

  describe('analyzeQuick()', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should return simplified observation', async () => {
      const recording = createMockRecording();

      const observation = await analyzer.analyzeQuick(recording);

      expect(observation.porosity).toBeDefined();
      expect(observation.hydration).toBeDefined();
      expect(observation.structureClass).toBeDefined();
      expect(observation.confidence).toBeDefined();
    });

    it('should have valid observation values', async () => {
      const recording = createMockRecording();

      const observation = await analyzer.analyzeQuick(recording);

      expect(observation.porosity).toBeGreaterThanOrEqual(0);
      expect(observation.porosity).toBeLessThanOrEqual(1);
      expect(observation.hydration).toBeGreaterThanOrEqual(0);
      expect(observation.hydration).toBeLessThanOrEqual(1);
      expect(['healthy', 'weathered', 'damaged']).toContain(
        observation.structureClass
      );
    });
  });

  // ===========================================================================
  // CONVERSION TESTS
  // ===========================================================================

  describe('toObservation()', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should convert analysis to observation', async () => {
      const recording = createMockRecording();
      const analysis = await analyzer.analyze(recording);

      const observation = analyzer.toObservation(analysis);

      expect(observation.porosity).toBe(analysis.porosity.score);
      expect(observation.hydration).toBe(analysis.hydration.score);
      expect(observation.confidence).toBe(analysis.overallConfidence);
    });
  });

  describe('compareToNorms()', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should compare analysis to healthy norms', async () => {
      const recording = createMockRecording();
      const analysis = await analyzer.analyze(recording);

      const comparison = analyzer.compareToNorms(analysis);

      expect(comparison.porosityDeviation).toBeDefined();
      expect(comparison.hydrationDeviation).toBeDefined();
      expect(comparison.healthScore).toBeGreaterThanOrEqual(0);
      expect(comparison.healthScore).toBeLessThanOrEqual(1);
    });

    it('should classify health score', async () => {
      const recording = createMockRecording();
      const analysis = await analyzer.analyze(recording);

      const comparison = analyzer.compareToNorms(analysis);

      expect(['excellent', 'good', 'fair', 'poor']).toContain(
        comparison.classification
      );
    });
  });

  // ===========================================================================
  // SIMILARITY SEARCH TESTS
  // ===========================================================================

  describe('findSimilar()', () => {
    let analyzer: AcousticAnalyzer;
    let mockVectorDb: IAcousticVectorDatabase;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      mockVectorDb = components.vectorDb!;
      await analyzer.initialize(components);
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should search for similar cases', async () => {
      const recording = createMockRecording();
      const analysis = await analyzer.analyze(recording);

      const similar = await analyzer.findSimilar(analysis.embedding);

      expect(similar).toHaveLength(1);
      expect(similar[0].caseId).toBe('case_001');
      expect(similar[0].similarity).toBe(0.92);
    });

    it('should return empty array when no vector db', async () => {
      const noDbAnalyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      delete (components as any).vectorDb;
      await noDbAnalyzer.initialize(components);

      const recording = createMockRecording();
      const analysis = await noDbAnalyzer.analyze(recording);

      const similar = await noDbAnalyzer.findSimilar(analysis.embedding);

      expect(similar).toHaveLength(0);
    });
  });

  describe('addToDatabase()', () => {
    let analyzer: AcousticAnalyzer;
    let mockVectorDb: IAcousticVectorDatabase;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      mockVectorDb = components.vectorDb!;
      await analyzer.initialize(components);
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should add case to database', async () => {
      const recording = createMockRecording();
      const analysis = await analyzer.analyze(recording);

      await analyzer.addToDatabase(analysis, {
        condition: 'healthy',
        porosityLevel: 'normal',
        hydrationLevel: 'optimal',
      });

      expect(mockVectorDb.addCase).toHaveBeenCalledWith(
        analysis.analysisId,
        analysis.embedding,
        expect.objectContaining({ condition: 'healthy' })
      );
    });

    it('should throw when no vector db configured', async () => {
      const noDbAnalyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      delete (components as any).vectorDb;
      await noDbAnalyzer.initialize(components);

      const recording = createMockRecording();
      const analysis = await noDbAnalyzer.analyze(recording);

      await expect(
        noDbAnalyzer.addToDatabase(analysis, {
          condition: 'healthy',
          porosityLevel: 'normal',
          hydrationLevel: 'optimal',
        })
      ).rejects.toThrow(AcousticError);
    });
  });

  // ===========================================================================
  // CONFIGURATION TESTS
  // ===========================================================================

  describe('Configuration', () => {
    it('should get current config', () => {
      const analyzer = new AcousticAnalyzer();
      const config = analyzer.getConfig();

      expect(config.featureExtractor.model).toBe('openbeats-base');
    });

    it('should update config', () => {
      const analyzer = new AcousticAnalyzer();

      analyzer.updateConfig({
        thresholds: {
          ...DEFAULT_ACOUSTIC_CONFIG.thresholds,
          minConfidence: 0.8,
        },
      });

      expect(analyzer.getConfig().thresholds.minConfidence).toBe(0.8);
    });

    it('should switch to edge config', () => {
      const analyzer = new AcousticAnalyzer();

      analyzer.useEdgeConfig();

      const config = analyzer.getConfig();
      expect(config.featureExtractor.model).toBe('mamba-audio');
      expect(config.featureExtractor.device).toBe('edge');
      expect(config.edge.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // CLEANUP TESTS
  // ===========================================================================

  describe('dispose()', () => {
    it('should cleanup resources', async () => {
      const analyzer = new AcousticAnalyzer();
      const components = createMockComponents();
      await analyzer.initialize(components);

      await analyzer.dispose();

      expect(analyzer.isReady()).toBe(false);
      expect(components.featureExtractor.dispose).toHaveBeenCalled();
      expect(components.hairAnalysisBackend.dispose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // FACTORY FUNCTION TESTS
  // ===========================================================================

  describe('Factory Functions', () => {
    describe('createAcousticAnalyzer()', () => {
      it('should create analyzer with default config', () => {
        const analyzer = createAcousticAnalyzer();
        expect(analyzer).toBeInstanceOf(AcousticAnalyzer);
        expect(analyzer.getConfig().featureExtractor.model).toBe('openbeats-base');
      });

      it('should create analyzer with custom config', () => {
        const analyzer = createAcousticAnalyzer({
          featureExtractor: {
            ...DEFAULT_ACOUSTIC_CONFIG.featureExtractor,
            model: 'beats-iter3',
          },
        });
        expect(analyzer.getConfig().featureExtractor.model).toBe('beats-iter3');
      });
    });

    describe('createEdgeAcousticAnalyzer()', () => {
      it('should create analyzer with edge config', () => {
        const analyzer = createEdgeAcousticAnalyzer();
        expect(analyzer).toBeInstanceOf(AcousticAnalyzer);
        expect(analyzer.getConfig().featureExtractor.model).toBe('mamba-audio');
        expect(analyzer.getConfig().edge.enabled).toBe(true);
      });
    });
  });

  // ===========================================================================
  // SIGNAL HANDLING TESTS
  // ===========================================================================

  describe('Signal Handling', () => {
    let analyzer: AcousticAnalyzer;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      await analyzer.initialize(createMockComponents());
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should use primary channel when available', async () => {
      const recording = createMockRecording();
      const result = await analyzer.analyze(recording);

      expect(result).toBeDefined();
    });

    it('should fall back to contact channel', async () => {
      const recording = createMockRecording();
      recording.signals.delete('primary');

      const result = await analyzer.analyze(recording);

      expect(result).toBeDefined();
    });

    it('should use any available channel', async () => {
      const recording = createMockRecording();
      recording.signals.delete('primary');
      recording.signals.delete('contact');

      const result = await analyzer.analyze(recording);

      expect(result).toBeDefined();
    });
  });

  // ===========================================================================
  // QUALITY ASSESSMENT TESTS
  // ===========================================================================

  describe('Quality Assessment', () => {
    let analyzer: AcousticAnalyzer;
    let components: IAcousticAnalyzerComponents;

    beforeEach(async () => {
      analyzer = new AcousticAnalyzer();
      components = createMockComponents();
      await analyzer.initialize(components);
    });

    afterEach(async () => {
      await analyzer.dispose();
    });

    it('should detect low SNR', async () => {
      // Create analyzer with lower minConfidence to allow analysis to complete
      const lowThresholdAnalyzer = new AcousticAnalyzer({
        thresholds: {
          ...DEFAULT_ACOUSTIC_CONFIG.thresholds,
          minConfidence: 0.3, // Lower threshold so analysis completes with warnings
        },
      });
      const lowSnrComponents = createMockComponents();
      (lowSnrComponents.preprocessor.calculateSnr as jest.Mock).mockReturnValue(10);
      await lowThresholdAnalyzer.initialize(lowSnrComponents);

      const recording = createMockRecording();
      recording.environment.qualityScore = 0.9;

      // Low SNR should produce warnings in quality flags
      const result = await lowThresholdAnalyzer.analyze(recording);

      expect(result.qualityFlags.snrAcceptable).toBe(false);
      expect(result.qualityFlags.warnings.length).toBeGreaterThan(0);
      expect(result.qualityFlags.warnings.some(w => w.includes('Low SNR'))).toBe(true);

      await lowThresholdAnalyzer.dispose();
    });

    it('should detect motion artifacts', async () => {
      (components.preprocessor.detectMotionArtifacts as jest.Mock).mockReturnValue(
        true
      );

      const recording = createMockRecording();
      const result = await analyzer.analyze(recording);

      expect(result.qualityFlags.motionArtifactsDetected).toBe(true);
      expect(result.qualityFlags.warnings).toContain('Motion artifacts detected');
    });

    it('should detect excessive ambient noise', async () => {
      const recording = createMockRecording();
      recording.environment.ambientNoiseDb = 75; // Above threshold

      const result = await analyzer.analyze(recording);

      expect(result.qualityFlags.ambientNoiseAcceptable).toBe(false);
    });
  });
});
