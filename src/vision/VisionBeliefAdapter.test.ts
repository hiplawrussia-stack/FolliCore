/**
 * Tests for VisionBeliefAdapter
 */

import {
  VisionBeliefAdapter,
  createVisionBeliefAdapter,
  DEFAULT_ADAPTER_CONFIG,
  IVisionAdapterConfig,
} from './VisionBeliefAdapter';
import {
  ITrichoscopyAnalysis,
  IImageEmbedding,
  IMorphometryResult,
  IDensityResult,
  ICycleAnalysis,
  ISegmentationResult,
} from './VisionTypes';
import { IPatientContext, FollicleState } from '../trichology/domain/TrichologyStates';

describe('VisionBeliefAdapter', () => {
  let adapter: VisionBeliefAdapter;

  const createMockAnalysis = (overrides: Partial<{
    confidence: number;
    bulbWidth: number;
    shaftThickness: number;
    density: number;
    anagenTelogenRatio: number;
    vellusTerminalRatio: number;
    zone: string;
  }> = {}): ITrichoscopyAnalysis => {
    const embedding: IImageEmbedding = {
      vector: new Float32Array(1024).fill(0.5),
      dimension: 1024,
      modelVersion: 'dinov2-large',
      extractedAt: new Date(),
    };

    const morphometry: IMorphometryResult = {
      bulbWidth: overrides.bulbWidth ?? 72.5,
      shaftThickness: overrides.shaftThickness ?? 32.0,
      bulbWidthStd: 2.0,
      shaftThicknessStd: 1.5,
      sampleSize: 25,
      confidence: 0.85,
    };

    const density: IDensityResult = {
      totalHairCount: 150,
      density: overrides.density ?? 180,
      follicularUnits: 75,
      fuDistribution: { single: 20, double: 35, triple: 15, quad: 5 },
      analyzedArea: 0.5,
      confidence: 0.88,
    };

    const cycleAnalysis: ICycleAnalysis = {
      anagenCount: 85,
      catagenCount: 2,
      telogenCount: 13,
      anagenTelogenRatio: overrides.anagenTelogenRatio ?? 0.87,
      vellusCount: 15,
      terminalCount: 85,
      vellusTerminalRatio: overrides.vellusTerminalRatio ?? 0.15,
      confidence: 0.82,
    };

    const segmentation: ISegmentationResult = {
      follicleMasks: ['mask1', 'mask2'],
      scalpMask: 'scalp',
      shaftMasks: ['shaft1', 'shaft2'],
      roiBounds: { x: 0, y: 0, width: 1000, height: 1000 },
      confidence: 0.9,
    };

    return {
      analysisId: 'test_analysis_1',
      imageId: 'test_image_1',
      zone: (overrides.zone ?? 'temporal') as any,
      analyzedAt: new Date(),
      embedding,
      morphometry,
      density,
      cycleAnalysis,
      segmentation,
      overallConfidence: overrides.confidence ?? 0.85,
      processingTimeMs: 250,
      modelVersions: {
        featureExtractor: 'dinov2-large',
        morphometryHead: 'v1.0.0',
        segmentationModel: 'medsam',
      },
    };
  };

  const createMockContext = (overrides: Partial<IPatientContext> = {}): IPatientContext => ({
    age: overrides.age ?? 35,
    gender: overrides.gender ?? 'male',
    chronicStressLevel: overrides.chronicStressLevel ?? 'low',
    geneticRisk: overrides.geneticRisk,
    medicalHistory: overrides.medicalHistory ?? [],
    currentTreatments: overrides.currentTreatments ?? [],
    treatmentHistory: overrides.treatmentHistory ?? [],
  });

  beforeEach(() => {
    adapter = createVisionBeliefAdapter();
  });

  describe('initialization', () => {
    it('should create adapter with default config', () => {
      const ad = new VisionBeliefAdapter();
      expect(ad).toBeInstanceOf(VisionBeliefAdapter);
    });

    it('should create adapter via factory function', () => {
      const ad = createVisionBeliefAdapter();
      expect(ad).toBeInstanceOf(VisionBeliefAdapter);
    });

    it('should accept custom config', () => {
      const config: Partial<IVisionAdapterConfig> = {
        minConfidence: 0.8,
        similarCaseWeight: 0.5,
      };
      const ad = createVisionBeliefAdapter(config);
      expect(ad).toBeInstanceOf(VisionBeliefAdapter);
    });
  });

  describe('DEFAULT_ADAPTER_CONFIG', () => {
    it('should have reasonable minConfidence', () => {
      expect(DEFAULT_ADAPTER_CONFIG.minConfidence).toBe(0.5);
    });

    it('should have similarCaseWeight', () => {
      expect(DEFAULT_ADAPTER_CONFIG.similarCaseWeight).toBe(0.3);
    });

    it('should enable PGMU normalization', () => {
      expect(DEFAULT_ADAPTER_CONFIG.normalizeByPGMU).toBe(true);
    });
  });

  describe('toObservation()', () => {
    it('should convert analysis to IFollicleObservation', () => {
      const analysis = createMockAnalysis();
      const context = createMockContext();

      const observation = adapter.toObservation(analysis, context);

      expect(observation).not.toBeNull();
      expect(observation!.bulbWidth).toBeGreaterThan(0);
      expect(observation!.shaftThickness).toBeGreaterThan(0);
      expect(observation!.density).toBeGreaterThan(0);
      expect(observation!.zone).toBeDefined();
      expect(observation!.confidence).toBeGreaterThan(0);
    });

    it('should return null for low confidence analysis', () => {
      const lowConfidenceAdapter = createVisionBeliefAdapter({ minConfidence: 0.9 });
      const analysis = createMockAnalysis({ confidence: 0.5 });
      const context = createMockContext();

      const observation = lowConfidenceAdapter.toObservation(analysis, context);

      expect(observation).toBeNull();
    });

    it('should map valid zones correctly', () => {
      const temporalAnalysis = createMockAnalysis({ zone: 'temporal' });
      const parietalAnalysis = createMockAnalysis({ zone: 'parietal' });

      const obs1 = adapter.toObservation(temporalAnalysis, createMockContext());
      const obs2 = adapter.toObservation(parietalAnalysis, createMockContext());

      expect(obs1!.zone).toBe('temporal');
      expect(obs2!.zone).toBe('parietal');
    });

    it('should include cycle analysis ratios', () => {
      const analysis = createMockAnalysis({
        anagenTelogenRatio: 0.85,
        vellusTerminalRatio: 0.2,
      });

      const observation = adapter.toObservation(analysis, createMockContext());

      expect(observation!.anagenTelogenRatio).toBe(0.85);
      expect(observation!.vellusTerminalRatio).toBe(0.2);
    });

    it('should include density metrics', () => {
      const analysis = createMockAnalysis({ density: 200 });
      const observation = adapter.toObservation(analysis, createMockContext());

      expect(observation!.density).toBe(200);
      expect(observation!.follicularUnits).toBeGreaterThan(0);
    });
  });

  describe('toObservations() - batch conversion', () => {
    it('should convert multiple analyses', () => {
      const analyses = [
        createMockAnalysis({ zone: 'temporal' }),
        createMockAnalysis({ zone: 'parietal' }),
      ];
      const context = createMockContext();

      const observations = adapter.toObservations(analyses, context);

      expect(observations).toHaveLength(2);
    });

    it('should filter out low confidence analyses', () => {
      const strictAdapter = createVisionBeliefAdapter({ minConfidence: 0.8 });
      const analyses = [
        createMockAnalysis({ confidence: 0.9 }),
        createMockAnalysis({ confidence: 0.5 }),
        createMockAnalysis({ confidence: 0.85 }),
      ];

      const observations = strictAdapter.toObservations(analyses, createMockContext());

      expect(observations).toHaveLength(2);
    });
  });

  describe('inferState()', () => {
    it('should return state inference with distribution', () => {
      const analysis = createMockAnalysis();
      const inference = adapter.inferState(analysis, createMockContext());

      expect(inference.primaryState).toBeDefined();
      expect(inference.stateDistribution).toBeInstanceOf(Map);
      expect(inference.confidence).toBeGreaterThan(0);
      expect(inference.factors).toBeInstanceOf(Array);
    });

    it('should infer HEALTHY_ANAGEN for good metrics', () => {
      const healthyAnalysis = createMockAnalysis({
        vellusTerminalRatio: 0.1,
        anagenTelogenRatio: 0.9,
        density: 200,
        bulbWidth: 74,
      });

      const inference = adapter.inferState(healthyAnalysis, createMockContext({ age: 28 }));

      const healthyProb = inference.stateDistribution.get(FollicleState.HEALTHY_ANAGEN) || 0;
      expect(healthyProb).toBeGreaterThan(0.2);
    });

    it('should infer EARLY_MINIATURIZATION for elevated V/T ratio', () => {
      const analysis = createMockAnalysis({
        vellusTerminalRatio: 0.25,
        anagenTelogenRatio: 0.75,
      });

      const inference = adapter.inferState(analysis, createMockContext());

      const earlyMiniProb = inference.stateDistribution.get(FollicleState.EARLY_MINIATURIZATION) || 0;
      expect(earlyMiniProb).toBeGreaterThan(0.1);
    });

    it('should infer STRESS_INDUCED for low A/T ratio', () => {
      const analysis = createMockAnalysis({
        vellusTerminalRatio: 0.15,
        anagenTelogenRatio: 0.35,
      });

      const inference = adapter.inferState(analysis, createMockContext());

      const stressProb = inference.stateDistribution.get(FollicleState.STRESS_INDUCED) || 0;
      expect(stressProb).toBeGreaterThan(0.1);
    });

    it('should include explanatory factors', () => {
      const analysis = createMockAnalysis({ vellusTerminalRatio: 0.3 });
      const inference = adapter.inferState(analysis, createMockContext());

      expect(inference.factors.length).toBeGreaterThan(0);
      expect(inference.factors.some(f => f.toLowerCase().includes('miniaturization'))).toBe(true);
    });

    it('should consider patient age in state inference', () => {
      const analysis = createMockAnalysis({ bulbWidth: 68 });

      const youngInference = adapter.inferState(analysis, createMockContext({ age: 25 }));
      const oldInference = adapter.inferState(analysis, createMockContext({ age: 70 }));

      // Same bulb width should be interpreted differently for different ages
      expect(youngInference.factors).not.toEqual(oldInference.factors);
    });

    it('should have state distribution sum to 1', () => {
      const analysis = createMockAnalysis();
      const inference = adapter.inferState(analysis, createMockContext());

      let sum = 0;
      inference.stateDistribution.forEach(prob => {
        sum += prob;
      });

      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('calculateAgeDelta()', () => {
    it('should return positive delta for below-norm bulb width', () => {
      const analysis = createMockAnalysis({ bulbWidth: 68, zone: 'parietal' });
      const context = createMockContext({ age: 30, gender: 'male' });

      const delta = adapter.calculateAgeDelta(analysis, context);

      expect(delta).toBeGreaterThan(0); // Accelerated aging
    });

    it('should return negative delta for above-norm bulb width', () => {
      const analysis = createMockAnalysis({ bulbWidth: 76, zone: 'parietal' });
      const context = createMockContext({ age: 30, gender: 'male' });

      const delta = adapter.calculateAgeDelta(analysis, context);

      expect(delta).toBeLessThan(0); // Youthful
    });

    it('should return near-zero for age-appropriate values', () => {
      const analysis = createMockAnalysis({ bulbWidth: 74.6, zone: 'parietal' });
      const context = createMockContext({ age: 28, gender: 'male' });

      const delta = adapter.calculateAgeDelta(analysis, context);

      expect(Math.abs(delta)).toBeLessThan(5);
    });

    it('should handle temporal zone differently', () => {
      const temporalAnalysis = createMockAnalysis({ bulbWidth: 72, zone: 'temporal' });
      const parietalAnalysis = createMockAnalysis({ bulbWidth: 72, zone: 'parietal' });
      const context = createMockContext({ age: 30, gender: 'male' });

      const temporalDelta = adapter.calculateAgeDelta(temporalAnalysis, context);
      const parietalDelta = adapter.calculateAgeDelta(parietalAnalysis, context);

      // Same bulb width, different zones = different deltas
      expect(temporalDelta).not.toBe(parietalDelta);
    });
  });

  describe('calculateProgressionRisk()', () => {
    it('should return low risk for healthy metrics', () => {
      const analysis = createMockAnalysis({
        vellusTerminalRatio: 0.1,
        anagenTelogenRatio: 0.9,
        density: 200,
      });
      const context = createMockContext({ age: 25, geneticRisk: 0.2 });

      const risk = adapter.calculateProgressionRisk(analysis, context);

      expect(risk).toBeLessThan(0.4);
    });

    it('should return higher risk for elevated V/T ratio', () => {
      const analysis = createMockAnalysis({ vellusTerminalRatio: 0.4 });
      const risk = adapter.calculateProgressionRisk(analysis, createMockContext());

      expect(risk).toBeGreaterThan(0.3);
    });

    it('should return higher risk for low A/T ratio', () => {
      const analysis = createMockAnalysis({ anagenTelogenRatio: 0.4 });
      const risk = adapter.calculateProgressionRisk(analysis, createMockContext());

      expect(risk).toBeGreaterThan(0.3);
    });

    it('should consider genetic risk', () => {
      const analysis = createMockAnalysis();
      const lowGeneticRisk = adapter.calculateProgressionRisk(
        analysis,
        createMockContext({ geneticRisk: 0.1 })
      );
      const highGeneticRisk = adapter.calculateProgressionRisk(
        analysis,
        createMockContext({ geneticRisk: 0.9 })
      );

      expect(highGeneticRisk).toBeGreaterThan(lowGeneticRisk);
    });

    it('should consider age', () => {
      const analysis = createMockAnalysis();
      const youngRisk = adapter.calculateProgressionRisk(
        analysis,
        createMockContext({ age: 25 })
      );
      const oldRisk = adapter.calculateProgressionRisk(
        analysis,
        createMockContext({ age: 60 })
      );

      expect(oldRisk).toBeGreaterThan(youngRisk);
    });

    it('should cap risk at 1.0', () => {
      const badAnalysis = createMockAnalysis({
        vellusTerminalRatio: 0.8,
        anagenTelogenRatio: 0.2,
        density: 50,
      });
      const context = createMockContext({ age: 70, geneticRisk: 1.0 });

      const risk = adapter.calculateProgressionRisk(badAnalysis, context);

      expect(risk).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateRecoveryPotential()', () => {
    it('should return higher potential for young patients', () => {
      const analysis = createMockAnalysis();
      const youngPotential = adapter.calculateRecoveryPotential(
        analysis,
        createMockContext({ age: 25 })
      );
      const oldPotential = adapter.calculateRecoveryPotential(
        analysis,
        createMockContext({ age: 60 })
      );

      expect(youngPotential).toBeGreaterThan(oldPotential);
    });

    it('should return higher potential for good anagen ratio', () => {
      const goodAnagen = createMockAnalysis({ anagenTelogenRatio: 0.9 });
      const badAnagen = createMockAnalysis({ anagenTelogenRatio: 0.4 });

      const goodPotential = adapter.calculateRecoveryPotential(goodAnagen, createMockContext());
      const badPotential = adapter.calculateRecoveryPotential(badAnagen, createMockContext());

      expect(goodPotential).toBeGreaterThan(badPotential);
    });

    it('should return higher potential for low miniaturization', () => {
      const lowMini = createMockAnalysis({ vellusTerminalRatio: 0.1 });
      const highMini = createMockAnalysis({ vellusTerminalRatio: 0.5 });

      const lowPotential = adapter.calculateRecoveryPotential(lowMini, createMockContext());
      const highPotential = adapter.calculateRecoveryPotential(highMini, createMockContext());

      expect(lowPotential).toBeGreaterThan(highPotential);
    });

    it('should cap potential at 1.0', () => {
      const optimalAnalysis = createMockAnalysis({
        vellusTerminalRatio: 0.05,
        anagenTelogenRatio: 0.95,
      });
      const context = createMockContext({ age: 20 });

      const potential = adapter.calculateRecoveryPotential(optimalAnalysis, context);

      expect(potential).toBeLessThanOrEqual(1);
    });
  });

  describe('integration with similar cases', () => {
    it('should incorporate similar cases in state inference', () => {
      const analysis = createMockAnalysis();
      analysis.similarCases = [
        { caseId: 'case1', similarity: 0.9, diagnosis: 'early_aga' },
        { caseId: 'case2', similarity: 0.85, diagnosis: 'early_aga' },
      ];

      const inference = adapter.inferState(analysis, createMockContext());

      expect(inference.factors.some(f => f.toLowerCase().includes('similar'))).toBe(true);
    });
  });

  describe('edge case coverage', () => {
    it('should infer TERMINAL state for very high V/T ratio (>0.5)', () => {
      const analysis = createMockAnalysis({ vellusTerminalRatio: 0.6 });
      const inference = adapter.inferState(analysis, createMockContext());

      const terminalProb = inference.stateDistribution.get(FollicleState.TERMINAL) || 0;
      expect(terminalProb).toBeGreaterThan(0);
      expect(inference.factors.some(f => f.toLowerCase().includes('terminal'))).toBe(true);
    });

    it('should infer ADVANCED_MINIATURIZATION for high V/T ratio (0.3-0.5)', () => {
      const analysis = createMockAnalysis({ vellusTerminalRatio: 0.4 });
      const inference = adapter.inferState(analysis, createMockContext());

      const advancedProb = inference.stateDistribution.get(FollicleState.ADVANCED_MINIATURIZATION) || 0;
      expect(advancedProb).toBeGreaterThan(0);
      expect(inference.factors.some(f => f.toLowerCase().includes('advanced'))).toBe(true);
    });

    it('should handle very low A/T ratio (<0.4)', () => {
      const analysis = createMockAnalysis({ anagenTelogenRatio: 0.3 });
      const inference = adapter.inferState(analysis, createMockContext());

      expect(inference.factors.some(f => f.toLowerCase().includes('significant shedding'))).toBe(true);
    });

    it('should handle moderate A/T ratio (0.6-0.8)', () => {
      const analysis = createMockAnalysis({ anagenTelogenRatio: 0.7 });
      const inference = adapter.inferState(analysis, createMockContext());

      const catagenProb = inference.stateDistribution.get(FollicleState.HEALTHY_CATAGEN) || 0;
      const telogenProb = inference.stateDistribution.get(FollicleState.HEALTHY_TELOGEN) || 0;
      expect(catagenProb + telogenProb).toBeGreaterThan(0);
    });

    it('should handle bulb width above age norm', () => {
      const analysis = createMockAnalysis({ bulbWidth: 78, zone: 'parietal' });
      const inference = adapter.inferState(analysis, createMockContext({ age: 30, gender: 'male' }));

      expect(inference.factors.some(f => f.toLowerCase().includes('above age norm'))).toBe(true);
    });

    it('should handle bulb width slightly below age norm', () => {
      const analysis = createMockAnalysis({ bulbWidth: 71, zone: 'parietal' });
      const inference = adapter.inferState(analysis, createMockContext({ age: 30, gender: 'male' }));

      expect(inference.factors.some(f => f.toLowerCase().includes('slightly below'))).toBe(true);
    });

    it('should handle bulb width significantly below age norm (senile)', () => {
      const analysis = createMockAnalysis({ bulbWidth: 65, zone: 'parietal' });
      const inference = adapter.inferState(analysis, createMockContext({ age: 30, gender: 'male' }));

      const senileProb = inference.stateDistribution.get(FollicleState.SENILE_ALOPECIA) || 0;
      expect(senileProb).toBeGreaterThan(0);
      expect(inference.factors.some(f => f.toLowerCase().includes('significantly below'))).toBe(true);
    });

    it('should handle high density (>200)', () => {
      const analysis = createMockAnalysis({ density: 220 });
      const inference = adapter.inferState(analysis, createMockContext());

      const healthyProb = inference.stateDistribution.get(FollicleState.HEALTHY_ANAGEN) || 0;
      expect(healthyProb).toBeGreaterThan(0);
    });

    it('should handle normal density range (150-200)', () => {
      const analysis = createMockAnalysis({ density: 175 });
      const inference = adapter.inferState(analysis, createMockContext());

      // Should not add density-related factors in normal range
      expect(inference.factors.every(f => !f.toLowerCase().includes('density'))).toBe(true);
    });

    it('should handle reduced density (100-150)', () => {
      const analysis = createMockAnalysis({ density: 120 });
      const inference = adapter.inferState(analysis, createMockContext());

      expect(inference.factors.some(f => f.toLowerCase().includes('reduced hair density'))).toBe(true);
    });

    it('should handle very low density (<100)', () => {
      const analysis = createMockAnalysis({ density: 80 });
      const inference = adapter.inferState(analysis, createMockContext());

      const advancedProb = inference.stateDistribution.get(FollicleState.ADVANCED_MINIATURIZATION) || 0;
      expect(advancedProb).toBeGreaterThan(0);
      expect(inference.factors.some(f => f.toLowerCase().includes('low hair density'))).toBe(true);
    });

    it('should handle unknown zone by defaulting to parietal', () => {
      const analysis = createMockAnalysis({ zone: 'unknown' });
      const observation = adapter.toObservation(analysis, createMockContext());

      expect(observation!.zone).toBe('parietal');
    });

    it('should handle frontal zone', () => {
      const analysis = createMockAnalysis({ zone: 'frontal' });
      const observation = adapter.toObservation(analysis, createMockContext());

      expect(observation!.zone).toBe('frontal');
    });

    it('should handle occipital zone', () => {
      const analysis = createMockAnalysis({ zone: 'occipital' });
      const observation = adapter.toObservation(analysis, createMockContext());

      expect(observation!.zone).toBe('occipital');
    });

    it('should map various diagnosis strings to states', () => {
      const analysisHealthy = createMockAnalysis();
      analysisHealthy.similarCases = [
        { caseId: 'c1', similarity: 0.9, diagnosis: 'healthy follicles' },
      ];
      const inference1 = adapter.inferState(analysisHealthy, createMockContext());
      expect(inference1.factors.some(f => f.includes('Similar cases'))).toBe(true);

      const analysisTelogen = createMockAnalysis();
      analysisTelogen.similarCases = [
        { caseId: 'c2', similarity: 0.9, diagnosis: 'telogen_effluvium' },
      ];
      const inference2 = adapter.inferState(analysisTelogen, createMockContext());
      const stressProb = inference2.stateDistribution.get(FollicleState.STRESS_INDUCED) || 0;
      expect(stressProb).toBeGreaterThan(0);
    });

    it('should handle similar cases with zero total similarity', () => {
      const analysis = createMockAnalysis();
      analysis.similarCases = [
        { caseId: 'c1', similarity: 0, diagnosis: 'healthy' },
      ];
      const inference = adapter.inferState(analysis, createMockContext());
      expect(inference.stateDistribution.size).toBeGreaterThan(0);
    });
  });
});
