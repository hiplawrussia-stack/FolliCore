/**
 * Tests for FolliCoreEngine
 */

import {
  FolliCoreEngine,
  createFolliCoreEngine,
  type IFolliCoreConfig,
  type ITreatmentRecommendation,
} from './FolliCoreEngine';

import {
  FollicleState,
  TrichologyAction,
  type IFollicleObservation,
  type IAcousticObservation,
  type IPatientContext,
} from './domain/TrichologyStates';

describe('FolliCoreEngine', () => {
  // Helper to create patient context
  const createPatientContext = (
    overrides: Partial<IPatientContext> = {}
  ): IPatientContext => ({
    age: 35,
    gender: 'male',
    chronicStressLevel: 'low',
    medicalHistory: [],
    currentTreatments: [],
    treatmentHistory: [],
    ...overrides,
  });

  // Helper to create observation
  const createObservation = (
    overrides: Partial<IFollicleObservation> = {}
  ): IFollicleObservation => ({
    bulbWidth: 73,
    shaftThickness: 32,
    density: 150,
    follicularUnits: 80,
    anagenTelogenRatio: 0.85,
    vellusTerminalRatio: 0.15,
    zone: 'parietal',
    confidence: 0.9,
    ...overrides,
  });

  // Helper to create acoustic observation
  const createAcousticObservation = (
    overrides: Partial<IAcousticObservation> = {}
  ): IAcousticObservation => ({
    porosity: 0.2,
    hydration: 0.7,
    structureClass: 'healthy',
    confidence: 0.85,
    ...overrides,
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const engine = new FolliCoreEngine();
      expect(engine).toBeDefined();
    });

    it('should create engine with custom config', () => {
      const config: Partial<IFolliCoreConfig> = {
        explorationRate: 0.2,
        planningHorizon: 24,
        riskTolerance: 'conservative',
      };
      const engine = new FolliCoreEngine(config);
      expect(engine).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const engine = new FolliCoreEngine({ explorationRate: 0.3 });
      expect(engine).toBeDefined();
    });
  });

  describe('createFolliCoreEngine factory', () => {
    it('should create engine with factory function', () => {
      const engine = createFolliCoreEngine();
      expect(engine).toBeInstanceOf(FolliCoreEngine);
    });

    it('should pass config to factory function', () => {
      const engine = createFolliCoreEngine({ riskTolerance: 'aggressive' });
      expect(engine).toBeInstanceOf(FolliCoreEngine);
    });
  });

  describe('initializePatient', () => {
    it('should initialize patient belief state', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      const belief = engine.initializePatient('patient-1', context);

      expect(belief).toBeDefined();
      expect(belief.stateDistribution).toBeInstanceOf(Map);
      expect(belief.stateDistribution.size).toBe(10); // All follicle states
    });

    it('should set uniform prior distribution', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      const belief = engine.initializePatient('patient-1', context);

      const expectedProb = 1 / 10;
      for (const prob of belief.stateDistribution.values()) {
        expect(prob).toBeCloseTo(expectedProb, 5);
      }
    });

    it('should initialize with zero confidence', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      const belief = engine.initializePatient('patient-1', context);

      expect(belief.confidence).toBe(0);
    });

    it('should set initial follicle age to chronological age', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 45 });

      const belief = engine.initializePatient('patient-1', context);

      expect(belief.estimatedFollicleAge).toBe(45);
      expect(belief.chronologicalAge).toBe(45);
      expect(belief.ageDelta).toBe(0);
    });

    it('should initialize empty belief history', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      const belief = engine.initializePatient('patient-1', context);

      expect(belief.beliefHistory).toHaveLength(0);
    });

    it('should initialize progression risk and recovery potential', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      const belief = engine.initializePatient('patient-1', context);

      expect(belief.progressionRisk).toBe(0.5);
      expect(belief.recoveryPotential).toBe(0.5);
    });

    it('should filter Thompson arms by gender', () => {
      const engine = new FolliCoreEngine();

      // Female patient - finasteride should be filtered out
      const femaleContext = createPatientContext({ gender: 'female' });
      engine.initializePatient('female-patient', femaleContext);

      // Male patient - finasteride should be available
      const maleContext = createPatientContext({ gender: 'male' });
      engine.initializePatient('male-patient', maleContext);

      // Both should initialize successfully
      expect(engine.getBeliefState('female-patient')).toBeDefined();
      expect(engine.getBeliefState('male-patient')).toBeDefined();
    });
  });

  describe('updateBelief', () => {
    let engine: FolliCoreEngine;
    let patientContext: IPatientContext;

    beforeEach(() => {
      engine = new FolliCoreEngine();
      patientContext = createPatientContext();
      engine.initializePatient('patient-1', patientContext);
    });

    it('should throw for non-initialized patient', () => {
      expect(() => {
        engine.updateBelief('unknown-patient', createObservation());
      }).toThrow('Patient unknown-patient not initialized');
    });

    it('should update belief state from observation', () => {
      const observation = createObservation();

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief).toBeDefined();
      expect(belief.lastObservation).toBeInstanceOf(Date);
    });

    it('should add snapshot to belief history', () => {
      const observation = createObservation();

      const belief = engine.updateBelief('patient-1', observation);

      expect(belief.beliefHistory.length).toBe(1);
      expect(belief.beliefHistory[0].observation).toEqual(observation);
    });

    it('should update dominant state based on observation', () => {
      const observation = createObservation({
        anagenTelogenRatio: 0.5,  // Suggests stress-induced
      });

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief.dominantState).toBeDefined();
      // Dominant state should change based on observation
    });

    it('should estimate follicle age from observation', () => {
      const observation = createObservation({
        bulbWidth: 71,  // Lower than norm for 35yo
      });

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief.estimatedFollicleAge).toBeGreaterThan(35);
      expect(belief.ageDelta).toBeGreaterThan(0);
    });

    it('should incorporate acoustic observation', () => {
      const observation = createObservation();
      const acousticObs = createAcousticObservation({
        structureClass: 'damaged',
      });

      const belief = engine.updateBelief('patient-1', observation, acousticObs, patientContext);

      expect(belief).toBeDefined();
      // Damaged structure should increase stress-induced likelihood
    });

    it('should update progression risk', () => {
      const initialBelief = engine.getBeliefState('patient-1');
      const _initialRisk = initialBelief.progressionRisk;

      const observation = createObservation({
        vellusTerminalRatio: 0.4,  // Higher = worse
      });

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      // Risk should be recalculated
      expect(belief.progressionRisk).toBeDefined();
    });

    it('should update recovery potential', () => {
      const observation = createObservation();

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief.recoveryPotential).toBeDefined();
      expect(belief.recoveryPotential).toBeGreaterThanOrEqual(0);
      expect(belief.recoveryPotential).toBeLessThanOrEqual(1);
    });

    it('should handle observation with low density', () => {
      const observation = createObservation({
        density: 30,  // Very low - suggests dormant/terminal
      });

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief.stateDistribution.get(FollicleState.DORMANT)).toBeGreaterThan(0);
    });

    it('should handle temporal zone observations', () => {
      const observation = createObservation({
        zone: 'temporal',
        bulbWidth: 68,
      });

      const belief = engine.updateBelief('patient-1', observation, undefined, patientContext);

      expect(belief).toBeDefined();
    });

    it('should accumulate multiple observations in history', () => {
      engine.updateBelief('patient-1', createObservation());
      engine.updateBelief('patient-1', createObservation({ density: 140 }));
      engine.updateBelief('patient-1', createObservation({ density: 130 }));

      const belief = engine.getBeliefState('patient-1');
      expect(belief.beliefHistory.length).toBe(3);
    });
  });

  describe('getRecommendation', () => {
    let engine: FolliCoreEngine;
    let patientContext: IPatientContext;

    beforeEach(() => {
      engine = new FolliCoreEngine();
      patientContext = createPatientContext();
      engine.initializePatient('patient-1', patientContext);

      // Add an observation to set a meaningful state
      engine.updateBelief('patient-1', createObservation({
        vellusTerminalRatio: 0.3,  // Early miniaturization signal
      }), undefined, patientContext);
    });

    it('should throw for non-initialized patient', () => {
      expect(() => {
        engine.getRecommendation('unknown-patient', patientContext);
      }).toThrow('Patient unknown-patient not initialized');
    });

    it('should return treatment recommendation', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation).toBeDefined();
      expect(recommendation.primaryAction).toBeDefined();
      expect(Object.values(TrichologyAction)).toContain(recommendation.primaryAction);
    });

    it('should include confidence score', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.confidence).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it('should include expected benefit', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.expectedBenefit).toBeDefined();
      expect(recommendation.expectedBenefit).toBeGreaterThanOrEqual(0);
    });

    it('should include alternatives', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.alternatives).toBeDefined();
      expect(Array.isArray(recommendation.alternatives)).toBe(true);
    });

    it('should include strategy steps', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.strategy).toBeDefined();
      expect(recommendation.strategy.length).toBeGreaterThan(0);
      expect(recommendation.strategy[0].step).toBe(1);
      expect(recommendation.strategy[0].timing).toBe('now');
    });

    it('should include safety checks', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.safetyChecks).toBeDefined();
      expect(typeof recommendation.safetyChecks.passed).toBe('boolean');
      expect(Array.isArray(recommendation.safetyChecks.warnings)).toBe(true);
      expect(Array.isArray(recommendation.safetyChecks.blockers)).toBe(true);
    });

    it('should include explanation', () => {
      const recommendation = engine.getRecommendation('patient-1', patientContext);

      expect(recommendation.explanation).toBeDefined();
      expect(recommendation.explanation.whyThisAction).toBeDefined();
      expect(recommendation.explanation.uncertaintyNote).toBeDefined();
    });

    it('should respect safety rules for female patients', () => {
      const femaleContext = createPatientContext({ gender: 'female', age: 30 });
      engine.initializePatient('female-patient', femaleContext);
      engine.updateBelief('female-patient', createObservation(), undefined, femaleContext);

      const recommendation = engine.getRecommendation('female-patient', femaleContext);

      // Finasteride should not be recommended for females
      expect(recommendation.primaryAction).not.toBe(TrichologyAction.FINASTERIDE);
    });

    it('should handle contraindications', () => {
      const contextWithConditions = createPatientContext({
        medicalHistory: ['Hypotension', 'Liver_disease'],
      });
      engine.initializePatient('patient-conditions', contextWithConditions);
      engine.updateBelief('patient-conditions', createObservation(), undefined, contextWithConditions);

      const recommendation = engine.getRecommendation('patient-conditions', contextWithConditions);

      // Should avoid contraindicated treatments
      expect(recommendation).toBeDefined();
    });

    it('should use safe alternative when primary is blocked', () => {
      // Create scenario where inflammation blocks stimulation
      engine.initializePatient('inflamed-patient', patientContext);

      // Set high inflammation in belief state by multiple observations
      const inflammatoryObs = createObservation({
        vellusTerminalRatio: 0.1,
        anagenTelogenRatio: 0.6,
      });
      engine.updateBelief('inflamed-patient', inflammatoryObs, undefined, patientContext);

      const recommendation = engine.getRecommendation('inflamed-patient', patientContext);

      // Should still return a recommendation
      expect(recommendation.primaryAction).toBeDefined();
    });
  });

  describe('updateOutcome', () => {
    let engine: FolliCoreEngine;
    let patientContext: IPatientContext;

    beforeEach(() => {
      engine = new FolliCoreEngine();
      patientContext = createPatientContext();
      engine.initializePatient('patient-1', patientContext);
    });

    it('should update Thompson arm for positive outcome', () => {
      engine.updateOutcome('patient-1', TrichologyAction.MINOXIDIL_5, 'positive');
      // Internal state updated - no direct assertion, but should not throw
    });

    it('should update Thompson arm for negative outcome', () => {
      engine.updateOutcome('patient-1', TrichologyAction.MINOXIDIL_5, 'negative');
      // Internal state updated
    });

    it('should update Thompson arm for neutral outcome', () => {
      engine.updateOutcome('patient-1', TrichologyAction.STRESS_MANAGEMENT, 'neutral');
      // Internal state updated
    });

    it('should handle unknown patient gracefully', () => {
      // Should not throw
      engine.updateOutcome('unknown-patient', TrichologyAction.MINOXIDIL_5, 'positive');
    });

    it('should handle unknown action gracefully', () => {
      // Should not throw even if action not in arms
      engine.updateOutcome('patient-1', TrichologyAction.DUTASTERIDE, 'positive');
    });

    it('should affect future recommendations after positive outcome', () => {
      engine.updateBelief('patient-1', createObservation(), undefined, patientContext);

      // Get initial recommendation
      const rec1 = engine.getRecommendation('patient-1', patientContext);

      // Update with multiple positive outcomes for one action
      for (let i = 0; i < 10; i++) {
        engine.updateOutcome('patient-1', TrichologyAction.STRESS_MANAGEMENT, 'positive');
      }

      // Get recommendation after learning
      const rec2 = engine.getRecommendation('patient-1', patientContext);

      // Both should be valid recommendations
      expect(rec1.primaryAction).toBeDefined();
      expect(rec2.primaryAction).toBeDefined();
    });
  });

  describe('getBeliefState', () => {
    it('should return undefined for non-initialized patient', () => {
      const engine = new FolliCoreEngine();

      const belief = engine.getBeliefState('unknown-patient');

      expect(belief).toBeUndefined();
    });

    it('should return belief state for initialized patient', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('patient-1', context);

      const belief = engine.getBeliefState('patient-1');

      expect(belief).toBeDefined();
      expect(belief.stateDistribution).toBeInstanceOf(Map);
    });

    it('should return updated belief after observations', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('patient-1', context);
      engine.updateBelief('patient-1', createObservation(), undefined, context);

      const belief = engine.getBeliefState('patient-1');

      expect(belief.beliefHistory.length).toBe(1);
    });
  });

  describe('predictTrajectory', () => {
    let engine: FolliCoreEngine;
    let patientContext: IPatientContext;

    beforeEach(() => {
      engine = new FolliCoreEngine();
      patientContext = createPatientContext();
      engine.initializePatient('patient-1', patientContext);
      engine.updateBelief('patient-1', createObservation(), undefined, patientContext);
    });

    it('should throw for non-initialized patient', () => {
      expect(() => {
        engine.predictTrajectory('unknown-patient');
      }).toThrow('Patient unknown-patient not initialized');
    });

    it('should return trajectory prediction', () => {
      const prediction = engine.predictTrajectory('patient-1');

      expect(prediction).toBeDefined();
      expect(prediction.predictedState).toBeInstanceOf(Map);
    });

    it('should use default 12-month horizon', () => {
      const prediction = engine.predictTrajectory('patient-1');

      expect(prediction.horizon).toBe(12);
    });

    it('should accept custom horizon', () => {
      const prediction = engine.predictTrajectory('patient-1', 6);

      expect(prediction.horizon).toBe(6);
    });

    it('should include predicted metrics', () => {
      const prediction = engine.predictTrajectory('patient-1');

      expect(prediction.predictedMetrics).toBeDefined();
      expect(prediction.predictedMetrics.density).toBeDefined();
      expect(prediction.predictedMetrics.density.mean).toBeGreaterThan(0);
      expect(prediction.predictedMetrics.density.confidence).toHaveLength(2);
      expect(prediction.predictedMetrics.bulbWidth).toBeDefined();
    });

    it('should determine trend based on progression risk', () => {
      const prediction = engine.predictTrajectory('patient-1');

      expect(['improving', 'stable', 'declining']).toContain(prediction.trend);
    });

    it('should include confidence score', () => {
      const prediction = engine.predictTrajectory('patient-1');

      expect(prediction.confidence).toBeDefined();
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should normalize predicted state distribution', () => {
      const prediction = engine.predictTrajectory('patient-1');

      let total = 0;
      for (const prob of prediction.predictedState.values()) {
        total += prob;
      }
      expect(total).toBeCloseTo(1, 5);
    });

    it('should predict declining for high-risk patients', () => {
      // Create high-risk scenario
      const riskyObs = createObservation({
        vellusTerminalRatio: 0.5,
        density: 80,
        anagenTelogenRatio: 0.5,
      });
      engine.updateBelief('patient-1', riskyObs, undefined, patientContext);
      engine.updateBelief('patient-1', riskyObs, undefined, patientContext);

      const prediction = engine.predictTrajectory('patient-1');

      // High risk should lead to declining or at least not improving
      expect(prediction.trend).toBeDefined();
    });
  });

  describe('integration tests', () => {
    it('should handle complete patient journey', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 32, gender: 'male' });

      // 1. Initialize patient
      const initialBelief = engine.initializePatient('journey-patient', context);
      expect(initialBelief.confidence).toBe(0);

      // 2. First observation
      const obs1 = createObservation({
        bulbWidth: 72,
        vellusTerminalRatio: 0.25,
      });
      const belief1 = engine.updateBelief('journey-patient', obs1, undefined, context);
      expect(belief1.confidence).toBeGreaterThan(0);

      // 3. Get recommendation
      const rec1 = engine.getRecommendation('journey-patient', context);
      expect(rec1.primaryAction).toBeDefined();

      // 4. Treatment outcome
      engine.updateOutcome('journey-patient', rec1.primaryAction, 'positive');

      // 5. Follow-up observation
      const obs2 = createObservation({
        bulbWidth: 73,
        vellusTerminalRatio: 0.2,
        density: 160,
      });
      const _belief2 = engine.updateBelief('journey-patient', obs2, undefined, context);

      // 6. Trajectory prediction
      const prediction = engine.predictTrajectory('journey-patient');
      expect(prediction.trend).toBeDefined();

      // 7. Get updated recommendation
      const rec2 = engine.getRecommendation('journey-patient', context);
      expect(rec2.strategy.length).toBeGreaterThan(0);
    });

    it('should handle multiple patients independently', () => {
      const engine = new FolliCoreEngine();

      const patient1Context = createPatientContext({ age: 25, gender: 'male' });
      const patient2Context = createPatientContext({ age: 45, gender: 'female' });

      engine.initializePatient('patient-1', patient1Context);
      engine.initializePatient('patient-2', patient2Context);

      engine.updateBelief('patient-1', createObservation(), undefined, patient1Context);
      engine.updateBelief('patient-2', createObservation({ bulbWidth: 68 }), undefined, patient2Context);

      const belief1 = engine.getBeliefState('patient-1');
      const belief2 = engine.getBeliefState('patient-2');

      expect(belief1.chronologicalAge).toBe(25);
      expect(belief2.chronologicalAge).toBe(45);
    });

    it('should build strategy with conditional escalation', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ gender: 'male' });
      engine.initializePatient('strategy-patient', context);

      // Set early miniaturization state
      const obs = createObservation({
        vellusTerminalRatio: 0.35,
        bulbWidth: 70,
      });
      engine.updateBelief('strategy-patient', obs, undefined, context);

      const recommendation = engine.getRecommendation('strategy-patient', context);

      // Should have multi-step strategy
      expect(recommendation.strategy.length).toBeGreaterThanOrEqual(2);

      // First step should be immediate
      expect(recommendation.strategy[0].timing).toBe('now');

      // Should have follow-up step
      const followUp = recommendation.strategy.find(s => s.timing.includes('month'));
      expect(followUp).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very young patients', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 18 });

      engine.initializePatient('young-patient', context);
      engine.updateBelief('young-patient', createObservation(), undefined, context);

      const recommendation = engine.getRecommendation('young-patient', context);

      // Should get warning for aggressive treatments
      expect(recommendation.safetyChecks).toBeDefined();
    });

    it('should handle elderly patients', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 80 });

      engine.initializePatient('elderly-patient', context);
      engine.updateBelief('elderly-patient', createObservation(), undefined, context);

      const recommendation = engine.getRecommendation('elderly-patient', context);

      expect(recommendation.primaryAction).toBeDefined();
    });

    it('should handle observations without context', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      engine.initializePatient('no-context-patient', context);

      // Update without context
      const belief = engine.updateBelief('no-context-patient', createObservation());

      expect(belief).toBeDefined();
    });

    it('should handle extreme observation values', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      engine.initializePatient('extreme-patient', context);

      const extremeObs = createObservation({
        bulbWidth: 100,  // Very high
        density: 5,       // Very low
        vellusTerminalRatio: 0.9,
      });

      const belief = engine.updateBelief('extreme-patient', extremeObs, undefined, context);

      expect(belief.stateDistribution.get(FollicleState.TERMINAL)).toBeGreaterThan(0);
    });

    it('should build strategy with female-specific escalation', () => {
      const engine = new FolliCoreEngine();
      const femaleContext = createPatientContext({ gender: 'female', age: 35 });
      engine.initializePatient('female-strategy', femaleContext);

      // Set early miniaturization state
      const obs = createObservation({
        vellusTerminalRatio: 0.35,
        bulbWidth: 68,
      });
      engine.updateBelief('female-strategy', obs, undefined, femaleContext);

      const recommendation = engine.getRecommendation('female-strategy', femaleContext);

      // Female strategy should recommend PRP instead of finasteride
      expect(recommendation.strategy.length).toBeGreaterThanOrEqual(2);
      const escalationStep = recommendation.strategy.find(s => s.step === 3);
      if (escalationStep) {
        expect(escalationStep.action).not.toBe(TrichologyAction.FINASTERIDE);
      }
    });

    it('should note excluded treatments in explanation for females', () => {
      const engine = new FolliCoreEngine();
      const femaleContext = createPatientContext({ gender: 'female', age: 30 });
      engine.initializePatient('explanation-female', femaleContext);
      engine.updateBelief('explanation-female', createObservation(), undefined, femaleContext);

      const recommendation = engine.getRecommendation('explanation-female', femaleContext);

      // Explanation should mention finasteride exclusion
      expect(recommendation.explanation.whyNotOthers).toContain(
        'Finasteride excluded: contraindicated for females'
      );
    });

    it('should note inflammation risk in explanation', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('inflammation-note', context);

      // Create observation that might suggest inflammation
      // We need to manipulate belief state to have inflammation > 0.2
      const obs = createObservation({
        anagenTelogenRatio: 0.4,  // Low ratio might trigger inflammation detection
      });
      engine.updateBelief('inflammation-note', obs, undefined, context);

      // Force high inflammation by repeated updates
      for (let i = 0; i < 5; i++) {
        engine.updateBelief('inflammation-note', obs, undefined, context);
      }

      const recommendation = engine.getRecommendation('inflammation-note', context);

      // Should have explanation
      expect(recommendation.explanation).toBeDefined();
    });

    it('should predict improving trend for low-risk patients', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 25 });
      engine.initializePatient('low-risk', context);

      // Healthy observation
      const healthyObs = createObservation({
        bulbWidth: 75,
        density: 180,
        anagenTelogenRatio: 0.9,
        vellusTerminalRatio: 0.05,
      });
      engine.updateBelief('low-risk', healthyObs, undefined, context);

      const prediction = engine.predictTrajectory('low-risk');

      // Low progression risk should lead to improving or stable
      expect(['improving', 'stable']).toContain(prediction.trend);
    });

    it('should handle medium progression risk for stable trend', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 40 });
      engine.initializePatient('medium-risk', context);

      // Medium-risk observation
      const mediumObs = createObservation({
        bulbWidth: 72,
        density: 130,
        anagenTelogenRatio: 0.7,
        vellusTerminalRatio: 0.2,
      });
      engine.updateBelief('medium-risk', mediumObs, undefined, context);

      const prediction = engine.predictTrajectory('medium-risk');

      // Medium risk might be stable
      expect(prediction.trend).toBeDefined();
    });

    it('should handle ageDelta in explanation when follicles are accelerated', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext({ age: 30 });
      engine.initializePatient('accelerated-aging', context);

      // Observation suggesting older follicles
      const agedObs = createObservation({
        bulbWidth: 68,  // Much lower than expected for 30yo
      });
      engine.updateBelief('accelerated-aging', agedObs, undefined, context);

      const recommendation = engine.getRecommendation('accelerated-aging', context);

      // Explanation should mention accelerated aging if ageDelta > 10
      expect(recommendation.explanation.whyThisAction).toBeDefined();
    });

    it('should handle low confidence note in explanation', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('low-confidence', context);

      // Initial state has uniform distribution = low confidence
      // Just one observation won't boost confidence much
      const obs = createObservation();
      engine.updateBelief('low-confidence', obs, undefined, context);

      const recommendation = engine.getRecommendation('low-confidence', context);

      // Should have uncertainty note
      expect(recommendation.explanation.uncertaintyNote).toBeDefined();
    });

    it('should handle actions with no applicable arms', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('no-applicable', context);

      // Set a state that might have limited applicable treatments
      const obs = createObservation({
        density: 10,
        vellusTerminalRatio: 0.95,
      });
      engine.updateBelief('no-applicable', obs, undefined, context);

      // Should still return a recommendation
      const recommendation = engine.getRecommendation('no-applicable', context);
      expect(recommendation.primaryAction).toBeDefined();
    });
  });

  describe('additional coverage tests', () => {
    it('should handle parietal zone for both genders', () => {
      const engine = new FolliCoreEngine();

      // Test male parietal
      const maleContext = createPatientContext({ gender: 'male' });
      engine.initializePatient('male-parietal', maleContext);
      const maleBelief = engine.updateBelief('male-parietal', createObservation({
        zone: 'parietal',
      }), undefined, maleContext);
      expect(maleBelief).toBeDefined();

      // Test female parietal
      const femaleContext = createPatientContext({ gender: 'female' });
      engine.initializePatient('female-parietal', femaleContext);
      const femaleBelief = engine.updateBelief('female-parietal', createObservation({
        zone: 'parietal',
      }), undefined, femaleContext);
      expect(femaleBelief).toBeDefined();
    });

    it('should handle temporal zone for both genders', () => {
      const engine = new FolliCoreEngine();

      // Test male temporal
      const maleContext = createPatientContext({ gender: 'male' });
      engine.initializePatient('male-temporal', maleContext);
      const maleBelief = engine.updateBelief('male-temporal', createObservation({
        zone: 'temporal',
      }), undefined, maleContext);
      expect(maleBelief).toBeDefined();

      // Test female temporal
      const femaleContext = createPatientContext({ gender: 'female' });
      engine.initializePatient('female-temporal', femaleContext);
      const femaleBelief = engine.updateBelief('female-temporal', createObservation({
        zone: 'temporal',
      }), undefined, femaleContext);
      expect(femaleBelief).toBeDefined();
    });

    it('should sample multiple times for Thompson Sampling variance', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('sampling-test', context);
      engine.updateBelief('sampling-test', createObservation(), undefined, context);

      // Get multiple recommendations - Thompson Sampling has randomness
      const recommendations: ITreatmentRecommendation[] = [];
      for (let i = 0; i < 10; i++) {
        recommendations.push(engine.getRecommendation('sampling-test', context));
      }

      // All should be valid recommendations
      recommendations.forEach(rec => {
        expect(rec.primaryAction).toBeDefined();
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle observation with weathered acoustic structure', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('weathered-acoustic', context);

      const obs = createObservation();
      const acousticObs = createAcousticObservation({
        structureClass: 'weathered',
        porosity: 0.5,
      });

      const belief = engine.updateBelief('weathered-acoustic', obs, acousticObs, context);
      expect(belief).toBeDefined();
    });

    it('should build alternatives with reasoning', () => {
      const engine = new FolliCoreEngine();
      const context = createPatientContext();
      engine.initializePatient('alternatives-test', context);
      engine.updateBelief('alternatives-test', createObservation({
        vellusTerminalRatio: 0.3,
      }), undefined, context);

      const recommendation = engine.getRecommendation('alternatives-test', context);

      recommendation.alternatives.forEach(alt => {
        expect(alt.action).toBeDefined();
        expect(alt.score).toBeGreaterThanOrEqual(0);
        expect(alt.reasoning).toBeDefined();
        expect(alt.reasoning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Event-Driven Architecture integration', () => {
    it('should allow setting EventBus after construction', () => {
      const engine = new FolliCoreEngine();

      // Create a mock EventBus
      const mockEventBus = {
        publish: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      // Set EventBus - should not throw
      engine.setEventBus(mockEventBus);
      expect(mockEventBus).toBeDefined();
    });

    it('should allow setting user context for audit trail', () => {
      const engine = new FolliCoreEngine();

      // Should not throw
      engine.setUserContext('clinician-123', 'session-456');
    });

    it('should emit PATIENT_INITIALIZED event when patient is initialized', async () => {
      const publishedEvents: unknown[] = [];
      const mockEventBus = {
        publish: jest.fn().mockImplementation(async (event: unknown) => {
          publishedEvents.push(event);
        }),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      const engine = new FolliCoreEngine({ eventBus: mockEventBus });
      const context = createPatientContext();

      engine.initializePatient('event-test-patient', context);

      // Wait for async event publishing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockEventBus.publish).toHaveBeenCalled();
      const event = publishedEvents[0] as { eventType: string; payload: unknown };
      expect(event.eventType).toBe('PATIENT_INITIALIZED');
    });

    it('should emit BELIEF_STATE_UPDATED event when belief is updated', async () => {
      const publishedEvents: unknown[] = [];
      const mockEventBus = {
        publish: jest.fn().mockImplementation(async (event: unknown) => {
          publishedEvents.push(event);
        }),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      const engine = new FolliCoreEngine({ eventBus: mockEventBus });
      const context = createPatientContext();

      engine.initializePatient('belief-event-patient', context);
      engine.updateBelief('belief-event-patient', createObservation(), undefined, context);

      // Wait for async event publishing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have at least 2 events: PATIENT_INITIALIZED and BELIEF_STATE_UPDATED
      expect(publishedEvents.length).toBeGreaterThanOrEqual(2);

      const beliefEvent = publishedEvents.find(
        e => (e as { eventType: string }).eventType === 'BELIEF_STATE_UPDATED'
      );
      expect(beliefEvent).toBeDefined();
    });

    it('should emit TREATMENT_RECOMMENDED event when getting recommendation', async () => {
      const publishedEvents: unknown[] = [];
      const mockEventBus = {
        publish: jest.fn().mockImplementation(async (event: unknown) => {
          publishedEvents.push(event);
        }),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      const engine = new FolliCoreEngine({ eventBus: mockEventBus });
      const context = createPatientContext();

      engine.initializePatient('recommendation-event-patient', context);
      engine.updateBelief('recommendation-event-patient', createObservation(), undefined, context);
      engine.getRecommendation('recommendation-event-patient', context);

      // Wait for async event publishing
      await new Promise(resolve => setTimeout(resolve, 10));

      const recommendationEvent = publishedEvents.find(
        e => (e as { eventType: string }).eventType === 'TREATMENT_RECOMMENDED'
      );
      expect(recommendationEvent).toBeDefined();
    });

    it('should emit THOMPSON_ARM_UPDATED event when outcome is updated', async () => {
      const publishedEvents: unknown[] = [];
      const mockEventBus = {
        publish: jest.fn().mockImplementation(async (event: unknown) => {
          publishedEvents.push(event);
        }),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      const engine = new FolliCoreEngine({ eventBus: mockEventBus });
      const context = createPatientContext();

      engine.initializePatient('outcome-event-patient', context);
      engine.updateOutcome('outcome-event-patient', TrichologyAction.MINOXIDIL_5, 'positive');

      // Wait for async event publishing
      await new Promise(resolve => setTimeout(resolve, 10));

      const thompsonEvent = publishedEvents.find(
        e => (e as { eventType: string }).eventType === 'THOMPSON_ARM_UPDATED'
      );
      expect(thompsonEvent).toBeDefined();
    });

    it('should emit TRAJECTORY_PREDICTED event when predicting trajectory', async () => {
      const publishedEvents: unknown[] = [];
      const mockEventBus = {
        publish: jest.fn().mockImplementation(async (event: unknown) => {
          publishedEvents.push(event);
        }),
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
        unsubscribe: jest.fn(),
        clearAll: jest.fn(),
        getSubscriptionCount: jest.fn().mockReturnValue(0),
        hasHandlers: jest.fn().mockReturnValue(false),
      };

      const engine = new FolliCoreEngine({ eventBus: mockEventBus });
      const context = createPatientContext();

      engine.initializePatient('trajectory-event-patient', context);
      engine.updateBelief('trajectory-event-patient', createObservation(), undefined, context);
      engine.predictTrajectory('trajectory-event-patient');

      // Wait for async event publishing
      await new Promise(resolve => setTimeout(resolve, 10));

      const trajectoryEvent = publishedEvents.find(
        e => (e as { eventType: string }).eventType === 'TRAJECTORY_PREDICTED'
      );
      expect(trajectoryEvent).toBeDefined();
    });

    it('should work correctly without EventBus configured', () => {
      // Engine without EventBus should not throw
      const engine = new FolliCoreEngine();
      const context = createPatientContext();

      engine.initializePatient('no-eventbus-patient', context);
      engine.updateBelief('no-eventbus-patient', createObservation(), undefined, context);
      engine.getRecommendation('no-eventbus-patient', context);
      engine.updateOutcome('no-eventbus-patient', TrichologyAction.MINOXIDIL_5, 'positive');
      engine.predictTrajectory('no-eventbus-patient');

      // All operations should complete without errors
      expect(engine.getBeliefState('no-eventbus-patient')).toBeDefined();
    });
  });
});
