/**
 * Tests for TrichologySafetyRules
 */

import {
  TRICHOLOGY_SAFETY_RULES,
  SafetyCheckContext,
  SafetyCheckResult,
  runSafetyChecks,
  isActionSafe,
  getSafeAlternative,
} from './TrichologySafetyRules';

import {
  TrichologyAction,
  FollicleState,
  IPatientContext,
} from './TrichologyStates';

describe('TrichologySafetyRules', () => {
  // Helper to create a basic patient context
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

  // Helper to create a basic belief state
  const createBeliefState = (
    stateProbs: Partial<Record<FollicleState, number>> = {}
  ): Map<FollicleState, number> => {
    const map = new Map<FollicleState, number>();
    map.set(FollicleState.HEALTHY_ANAGEN, stateProbs[FollicleState.HEALTHY_ANAGEN] || 0.5);
    map.set(FollicleState.EARLY_MINIATURIZATION, stateProbs[FollicleState.EARLY_MINIATURIZATION] || 0.3);
    map.set(FollicleState.INFLAMMATION, stateProbs[FollicleState.INFLAMMATION] || 0.1);
    map.set(FollicleState.ADVANCED_MINIATURIZATION, stateProbs[FollicleState.ADVANCED_MINIATURIZATION] || 0.05);
    map.set(FollicleState.TERMINAL, stateProbs[FollicleState.TERMINAL] || 0.05);
    return map;
  };

  // Helper to create safety check context
  const createSafetyContext = (
    action: TrichologyAction,
    patientOverrides: Partial<IPatientContext> = {},
    beliefStateOverrides: Partial<Record<FollicleState, number>> = {},
    recentObservations: any[] = []
  ): SafetyCheckContext => ({
    proposedAction: action,
    patientContext: createPatientContext(patientOverrides),
    currentBeliefState: createBeliefState(beliefStateOverrides),
    recentObservations,
  });

  describe('TRICHOLOGY_SAFETY_RULES', () => {
    it('should have 9 safety rules', () => {
      expect(TRICHOLOGY_SAFETY_RULES.length).toBe(9);
    });

    it('should have rules of different types', () => {
      const neverRules = TRICHOLOGY_SAFETY_RULES.filter(r => r.type === 'NEVER');
      const alwaysRules = TRICHOLOGY_SAFETY_RULES.filter(r => r.type === 'ALWAYS');
      const escalateRules = TRICHOLOGY_SAFETY_RULES.filter(r => r.type === 'ESCALATE');
      const warnRules = TRICHOLOGY_SAFETY_RULES.filter(r => r.type === 'WARN');

      expect(neverRules.length).toBeGreaterThan(0);
      expect(alwaysRules.length).toBeGreaterThan(0);
      expect(escalateRules.length).toBeGreaterThan(0);
      expect(warnRules.length).toBeGreaterThan(0);
    });
  });

  describe('NEVER_DIAGNOSE_DISEASE rule', () => {
    it('should always pass (system design constraint)', () => {
      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_DIAGNOSE_DISEASE');
      expect(rule).toBeDefined();

      const ctx = createSafetyContext(TrichologyAction.MINOXIDIL_5);
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });
  });

  describe('NEVER_PROMISE_RESULTS rule', () => {
    it('should always pass (system design constraint)', () => {
      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_PROMISE_RESULTS');
      expect(rule).toBeDefined();

      const ctx = createSafetyContext(TrichologyAction.PRP_THERAPY);
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });
  });

  describe('NEVER_FINASTERIDE_FEMALE rule', () => {
    it('should block finasteride for females under 50', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'female', age: 35 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_FINASTERIDE_FEMALE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.suggestedAction).toBe(TrichologyAction.MINOXIDIL_2);
    });

    it('should allow finasteride for females 50+', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'female', age: 55 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_FINASTERIDE_FEMALE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should allow finasteride for males', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'male', age: 35 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_FINASTERIDE_FEMALE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should pass for non-finasteride actions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        { gender: 'female', age: 30 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_FINASTERIDE_FEMALE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });
  });

  describe('NEVER_IGNORE_INFLAMMATION rule', () => {
    it('should block stimulation when inflammation > 30%', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        { [FollicleState.INFLAMMATION]: 0.4 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_IGNORE_INFLAMMATION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.suggestedAction).toBe(TrichologyAction.REFER_TO_SPECIALIST);
    });

    it('should block PRP when inflammation > 30%', () => {
      const ctx = createSafetyContext(
        TrichologyAction.PRP_THERAPY,
        {},
        { [FollicleState.INFLAMMATION]: 0.35 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_IGNORE_INFLAMMATION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
    });

    it('should allow treatment when inflammation < 30%', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        { [FollicleState.INFLAMMATION]: 0.2 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_IGNORE_INFLAMMATION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should allow non-stimulation treatments even with inflammation', () => {
      const ctx = createSafetyContext(
        TrichologyAction.STRESS_MANAGEMENT,
        {},
        { [FollicleState.INFLAMMATION]: 0.5 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'NEVER_IGNORE_INFLAMMATION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });
  });

  describe('ALWAYS_CHECK_CONTRAINDICATIONS rule', () => {
    it('should block finasteride for patients with pregnancy', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { medicalHistory: ['Pregnancy'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('should block finasteride for patients with liver disease', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { medicalHistory: ['Liver_disease', 'Diabetes'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('liver_disease');
    });

    it('should block minoxidil for patients with hypotension', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        { medicalHistory: ['Hypotension'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
    });

    it('should block PRP for patients on anticoagulants', () => {
      const ctx = createSafetyContext(
        TrichologyAction.PRP_THERAPY,
        { medicalHistory: ['Taking anticoagulants'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
    });

    it('should allow treatment without contraindications', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { medicalHistory: ['Asthma', 'Allergies'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should allow LLLT even with many conditions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.LLLT,
        { medicalHistory: ['Pregnancy', 'Liver_disease', 'Blood_disorders'] }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_CHECK_CONTRAINDICATIONS');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });
  });

  describe('ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE rule', () => {
    it('should warn for advanced + terminal > 50%', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {
          [FollicleState.ADVANCED_MINIATURIZATION]: 0.4,
          [FollicleState.TERMINAL]: 0.2,
        }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.suggestedAction).toBe(TrichologyAction.REFER_TO_SPECIALIST);
    });

    it('should pass when already referring to specialist', () => {
      const ctx = createSafetyContext(
        TrichologyAction.REFER_TO_SPECIALIST,
        {},
        {
          [FollicleState.ADVANCED_MINIATURIZATION]: 0.5,
          [FollicleState.TERMINAL]: 0.3,
        }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should pass for mild cases', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {
          [FollicleState.ADVANCED_MINIATURIZATION]: 0.1,
          [FollicleState.TERMINAL]: 0.05,
        }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });
  });

  describe('ESCALATE_RAPID_PROGRESSION rule', () => {
    it('should warn for >10% density loss', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {},
        [
          { density: 80 },   // Latest
          { density: 100 },  // Previous
        ]
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ESCALATE_RAPID_PROGRESSION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.message).toContain('20.0%');
    });

    it('should pass for stable density', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {},
        [
          { density: 95 },
          { density: 100 },
        ]
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ESCALATE_RAPID_PROGRESSION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should pass with insufficient observations', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {},
        [{ density: 80 }]
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ESCALATE_RAPID_PROGRESSION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should pass with no observations', () => {
      const ctx = createSafetyContext(TrichologyAction.MINOXIDIL_5);

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ESCALATE_RAPID_PROGRESSION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should handle observations without density', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        {},
        [
          { bulbWidth: 70 },
          { bulbWidth: 72 },
        ]
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'ESCALATE_RAPID_PROGRESSION');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true);
    });
  });

  describe('WARN_HIGH_UNCERTAINTY rule', () => {
    it('should warn for high entropy belief state', () => {
      // Create a nearly uniform distribution (high uncertainty)
      const highEntropyState = new Map<FollicleState, number>();
      const states = Object.values(FollicleState);
      states.forEach(state => highEntropyState.set(state as FollicleState, 1 / states.length));

      const ctx: SafetyCheckContext = {
        proposedAction: TrichologyAction.MINOXIDIL_5,
        patientContext: createPatientContext(),
        currentBeliefState: highEntropyState,
        recentObservations: [],
      };

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_HIGH_UNCERTAINTY');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true); // Warning, not blocking
      expect(result.severity).toBe('warning');
      expect(result.suggestedAction).toBe(TrichologyAction.REQUEST_ACOUSTIC_SCAN);
    });

    it('should pass for confident belief state', () => {
      // Create a confident distribution
      const confidentState = new Map<FollicleState, number>();
      confidentState.set(FollicleState.HEALTHY_ANAGEN, 0.9);
      confidentState.set(FollicleState.EARLY_MINIATURIZATION, 0.1);

      const ctx: SafetyCheckContext = {
        proposedAction: TrichologyAction.MINOXIDIL_5,
        patientContext: createPatientContext(),
        currentBeliefState: confidentState,
        recentObservations: [],
      };

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_HIGH_UNCERTAINTY');
      const result = rule!.check(ctx);

      expect(result.severity).toBe('info');
    });
  });

  describe('WARN_YOUNG_PATIENT_AGGRESSIVE rule', () => {
    it('should warn for finasteride in patients under 25', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { age: 22 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_YOUNG_PATIENT_AGGRESSIVE');
      const result = rule!.check(ctx);

      expect(result.passed).toBe(true); // Warning, not blocking
      expect(result.severity).toBe('warning');
      expect(result.suggestedAction).toBe(TrichologyAction.STRESS_MANAGEMENT);
    });

    it('should warn for dutasteride in patients under 25', () => {
      const ctx = createSafetyContext(
        TrichologyAction.DUTASTERIDE,
        { age: 20 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_YOUNG_PATIENT_AGGRESSIVE');
      const result = rule!.check(ctx);

      expect(result.severity).toBe('warning');
    });

    it('should not warn for patients 25+', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { age: 25 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_YOUNG_PATIENT_AGGRESSIVE');
      const result = rule!.check(ctx);

      expect(result.severity).toBe('info');
    });

    it('should not warn for non-aggressive treatments in young patients', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        { age: 20 }
      );

      const rule = TRICHOLOGY_SAFETY_RULES.find(r => r.id === 'WARN_YOUNG_PATIENT_AGGRESSIVE');
      const result = rule!.check(ctx);

      expect(result.severity).toBe('info');
    });
  });

  describe('runSafetyChecks', () => {
    it('should return results for all rules', () => {
      const ctx = createSafetyContext(TrichologyAction.MINOXIDIL_5);
      const results = runSafetyChecks(ctx);

      expect(results.length).toBe(TRICHOLOGY_SAFETY_RULES.length);
    });

    it('should return rule IDs for each result', () => {
      const ctx = createSafetyContext(TrichologyAction.MINOXIDIL_5);
      const results = runSafetyChecks(ctx);

      const ruleIds = results.map(r => r.ruleId);
      expect(ruleIds).toContain('NEVER_DIAGNOSE_DISEASE');
      expect(ruleIds).toContain('NEVER_FINASTERIDE_FEMALE');
      expect(ruleIds).toContain('ALWAYS_CHECK_CONTRAINDICATIONS');
    });
  });

  describe('isActionSafe', () => {
    it('should return safe for valid actions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        { gender: 'male', medicalHistory: [] },
        { [FollicleState.INFLAMMATION]: 0.1 }
      );

      const result = isActionSafe(ctx);

      expect(result.safe).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it('should return unsafe with blockers for invalid actions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'female', age: 30 }
      );

      const result = isActionSafe(ctx);

      expect(result.safe).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers[0].severity).toBe('critical');
    });

    it('should collect warnings separately', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'male', age: 22 }
      );

      const result = isActionSafe(ctx);

      expect(result.safe).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getSafeAlternative', () => {
    it('should return alternative for blocked actions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.FINASTERIDE,
        { gender: 'female', age: 30 }
      );

      const alternative = getSafeAlternative(ctx);

      expect(alternative).toBe(TrichologyAction.MINOXIDIL_2);
    });

    it('should return null for safe actions', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        { gender: 'male' }
      );

      const alternative = getSafeAlternative(ctx);

      expect(alternative).toBeNull();
    });

    it('should return specialist for inflammation', () => {
      const ctx = createSafetyContext(
        TrichologyAction.MINOXIDIL_5,
        {},
        { [FollicleState.INFLAMMATION]: 0.5 }
      );

      const alternative = getSafeAlternative(ctx);

      expect(alternative).toBe(TrichologyAction.REFER_TO_SPECIALIST);
    });
  });
});
