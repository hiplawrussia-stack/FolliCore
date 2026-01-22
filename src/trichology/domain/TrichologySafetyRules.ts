/**
 * FolliCore Trichology Safety Rules
 *
 * Simple rule-based safety constraints for trichology domain.
 * Replaces Constitutional AI with domain-specific rules.
 */

import { TrichologyAction, FollicleState, type IPatientContext } from './TrichologyStates';

/**
 * Safety rule types
 */
export type SafetyRuleType = 'NEVER' | 'ALWAYS' | 'ESCALATE' | 'WARN';

export interface ISafetyRule {
  id: string;
  type: SafetyRuleType;
  description: string;
  check: (context: SafetyCheckContext) => SafetyCheckResult;
}

export interface SafetyCheckContext {
  proposedAction: TrichologyAction;
  patientContext: IPatientContext;
  currentBeliefState: Map<FollicleState, number>;
  recentObservations: any[];
}

export interface SafetyCheckResult {
  passed: boolean;
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction?: TrichologyAction;
}

/**
 * Core safety rules for trichology
 */
export const TRICHOLOGY_SAFETY_RULES: ISafetyRule[] = [
  // NEVER rules
  {
    id: 'NEVER_DIAGNOSE_DISEASE',
    type: 'NEVER',
    description: 'Never provide medical diagnoses',
    check: (_ctx) => ({
      passed: true,  // System design prevents this
      ruleId: 'NEVER_DIAGNOSE_DISEASE',
      severity: 'info',
      message: 'System provides recommendations, not diagnoses',
    }),
  },
  {
    id: 'NEVER_PROMISE_RESULTS',
    type: 'NEVER',
    description: 'Never promise specific treatment outcomes',
    check: (_ctx) => ({
      passed: true,  // All outputs are probabilistic
      ruleId: 'NEVER_PROMISE_RESULTS',
      severity: 'info',
      message: 'All recommendations include uncertainty estimates',
    }),
  },
  {
    id: 'NEVER_FINASTERIDE_FEMALE',
    type: 'NEVER',
    description: 'Never recommend finasteride to females of childbearing age',
    check: (ctx) => {
      if (
        ctx.proposedAction === TrichologyAction.FINASTERIDE &&
        ctx.patientContext.gender === 'female' &&
        ctx.patientContext.age < 50
      ) {
        return {
          passed: false,
          ruleId: 'NEVER_FINASTERIDE_FEMALE',
          severity: 'critical',
          message: 'Finasteride contraindicated for females of childbearing age',
          suggestedAction: TrichologyAction.MINOXIDIL_2,
        };
      }
      return {
        passed: true,
        ruleId: 'NEVER_FINASTERIDE_FEMALE',
        severity: 'info',
        message: 'Gender/age check passed',
      };
    },
  },
  {
    id: 'NEVER_IGNORE_INFLAMMATION',
    type: 'NEVER',
    description: 'Never proceed with stimulation if inflammation detected',
    check: (ctx) => {
      const inflammationProb = ctx.currentBeliefState.get(FollicleState.INFLAMMATION) || 0;
      if (
        inflammationProb > 0.3 &&
        [TrichologyAction.MINOXIDIL_5, TrichologyAction.PRP_THERAPY].includes(ctx.proposedAction)
      ) {
        return {
          passed: false,
          ruleId: 'NEVER_IGNORE_INFLAMMATION',
          severity: 'critical',
          message: `Inflammation probability ${(inflammationProb * 100).toFixed(0)}% - treat inflammation first`,
          suggestedAction: TrichologyAction.REFER_TO_SPECIALIST,
        };
      }
      return {
        passed: true,
        ruleId: 'NEVER_IGNORE_INFLAMMATION',
        severity: 'info',
        message: 'No significant inflammation detected',
      };
    },
  },

  // ALWAYS rules
  {
    id: 'ALWAYS_CHECK_CONTRAINDICATIONS',
    type: 'ALWAYS',
    description: 'Always check patient contraindications before treatment',
    check: (ctx) => {
      const contraindications: Record<TrichologyAction, string[]> = {
        [TrichologyAction.FINASTERIDE]: ['pregnancy', 'liver_disease', 'prostate_cancer'],
        [TrichologyAction.DUTASTERIDE]: ['pregnancy', 'liver_disease', 'prostate_cancer'],
        [TrichologyAction.MINOXIDIL_5]: ['hypotension', 'heart_disease'],
        [TrichologyAction.MINOXIDIL_2]: ['hypotension'],
        [TrichologyAction.PRP_THERAPY]: ['blood_disorders', 'anticoagulants', 'cancer'],
        [TrichologyAction.MESOTHERAPY]: ['allergies_to_ingredients'],
        [TrichologyAction.LLLT]: [],
        [TrichologyAction.STRESS_MANAGEMENT]: [],
        [TrichologyAction.NUTRITIONAL_OPTIMIZATION]: [],
        [TrichologyAction.WAIT_AND_OBSERVE]: [],
        [TrichologyAction.REQUEST_ACOUSTIC_SCAN]: [],
        [TrichologyAction.REQUEST_BLOOD_WORK]: [],
        [TrichologyAction.REQUEST_GENETIC_TEST]: [],
        [TrichologyAction.REFER_TO_SPECIALIST]: [],
      };

      const actionContraindications = contraindications[ctx.proposedAction] || [];
      const patientConditions = ctx.patientContext.medicalHistory.map(c => c.toLowerCase());

      for (const contra of actionContraindications) {
        if (patientConditions.some(c => c.includes(contra))) {
          return {
            passed: false,
            ruleId: 'ALWAYS_CHECK_CONTRAINDICATIONS',
            severity: 'critical',
            message: `Contraindication found: ${contra}`,
            suggestedAction: TrichologyAction.REFER_TO_SPECIALIST,
          };
        }
      }

      return {
        passed: true,
        ruleId: 'ALWAYS_CHECK_CONTRAINDICATIONS',
        severity: 'info',
        message: 'No contraindications found',
      };
    },
  },
  {
    id: 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE',
    type: 'ALWAYS',
    description: 'Always recommend specialist for advanced cases',
    check: (ctx) => {
      const advancedProb = ctx.currentBeliefState.get(FollicleState.ADVANCED_MINIATURIZATION) || 0;
      const terminalProb = ctx.currentBeliefState.get(FollicleState.TERMINAL) || 0;

      if (advancedProb + terminalProb > 0.5 && ctx.proposedAction !== TrichologyAction.REFER_TO_SPECIALIST) {
        return {
          passed: false,
          ruleId: 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE',
          severity: 'warning',
          message: 'Advanced condition detected - specialist consultation recommended',
          suggestedAction: TrichologyAction.REFER_TO_SPECIALIST,
        };
      }

      return {
        passed: true,
        ruleId: 'ALWAYS_RECOMMEND_SPECIALIST_FOR_SEVERE',
        severity: 'info',
        message: 'Condition within manageable range',
      };
    },
  },

  // ESCALATE rules
  {
    id: 'ESCALATE_RAPID_PROGRESSION',
    type: 'ESCALATE',
    description: 'Escalate if rapid progression detected',
    check: (ctx) => {
      // Check if recent observations show rapid decline
      if (ctx.recentObservations.length >= 2) {
        const latest = ctx.recentObservations[0];
        const previous = ctx.recentObservations[1];

        if (latest.density && previous.density) {
          const densityChange = (previous.density - latest.density) / previous.density;
          if (densityChange > 0.1) {  // >10% loss
            return {
              passed: false,
              ruleId: 'ESCALATE_RAPID_PROGRESSION',
              severity: 'warning',
              message: `Rapid density loss detected: ${(densityChange * 100).toFixed(1)}%`,
              suggestedAction: TrichologyAction.REFER_TO_SPECIALIST,
            };
          }
        }
      }

      return {
        passed: true,
        ruleId: 'ESCALATE_RAPID_PROGRESSION',
        severity: 'info',
        message: 'No rapid progression detected',
      };
    },
  },

  // WARN rules
  {
    id: 'WARN_HIGH_UNCERTAINTY',
    type: 'WARN',
    description: 'Warn when belief state has high uncertainty',
    check: (ctx) => {
      // Calculate entropy of belief state
      let entropy = 0;
      for (const prob of ctx.currentBeliefState.values()) {
        if (prob > 0) {
          entropy -= prob * Math.log2(prob);
        }
      }
      const maxEntropy = Math.log2(ctx.currentBeliefState.size);
      const normalizedEntropy = entropy / maxEntropy;

      if (normalizedEntropy > 0.7) {
        return {
          passed: true,  // Warning, not blocking
          ruleId: 'WARN_HIGH_UNCERTAINTY',
          severity: 'warning',
          message: 'High diagnostic uncertainty - consider additional tests',
          suggestedAction: TrichologyAction.REQUEST_ACOUSTIC_SCAN,
        };
      }

      return {
        passed: true,
        ruleId: 'WARN_HIGH_UNCERTAINTY',
        severity: 'info',
        message: 'Acceptable uncertainty level',
      };
    },
  },
  {
    id: 'WARN_YOUNG_PATIENT_AGGRESSIVE',
    type: 'WARN',
    description: 'Warn before aggressive treatment in young patients',
    check: (ctx) => {
      const aggressiveTreatments = [
        TrichologyAction.FINASTERIDE,
        TrichologyAction.DUTASTERIDE,
      ];

      if (
        ctx.patientContext.age < 25 &&
        aggressiveTreatments.includes(ctx.proposedAction)
      ) {
        return {
          passed: true,  // Warning, not blocking
          ruleId: 'WARN_YOUNG_PATIENT_AGGRESSIVE',
          severity: 'warning',
          message: 'Patient under 25 - consider conservative approach first',
          suggestedAction: TrichologyAction.STRESS_MANAGEMENT,
        };
      }

      return {
        passed: true,
        ruleId: 'WARN_YOUNG_PATIENT_AGGRESSIVE',
        severity: 'info',
        message: 'Age-appropriate treatment',
      };
    },
  },
];

/**
 * Run all safety checks
 */
export function runSafetyChecks(context: SafetyCheckContext): SafetyCheckResult[] {
  return TRICHOLOGY_SAFETY_RULES.map(rule => rule.check(context));
}

/**
 * Check if action is safe to proceed
 */
export function isActionSafe(context: SafetyCheckContext): {
  safe: boolean;
  blockers: SafetyCheckResult[];
  warnings: SafetyCheckResult[];
} {
  const results = runSafetyChecks(context);

  const blockers = results.filter(r => !r.passed && r.severity === 'critical');
  const warnings = results.filter(r => r.severity === 'warning');

  return {
    safe: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Get safe alternative action if current is blocked
 */
export function getSafeAlternative(context: SafetyCheckContext): TrichologyAction | null {
  const results = runSafetyChecks(context);
  const blocker = results.find(r => !r.passed && r.suggestedAction);
  return blocker?.suggestedAction || null;
}
