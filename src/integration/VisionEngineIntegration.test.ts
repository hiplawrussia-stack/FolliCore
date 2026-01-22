/**
 * Tests for VisionEngineIntegration
 */

import {
  VisionEngineIntegration,
  createVisionEngineIntegration,
  createMockIntegration,
  type IIntegrationConfig,
  type IIntegrationDependencies,
} from './VisionEngineIntegration';
import {
  type ITrichoscopyImage,
  type IImageEmbedding,
  type ISegmentationResult,
  type IMorphometryResult,
  type IDensityResult,
  type ICycleAnalysis,
} from '../vision/VisionTypes';
import {
  type IFeatureExtractor,
  type ISegmentationModel,
  type IMorphometryHead,
  type IDensityHead,
  type ICycleHead,
} from '../vision/TrichoscopyAnalyzer';
import { type IPatientContext } from '../trichology/domain/TrichologyStates';

describe('VisionEngineIntegration', () => {
  // Mock implementations
  const createMockFeatureExtractor = (): IFeatureExtractor => ({
    extract: jest.fn().mockResolvedValue({
      vector: new Float32Array(1024).fill(0.5),
      dimension: 1024,
      modelVersion: 'dinov2-large',
      extractedAt: new Date(),
    } as IImageEmbedding),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
  });

  const createMockSegmentationModel = (): ISegmentationModel => ({
    segment: jest.fn().mockResolvedValue({
      follicleMasks: ['mask1', 'mask2'],
      scalpMask: 'scalp',
      shaftMasks: ['shaft1', 'shaft2', 'shaft3'],
      roiBounds: { x: 0, y: 0, width: 1000, height: 1000 },
      confidence: 0.9,
    } as ISegmentationResult),
    segmentWithPoints: jest.fn().mockResolvedValue({
      follicleMasks: ['mask1'],
      scalpMask: 'scalp',
      shaftMasks: ['shaft1'],
      roiBounds: { x: 100, y: 100, width: 500, height: 500 },
      confidence: 0.95,
    } as ISegmentationResult),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined),
  });

  const createMockMorphometryHead = (): IMorphometryHead => ({
    extract: jest.fn().mockResolvedValue({
      bulbWidth: 72.5,
      shaftThickness: 32.0,
      bulbWidthStd: 2.0,
      shaftThicknessStd: 1.5,
      sampleSize: 25,
      confidence: 0.85,
    } as IMorphometryResult),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
  });

  const createMockDensityHead = (): IDensityHead => ({
    analyze: jest.fn().mockResolvedValue({
      totalHairCount: 150,
      density: 180,
      follicularUnits: 75,
      fuDistribution: { single: 20, double: 35, triple: 15, quad: 5 },
      analyzedArea: 0.5,
      confidence: 0.88,
    } as IDensityResult),
  });

  const createMockCycleHead = (): ICycleHead => ({
    classify: jest.fn().mockResolvedValue({
      anagenCount: 85,
      catagenCount: 2,
      telogenCount: 13,
      anagenTelogenRatio: 0.87,
      vellusCount: 15,
      terminalCount: 85,
      vellusTerminalRatio: 0.15,
      confidence: 0.82,
    } as ICycleAnalysis),
    isLoaded: jest.fn().mockReturnValue(true),
    load: jest.fn().mockResolvedValue(undefined),
  });

  const createMockDependencies = (): IIntegrationDependencies => ({
    featureExtractor: createMockFeatureExtractor(),
    segmentationModel: createMockSegmentationModel(),
    morphometryHead: createMockMorphometryHead(),
    densityHead: createMockDensityHead(),
    cycleHead: createMockCycleHead(),
  });

  const createMockImage = (zone = 'temporal'): ITrichoscopyImage => ({
    data: 'base64mockdata',
    format: 'png',
    width: 1024,
    height: 768,
    magnification: 50,
    zone: zone as any,
    capturedAt: new Date(),
  });

  const createMockContext = (): IPatientContext => ({
    age: 35,
    gender: 'male',
    chronicStressLevel: 'low',
    medicalHistory: [],
    currentTreatments: [],
    treatmentHistory: [],
  });

  let integration: VisionEngineIntegration;
  const patientId = 'test-patient-001';

  beforeEach(async () => {
    integration = createVisionEngineIntegration();
    await integration.initialize(createMockDependencies());
    integration.initializePatient(patientId, createMockContext());
  });

  afterEach(async () => {
    await integration.dispose();
  });

  describe('initialization', () => {
    it('should create integration with default config', () => {
      const int = createVisionEngineIntegration();
      expect(int).toBeInstanceOf(VisionEngineIntegration);
      expect(int.isReady()).toBe(false);
    });

    it('should create integration via factory function', () => {
      const int = createMockIntegration();
      expect(int).toBeInstanceOf(VisionEngineIntegration);
    });

    it('should accept custom config', () => {
      const config: Partial<IIntegrationConfig> = {
        autoUpdateBelief: false,
        includeStateInference: false,
      };
      const int = createVisionEngineIntegration(config);
      expect(int).toBeInstanceOf(VisionEngineIntegration);
    });

    it('should be ready after initialization', async () => {
      const int = createVisionEngineIntegration();
      expect(int.isReady()).toBe(false);

      await int.initialize(createMockDependencies());
      expect(int.isReady()).toBe(true);

      await int.dispose();
    });

    it('should initialize patient with belief state', () => {
      const _int = createVisionEngineIntegration();
      // Re-use already initialized integration
      const belief = integration.initializePatient('new-patient', createMockContext());

      expect(belief).toBeDefined();
      expect(belief.stateDistribution).toBeDefined();
      expect(belief.confidence).toBe(0);
    });
  });

  describe('runPipeline()', () => {
    it('should throw if not initialized', async () => {
      const uninitializedIntegration = createVisionEngineIntegration();
      await expect(
        uninitializedIntegration.runPipeline(patientId, createMockImage(), createMockContext())
      ).rejects.toThrow('Integration not initialized');
    });

    it('should return complete pipeline result', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.patientId).toBe(patientId);
      expect(result.analysis).toBeDefined();
      expect(result.observation).toBeDefined();
      expect(result.beliefState).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should include state inference when configured', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.stateInference).toBeDefined();
      expect(result.stateInference?.primaryState).toBeDefined();
      expect(result.stateInference?.stateDistribution).toBeInstanceOf(Map);
    });

    it('should exclude state inference when configured', async () => {
      const noInferenceIntegration = createVisionEngineIntegration({
        includeStateInference: false,
      });
      await noInferenceIntegration.initialize(createMockDependencies());
      noInferenceIntegration.initializePatient(patientId, createMockContext());

      const result = await noInferenceIntegration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.stateInference).toBeUndefined();

      await noInferenceIntegration.dispose();
    });

    it('should update belief state when autoUpdateBelief is true', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.beliefState).toBeDefined();
      expect(result.beliefState.confidence).toBeGreaterThan(0);
    });

    it('should not update belief when autoUpdateBelief is false', async () => {
      const noAutoIntegration = createVisionEngineIntegration({
        autoUpdateBelief: false,
      });
      await noAutoIntegration.initialize(createMockDependencies());
      noAutoIntegration.initializePatient(patientId, createMockContext());

      const result = await noAutoIntegration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      // Belief state exists but confidence should be 0 (not updated)
      expect(result.beliefState?.confidence).toBe(0);

      await noAutoIntegration.dispose();
    });

    it('should include treatment recommendation', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.primaryAction).toBeDefined();
      expect(result.recommendation.confidence).toBeGreaterThan(0);
    });

    it('should track processing times', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage(),
        createMockContext()
      );

      expect(result.metadata.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.visionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.engineTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.analysisTimestamp).toBeInstanceOf(Date);
    });

    it('should convert analysis to valid observation', async () => {
      const result = await integration.runPipeline(
        patientId,
        createMockImage('temporal'),
        createMockContext()
      );

      expect(result.observation).toBeDefined();
      expect(result.observation.bulbWidth).toBeGreaterThan(0);
      expect(result.observation.density).toBeGreaterThan(0);
      expect(result.observation.zone).toBe('temporal');
    });
  });

  describe('runBatchPipeline()', () => {
    it('should process multiple images', async () => {
      const images = [
        createMockImage('temporal'),
        createMockImage('parietal'),
      ];

      const result = await integration.runBatchPipeline(patientId, images, createMockContext());

      expect(result.results).toHaveLength(2);
      expect(result.summary.imagesProcessed).toBe(2);
      expect(result.summary.successfulAnalyses).toBe(2);
    });

    it('should return aggregated belief state', async () => {
      const images = [
        createMockImage('temporal'),
        createMockImage('parietal'),
      ];

      const result = await integration.runBatchPipeline(patientId, images, createMockContext());

      expect(result.aggregatedBelief).toBeDefined();
      // After multiple observations, confidence should be higher
      expect(result.aggregatedBelief.confidence).toBeGreaterThan(0);
    });

    it('should return final recommendation', async () => {
      const images = [
        createMockImage('temporal'),
        createMockImage('parietal'),
      ];

      const result = await integration.runBatchPipeline(patientId, images, createMockContext());

      expect(result.finalRecommendation).toBeDefined();
      expect(result.finalRecommendation.primaryAction).toBeDefined();
    });

    it('should track zones analyzed', async () => {
      const images = [
        createMockImage('temporal'),
        createMockImage('parietal'),
      ];

      const result = await integration.runBatchPipeline(patientId, images, createMockContext());

      expect(result.summary.zonesAnalyzed).toContain('temporal');
      expect(result.summary.zonesAnalyzed).toContain('parietal');
      expect(result.summary.zonesAnalyzed).toHaveLength(2);
    });

    it('should calculate average confidence', async () => {
      const images = [
        createMockImage('temporal'),
        createMockImage('parietal'),
      ];

      const result = await integration.runBatchPipeline(patientId, images, createMockContext());

      expect(result.summary.averageConfidence).toBeGreaterThan(0);
      expect(result.summary.averageConfidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty image array', async () => {
      const result = await integration.runBatchPipeline(patientId, [], createMockContext());

      expect(result.results).toHaveLength(0);
      expect(result.summary.imagesProcessed).toBe(0);
      expect(result.summary.successfulAnalyses).toBe(0);
      expect(result.summary.averageConfidence).toBe(0);
    });
  });

  describe('analyzeOnly()', () => {
    it('should analyze without updating belief', async () => {
      const initialBelief = integration.getBeliefState(patientId);

      const result = await integration.analyzeOnly(createMockImage(), createMockContext());

      const afterBelief = integration.getBeliefState(patientId);

      expect(result.analysis).toBeDefined();
      expect(result.observation).toBeDefined();
      expect(result.stateInference).toBeDefined();
      // Belief should not have changed
      expect(afterBelief?.confidence).toBe(initialBelief?.confidence);
    });

    it('should calculate age delta', async () => {
      const result = await integration.analyzeOnly(createMockImage(), createMockContext());

      expect(typeof result.ageDelta).toBe('number');
    });

    it('should calculate progression risk', async () => {
      const result = await integration.analyzeOnly(createMockImage(), createMockContext());

      expect(result.progressionRisk).toBeGreaterThanOrEqual(0);
      expect(result.progressionRisk).toBeLessThanOrEqual(1);
    });

    it('should calculate recovery potential', async () => {
      const result = await integration.analyzeOnly(createMockImage(), createMockContext());

      expect(result.recoveryPotential).toBeGreaterThanOrEqual(0);
      expect(result.recoveryPotential).toBeLessThanOrEqual(1);
    });
  });

  describe('manual operations', () => {
    it('should update belief manually', () => {
      const observation = {
        bulbWidth: 70,
        shaftThickness: 30,
        density: 150,
        follicularUnits: 60,
        anagenTelogenRatio: 0.8,
        vellusTerminalRatio: 0.2,
        zone: 'temporal' as const,
        confidence: 0.85,
      };

      const belief = integration.updateBeliefManual(
        patientId,
        observation,
        createMockContext()
      );

      expect(belief).toBeDefined();
      expect(belief.confidence).toBeGreaterThan(0);
    });

    it('should get recommendation directly', () => {
      // First update belief
      const observation = {
        bulbWidth: 70,
        shaftThickness: 30,
        density: 150,
        follicularUnits: 60,
        anagenTelogenRatio: 0.8,
        vellusTerminalRatio: 0.2,
        zone: 'temporal' as const,
        confidence: 0.85,
      };
      integration.updateBeliefManual(patientId, observation, createMockContext());

      const recommendation = integration.getRecommendation(patientId, createMockContext());

      expect(recommendation).toBeDefined();
      expect(recommendation.primaryAction).toBeDefined();
    });

    it('should predict trajectory', () => {
      // First update belief
      const observation = {
        bulbWidth: 70,
        shaftThickness: 30,
        density: 150,
        follicularUnits: 60,
        anagenTelogenRatio: 0.8,
        vellusTerminalRatio: 0.2,
        zone: 'temporal' as const,
        confidence: 0.85,
      };
      integration.updateBeliefManual(patientId, observation, createMockContext());

      const trajectory = integration.predictTrajectory(patientId, 12);

      expect(trajectory).toBeDefined();
      expect(trajectory.horizon).toBe(12);
      expect(trajectory.trend).toBeDefined();
    });

    it('should record treatment outcome', () => {
      // Should not throw
      expect(() => {
        integration.recordOutcome(patientId, 'MINOXIDIL_5', 'positive');
      }).not.toThrow();
    });
  });

  describe('getComponents()', () => {
    it('should expose underlying components', () => {
      const components = integration.getComponents();

      expect(components.analyzer).toBeDefined();
      expect(components.adapter).toBeDefined();
      expect(components.engine).toBeDefined();
    });
  });

  describe('dispose()', () => {
    it('should cleanup and become not ready', async () => {
      expect(integration.isReady()).toBe(true);

      await integration.dispose();

      expect(integration.isReady()).toBe(false);
    });
  });

  describe('female patient context', () => {
    it('should handle female patient correctly', async () => {
      const femaleContext: IPatientContext = {
        age: 40,
        gender: 'female',
        chronicStressLevel: 'low',
        medicalHistory: [],
        currentTreatments: [],
        treatmentHistory: [],
      };

      integration.initializePatient('female-patient', femaleContext);

      const result = await integration.runPipeline(
        'female-patient',
        createMockImage(),
        femaleContext
      );

      expect(result.recommendation).toBeDefined();
      // Finasteride should not be recommended for females
      const explanation = result.recommendation.explanation;
      expect(explanation.whyNotOthers).toContain('Finasteride excluded: contraindicated for females');
    });
  });

  describe('young patient context', () => {
    it('should handle young patient with higher recovery potential', async () => {
      const youngContext: IPatientContext = {
        age: 25,
        gender: 'male',
        chronicStressLevel: 'low',
        medicalHistory: [],
        currentTreatments: [],
        treatmentHistory: [],
      };

      integration.initializePatient('young-patient', youngContext);

      const result = await integration.analyzeOnly(createMockImage(), youngContext);

      // Young patients should have higher recovery potential
      expect(result.recoveryPotential).toBeGreaterThan(0.5);
    });
  });

  describe('elderly patient context', () => {
    it('should handle elderly patient', async () => {
      const elderlyContext: IPatientContext = {
        age: 70,
        gender: 'male',
        chronicStressLevel: 'low',
        medicalHistory: [],
        currentTreatments: [],
        treatmentHistory: [],
      };

      integration.initializePatient('elderly-patient', elderlyContext);

      const result = await integration.runPipeline(
        'elderly-patient',
        createMockImage(),
        elderlyContext
      );

      expect(result.observation).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('genetic risk factor', () => {
    it('should factor genetic risk into progression', async () => {
      const highRiskContext: IPatientContext = {
        age: 35,
        gender: 'male',
        chronicStressLevel: 'low',
        medicalHistory: [],
        currentTreatments: [],
        treatmentHistory: [],
        geneticRisk: 0.9,
      };

      const lowRiskContext: IPatientContext = {
        age: 35,
        gender: 'male',
        chronicStressLevel: 'low',
        medicalHistory: [],
        currentTreatments: [],
        treatmentHistory: [],
        geneticRisk: 0.1,
      };

      const highRiskResult = await integration.analyzeOnly(createMockImage(), highRiskContext);
      const lowRiskResult = await integration.analyzeOnly(createMockImage(), lowRiskContext);

      expect(highRiskResult.progressionRisk).toBeGreaterThan(lowRiskResult.progressionRisk);
    });
  });
});
