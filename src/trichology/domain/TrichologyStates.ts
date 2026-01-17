/**
 * FolliCore Trichology Domain - State Definitions
 *
 * POMDP States for hair follicle health management.
 * These states are PARTIALLY OBSERVABLE - we infer them from observations.
 */

/**
 * Follicle lifecycle states
 * Based on hair biology + PGMU research
 */
export enum FollicleState {
  // Healthy states
  HEALTHY_ANAGEN = 'healthy_anagen',           // Active growth, normal parameters
  HEALTHY_CATAGEN = 'healthy_catagen',         // Normal transition phase
  HEALTHY_TELOGEN = 'healthy_telogen',         // Normal resting phase

  // Pathological states
  EARLY_MINIATURIZATION = 'early_miniaturization',  // Beginning of AGA
  ADVANCED_MINIATURIZATION = 'advanced_miniaturization', // Progressed AGA
  STRESS_INDUCED = 'stress_induced',           // Telogen effluvium
  INFLAMMATION = 'inflammation',               // Perifollicular inflammation
  SENILE_ALOPECIA = 'senile_alopecia',        // Age-related (PGMU norms)

  // Terminal states
  DORMANT = 'dormant',                         // Potentially recoverable
  TERMINAL = 'terminal',                       // Irreversible loss
}

/**
 * Follicle observation from Vision module
 * Based on PGMU morphometry + FotoFinder metrics
 */
export interface IFollicleObservation {
  // Morphometric (PGMU methodology)
  bulbWidth: number;           // micrometers (norm: 74.6 -> 71.2 with age)
  shaftThickness: number;      // micrometers (norm: 33.8 -> 31.8 with age)

  // Density metrics
  density: number;             // hairs per cm²
  follicularUnits: number;     // FU per cm²

  // Ratios
  anagenTelogenRatio: number;  // 0-1 (healthy ~0.85)
  vellusTerminalRatio: number; // 0-1 (healthy <0.2)

  // Zone-specific
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal';

  // Confidence
  confidence: number;          // 0-1
}

/**
 * Acoustic observation (Phase 3)
 * Based on arXiv:2506.14148
 */
export interface IAcousticObservation {
  porosity: number;            // 0-1 (lower is healthier)
  hydration: number;           // 0-1 (higher is healthier)
  structureClass: 'healthy' | 'weathered' | 'damaged';
  confidence: number;
}

/**
 * Patient context for personalization
 */
export interface IPatientContext {
  age: number;
  gender: 'male' | 'female';
  chronicStressLevel: 'low' | 'medium' | 'high';
  geneticRisk?: number;        // PRS score if available (0-1)
  medicalHistory: string[];
  currentTreatments: string[];
  treatmentHistory: ITreatmentRecord[];
}

/**
 * Treatment record for trajectory learning
 */
export interface ITreatmentRecord {
  treatment: TrichologyAction;
  startDate: Date;
  endDate?: Date;
  response: 'positive' | 'neutral' | 'negative' | 'unknown';
}

/**
 * Belief state over follicle conditions
 * This is the core POMDP belief vector
 */
export interface ITrichologyBeliefState {
  // Probability distribution over states
  stateDistribution: Map<FollicleState, number>;

  // Derived metrics
  dominantState: FollicleState;
  confidence: number;

  // Biological age estimation (PGMU)
  estimatedFollicleAge: number;
  chronologicalAge: number;
  ageDelta: number;            // Positive = accelerated aging

  // Risk scores
  progressionRisk: number;     // 0-1 risk of worsening
  recoveryPotential: number;   // 0-1 potential for improvement

  // Timestamps
  lastObservation: Date;
  beliefHistory: IBeliefSnapshot[];
}

export interface IBeliefSnapshot {
  timestamp: Date;
  stateDistribution: Map<FollicleState, number>;
  observation?: IFollicleObservation;
}

/**
 * Available treatment actions
 */
export enum TrichologyAction {
  // Pharmacological
  MINOXIDIL_2 = 'minoxidil_2%',
  MINOXIDIL_5 = 'minoxidil_5%',
  FINASTERIDE = 'finasteride',
  DUTASTERIDE = 'dutasteride',

  // Procedural
  PRP_THERAPY = 'prp_therapy',
  MESOTHERAPY = 'mesotherapy',
  LLLT = 'low_level_laser_therapy',

  // Lifestyle
  STRESS_MANAGEMENT = 'stress_management',
  NUTRITIONAL_OPTIMIZATION = 'nutritional_optimization',

  // Diagnostic
  WAIT_AND_OBSERVE = 'wait_and_observe',
  REQUEST_ACOUSTIC_SCAN = 'request_acoustic_scan',
  REQUEST_BLOOD_WORK = 'request_blood_work',
  REQUEST_GENETIC_TEST = 'request_genetic_test',

  // Escalation
  REFER_TO_SPECIALIST = 'refer_to_specialist',
}

/**
 * Action metadata for Thompson Sampling
 */
export interface IActionMetadata {
  action: TrichologyAction;

  // Prior effectiveness (from literature)
  priorSuccessRate: number;    // Beta prior alpha
  priorFailureRate: number;    // Beta prior beta

  // Constraints
  contraindications: string[];
  minAge?: number;
  maxAge?: number;
  genderSpecific?: 'male' | 'female';

  // Cost-benefit
  costLevel: 'low' | 'medium' | 'high';
  sideEffectRisk: number;      // 0-1
  timeToEffect: number;        // weeks

  // Applicable states
  applicableStates: FollicleState[];
}

/**
 * Default action metadata based on clinical evidence
 */
export const DEFAULT_ACTION_METADATA: IActionMetadata[] = [
  {
    action: TrichologyAction.MINOXIDIL_5,
    priorSuccessRate: 4,        // ~40% success from literature
    priorFailureRate: 6,
    contraindications: ['hypotension', 'pregnancy'],
    costLevel: 'low',
    sideEffectRisk: 0.1,
    timeToEffect: 16,           // 4 months
    applicableStates: [
      FollicleState.EARLY_MINIATURIZATION,
      FollicleState.STRESS_INDUCED,
      FollicleState.DORMANT,
    ],
  },
  {
    action: TrichologyAction.FINASTERIDE,
    priorSuccessRate: 5,        // ~50% success
    priorFailureRate: 5,
    contraindications: ['pregnancy', 'liver_disease'],
    genderSpecific: 'male',
    costLevel: 'medium',
    sideEffectRisk: 0.15,
    timeToEffect: 24,           // 6 months
    applicableStates: [
      FollicleState.EARLY_MINIATURIZATION,
      FollicleState.ADVANCED_MINIATURIZATION,
    ],
  },
  {
    action: TrichologyAction.STRESS_MANAGEMENT,
    priorSuccessRate: 6,        // ~60% for stress-induced
    priorFailureRate: 4,
    contraindications: [],
    costLevel: 'low',
    sideEffectRisk: 0,
    timeToEffect: 8,            // 2 months
    applicableStates: [
      FollicleState.STRESS_INDUCED,
      FollicleState.EARLY_MINIATURIZATION,
    ],
  },
  {
    action: TrichologyAction.WAIT_AND_OBSERVE,
    priorSuccessRate: 3,
    priorFailureRate: 7,
    contraindications: [],
    costLevel: 'low',
    sideEffectRisk: 0,
    timeToEffect: 0,
    applicableStates: Object.values(FollicleState) as FollicleState[],
  },
  {
    action: TrichologyAction.PRP_THERAPY,
    priorSuccessRate: 5,
    priorFailureRate: 5,
    contraindications: ['blood_disorders', 'anticoagulants'],
    costLevel: 'high',
    sideEffectRisk: 0.05,
    timeToEffect: 12,
    applicableStates: [
      FollicleState.EARLY_MINIATURIZATION,
      FollicleState.STRESS_INDUCED,
      FollicleState.DORMANT,
    ],
  },
  {
    action: TrichologyAction.REFER_TO_SPECIALIST,
    priorSuccessRate: 8,
    priorFailureRate: 2,
    contraindications: [],
    costLevel: 'medium',
    sideEffectRisk: 0,
    timeToEffect: 4,
    applicableStates: [
      FollicleState.INFLAMMATION,
      FollicleState.ADVANCED_MINIATURIZATION,
    ],
  },
];

/**
 * Transition probabilities (simplified)
 * P(next_state | current_state, action)
 */
export interface ITransitionModel {
  fromState: FollicleState;
  action: TrichologyAction;
  transitions: Map<FollicleState, number>;  // Must sum to 1
}

/**
 * Observation model
 * P(observation | state)
 */
export interface IObservationModel {
  state: FollicleState;
  expectedBulbWidth: { mean: number; std: number };
  expectedShaftThickness: { mean: number; std: number };
  expectedAnagenRatio: { mean: number; std: number };
}

/**
 * PGMU-based observation norms by age group
 */
export const PGMU_NORMS = {
  male: {
    parietal: {
      '21-35': { bulbWidth: 74.6, shaftThickness: 33.8 },
      '36-59': { bulbWidth: 73.2, shaftThickness: 32.8 },
      '61-74': { bulbWidth: 72.0, shaftThickness: 32.0 },
      '75-86': { bulbWidth: 71.2, shaftThickness: 31.8 },
    },
    temporal: {
      '21-35': { bulbWidth: 72.0, shaftThickness: 32.0 },
      '36-59': { bulbWidth: 68.0, shaftThickness: 30.0 },
      '61-74': { bulbWidth: 65.0, shaftThickness: 28.5 },
      '75-86': { bulbWidth: 64.0, shaftThickness: 28.0 },
    },
  },
  female: {
    parietal: {
      '21-35': { bulbWidth: 70.0, shaftThickness: 30.0 },
      '36-59': { bulbWidth: 68.5, shaftThickness: 29.0 },
      '61-74': { bulbWidth: 67.0, shaftThickness: 28.0 },
      '75-86': { bulbWidth: 66.5, shaftThickness: 27.5 },
    },
    temporal: {
      '21-35': { bulbWidth: 68.0, shaftThickness: 28.5 },
      '36-59': { bulbWidth: 66.0, shaftThickness: 27.5 },
      '61-74': { bulbWidth: 65.0, shaftThickness: 27.0 },
      '75-86': { bulbWidth: 64.5, shaftThickness: 26.5 },
    },
  },
};

/**
 * Get age group key from age
 */
export function getAgeGroup(age: number): '21-35' | '36-59' | '61-74' | '75-86' {
  if (age <= 35) return '21-35';
  if (age <= 59) return '36-59';
  if (age <= 74) return '61-74';
  return '75-86';
}

/**
 * Calculate follicle biological age from observation
 * Returns estimated biological age based on PGMU norms
 */
export function estimateFollicleAge(
  observation: IFollicleObservation,
  gender: 'male' | 'female'
): number {
  const norms = PGMU_NORMS[gender][observation.zone];

  // Linear interpolation between age groups
  const ageGroups = ['21-35', '36-59', '61-74', '75-86'] as const;
  const ageValues = [28, 47, 67, 80];  // Midpoints

  // Find closest match by bulb width
  let bestMatch = 0;
  let minDiff = Infinity;

  for (let i = 0; i < ageGroups.length; i++) {
    const norm = norms[ageGroups[i]];
    const diff = Math.abs(observation.bulbWidth - norm.bulbWidth);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = i;
    }
  }

  // Interpolate
  if (bestMatch === 0) {
    return ageValues[0] - (norms[ageGroups[0]].bulbWidth - observation.bulbWidth) * 2;
  }
  if (bestMatch === ageGroups.length - 1) {
    return ageValues[bestMatch] + (norms[ageGroups[bestMatch]].bulbWidth - observation.bulbWidth) * 2;
  }

  const lowerNorm = norms[ageGroups[bestMatch]];
  const upperNorm = norms[ageGroups[bestMatch + 1]];
  const ratio = (lowerNorm.bulbWidth - observation.bulbWidth) /
                (lowerNorm.bulbWidth - upperNorm.bulbWidth);

  return ageValues[bestMatch] + ratio * (ageValues[bestMatch + 1] - ageValues[bestMatch]);
}
