/**
 * FolliCore Engine
 *
 * Main engine class that integrates:
 * - POMDP Belief State management
 * - Thompson Sampling for treatment selection
 * - KalmanFormer for trajectory prediction
 * - Safety rules
 * - Explainability
 * - Event-Driven Architecture (NEW)
 *
 * Event-Driven Architecture:
 * - Emits domain events for all significant operations
 * - Supports HIPAA-compliant audit logging via EventBus
 * - Safety-critical events are explicitly marked
 */

import {
  FollicleState,
  TrichologyAction,
  type IFollicleObservation,
  type IAcousticObservation,
  type IPatientContext,
  type ITrichologyBeliefState,
  type IActionMetadata,
  type ITreatmentRecord,
  DEFAULT_ACTION_METADATA,
  estimateFollicleAge,
  getPGMUNorms,
  getAgeGroup,
} from './domain/TrichologyStates';

import {
  isActionSafe,
  getSafeAlternative,
  type SafetyCheckContext,
} from './domain/TrichologySafetyRules';

// Event-Driven Architecture imports
import type { IEventBus, IEventMetadata } from '../events/IEvents';
import { createEventMetadata } from '../events/IEvents';
import {
  EventTypes,
  createDomainEvent,
  type IPatientInitializedPayload,
  type IBeliefStateUpdatedPayload,
  type ITreatmentRecommendedPayload,
  type ITreatmentContraindicatedPayload,
  type IThompsonArmUpdatedPayload,
  type ITrajectoryPredictedPayload,
} from '../events/DomainEvents';

/**
 * Thompson Sampling arm for treatment selection
 */
interface IThompsonArm {
  action: TrichologyAction;
  alpha: number;  // Successes + prior
  beta: number;   // Failures + prior
  metadata: IActionMetadata;
}

/**
 * Treatment recommendation from the engine
 */
export interface ITreatmentRecommendation {
  primaryAction: TrichologyAction;
  confidence: number;
  expectedBenefit: number;

  // Alternative actions ranked
  alternatives: {
    action: TrichologyAction;
    score: number;
    reasoning: string;
  }[];

  // Strategy timeline
  strategy: IStrategyStep[];

  // Safety information
  safetyChecks: {
    passed: boolean;
    warnings: string[];
    blockers: string[];
  };

  // Explainability
  explanation: {
    whyThisAction: string;
    whyNotOthers: string[];
    uncertaintyNote: string;
  };
}

export interface IStrategyStep {
  step: number;
  action: TrichologyAction;
  timing: string;  // "now", "in 2 months", "if no improvement"
  condition?: string;
  expectedOutcome: string;
}

/**
 * Trajectory prediction from KalmanFormer
 */
export interface ITrajectoryPrediction {
  horizon: number;  // months
  predictedState: Map<FollicleState, number>;
  predictedMetrics: {
    density: { mean: number; confidence: number[] };
    bulbWidth: { mean: number; confidence: number[] };
  };
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

/**
 * FolliCore Engine Configuration
 */
export interface IFolliCoreConfig {
  explorationRate: number;  // Thompson Sampling exploration (0-1)
  planningHorizon: number;  // months for trajectory prediction
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';

  // Event-Driven Architecture (optional)
  eventBus?: IEventBus;     // EventBus for publishing domain events
  userId?: string;           // Clinician user ID for audit trail
  sessionId?: string;        // Current session ID for correlation
}

const DEFAULT_CONFIG: IFolliCoreConfig = {
  explorationRate: 0.1,
  planningHorizon: 12,
  riskTolerance: 'moderate',
};

/**
 * Main FolliCore Engine Class
 */
export class FolliCoreEngine {
  private config: IFolliCoreConfig;
  private patientBeliefs = new Map<string, ITrichologyBeliefState>();
  private thompsonArms = new Map<string, IThompsonArm[]>();
  // TODO: Implement treatment history tracking for outcome analysis
  // Reserved for future implementation - tracking treatment outcomes per patient
  private readonly _treatmentHistory = new Map<string, ITreatmentRecord[]>();
  // Expose for testing and future use
  public getTreatmentHistory(patientId: string): ITreatmentRecord[] | undefined {
    return this._treatmentHistory.get(patientId);
  }

  constructor(config: Partial<IFolliCoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // EVENT-DRIVEN ARCHITECTURE HELPERS
  // ============================================================================

  /**
   * Create event metadata for current context
   */
  private createMetadata(patientId?: string, zone?: IEventMetadata['zone']): IEventMetadata {
    return createEventMetadata('FolliCoreEngine', {
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      patientId,
      zone,
    });
  }

  /**
   * Publish event to EventBus if configured (fire-and-forget)
   * Events are non-blocking to maintain engine performance
   */
  private publishEvent(event: Parameters<IEventBus['publish']>[0]): void {
    if (this.config.eventBus) {
      this.config.eventBus.publish(event).catch((error: unknown) => {
        // Log but don't throw - events are best-effort
        // eslint-disable-next-line no-console
        console.error('[FolliCoreEngine] Event publish failed:', error);
      });
    }
  }

  /**
   * Set EventBus after construction
   */
  public setEventBus(eventBus: IEventBus): void {
    this.config.eventBus = eventBus;
  }

  /**
   * Set user context for audit trail
   */
  public setUserContext(userId: string, sessionId?: string): void {
    this.config.userId = userId;
    this.config.sessionId = sessionId;
  }

  /**
   * Initialize or get patient state
   *
   * @emits PATIENT_INITIALIZED - When patient is successfully initialized
   */
  public initializePatient(
    patientId: string,
    context: IPatientContext
  ): ITrichologyBeliefState {
    // Initialize uniform belief state
    const stateDistribution = new Map<FollicleState, number>();
    const states = Object.values(FollicleState);
    const uniformProb = 1 / states.length;

    for (const state of states) {
      stateDistribution.set(state as FollicleState, uniformProb);
    }

    const beliefState: ITrichologyBeliefState = {
      stateDistribution,
      dominantState: FollicleState.HEALTHY_ANAGEN,
      confidence: 0,
      estimatedFollicleAge: context.age,
      chronologicalAge: context.age,
      ageDelta: 0,
      progressionRisk: 0.5,
      recoveryPotential: 0.5,
      lastObservation: new Date(),
      beliefHistory: [],
    };

    this.patientBeliefs.set(patientId, beliefState);

    // Initialize Thompson Sampling arms
    this.initializeThompsonArms(patientId, context);

    // Emit PATIENT_INITIALIZED event
    const payload: IPatientInitializedPayload = {
      patientId,
      age: context.age,
      gender: context.gender,
      medicalHistory: context.medicalHistory,
      // Contraindications derived from medical history (e.g., "liver disease" -> finasteride contraindicated)
    };
    this.publishEvent(createDomainEvent(
      EventTypes.PATIENT_INITIALIZED,
      patientId,
      'patient',
      payload,
      this.createMetadata(patientId)
    ));

    return beliefState;
  }

  /**
   * Initialize Thompson Sampling arms for a patient
   */
  private initializeThompsonArms(patientId: string, context: IPatientContext): void {
    const arms: IThompsonArm[] = DEFAULT_ACTION_METADATA
      .filter(meta => {
        // Filter by gender if specified
        if (meta.genderSpecific && meta.genderSpecific !== context.gender) {
          return false;
        }
        // Filter by age
        if (meta.minAge && context.age < meta.minAge) {return false;}
        if (meta.maxAge && context.age > meta.maxAge) {return false;}
        return true;
      })
      .map(meta => ({
        action: meta.action,
        alpha: meta.priorSuccessRate,
        beta: meta.priorFailureRate,
        metadata: meta,
      }));

    this.thompsonArms.set(patientId, arms);
  }

  /**
   * Update belief state with new observation
   *
   * @emits BELIEF_STATE_UPDATED - When belief state changes after observation
   */
  public updateBelief(
    patientId: string,
    observation: IFollicleObservation,
    acousticObservation?: IAcousticObservation,
    context?: IPatientContext
  ): ITrichologyBeliefState {
    let belief = this.patientBeliefs.get(patientId);
    if (!belief) {
      throw new Error(`Patient ${patientId} not initialized`);
    }

    // Capture previous state for event payload
    const previousDistribution = new Map(belief.stateDistribution);
    const previousDominant = belief.dominantState;

    // Save snapshot
    belief.beliefHistory.push({
      timestamp: new Date(),
      stateDistribution: new Map(belief.stateDistribution),
      observation,
    });

    // Update belief based on observation
    const updatedDistribution = this.computeBeliefUpdate(
      belief.stateDistribution,
      observation,
      acousticObservation,
      context
    );

    // Find dominant state
    let maxProb = 0;
    let dominantState = FollicleState.HEALTHY_ANAGEN;
    for (const [state, prob] of updatedDistribution) {
      if (prob > maxProb) {
        maxProb = prob;
        dominantState = state;
      }
    }

    // Estimate follicle age
    const estimatedAge = context
      ? estimateFollicleAge(observation, context.gender)
      : belief.estimatedFollicleAge;

    // Update belief state
    belief = {
      ...belief,
      stateDistribution: updatedDistribution,
      dominantState,
      confidence: maxProb,
      estimatedFollicleAge: estimatedAge,
      ageDelta: context ? estimatedAge - context.age : belief.ageDelta,
      progressionRisk: this.computeProgressionRisk(updatedDistribution),
      recoveryPotential: this.computeRecoveryPotential(updatedDistribution),
      lastObservation: new Date(),
    };

    this.patientBeliefs.set(patientId, belief);

    // Emit BELIEF_STATE_UPDATED event
    const changes: IBeliefStateUpdatedPayload['changes'] = [];
    for (const [state, newProb] of updatedDistribution) {
      const prevProb = previousDistribution.get(state) ?? 0;
      if (Math.abs(newProb - prevProb) > 0.01) {
        changes.push({
          state,
          previousProbability: prevProb,
          newProbability: newProb,
          delta: newProb - prevProb,
        });
      }
    }

    // Convert Maps to Records for event payload
    const previousBeliefRecord: Record<FollicleState, number> = {} as Record<FollicleState, number>;
    const newBeliefRecord: Record<FollicleState, number> = {} as Record<FollicleState, number>;
    for (const [state, prob] of previousDistribution) {
      previousBeliefRecord[state] = prob; // eslint-disable-line security/detect-object-injection
    }
    for (const [state, prob] of updatedDistribution) {
      newBeliefRecord[state] = prob; // eslint-disable-line security/detect-object-injection
    }

    const eventPayload: IBeliefStateUpdatedPayload = {
      patientId,
      zone: observation.zone,
      previousBelief: previousBeliefRecord,
      newBelief: newBeliefRecord,
      dominantState,
      confidence: maxProb,
      observationType: acousticObservation ? 'multimodal' : 'follicle',
      changes,
    };
    this.publishEvent(createDomainEvent(
      EventTypes.BELIEF_STATE_UPDATED,
      patientId,
      'belief_state',
      eventPayload,
      this.createMetadata(patientId, observation.zone)
    ));

    // Check for significant change (dominant state changed)
    if (previousDominant !== dominantState) {
      // eslint-disable-next-line no-console
      console.debug(`[FolliCoreEngine] Significant belief change: ${previousDominant} → ${dominantState}`);
    }

    return belief;
  }

  /**
   * Compute belief update (simplified Bayesian update)
   */
  private computeBeliefUpdate(
    priorDistribution: Map<FollicleState, number>,
    observation: IFollicleObservation,
    acousticObservation?: IAcousticObservation,
    context?: IPatientContext
  ): Map<FollicleState, number> {
    const posterior = new Map<FollicleState, number>();

    // Observation likelihood for each state
    const likelihoods = this.computeObservationLikelihoods(
      observation,
      acousticObservation,
      context
    );

    // Bayesian update: P(state|obs) ∝ P(obs|state) * P(state)
    let totalProb = 0;
    for (const [state, prior] of priorDistribution) {
      const likelihood = likelihoods.get(state) || 0.1;
      const unnormalizedPosterior = likelihood * prior;
      posterior.set(state, unnormalizedPosterior);
      totalProb += unnormalizedPosterior;
    }

    // Normalize
    for (const [state, prob] of posterior) {
      posterior.set(state, prob / totalProb);
    }

    return posterior;
  }

  /**
   * Compute observation likelihoods for each state
   */
  private computeObservationLikelihoods(
    observation: IFollicleObservation,
    acousticObservation?: IAcousticObservation,
    context?: IPatientContext
  ): Map<FollicleState, number> {
    const likelihoods = new Map<FollicleState, number>();

    // Get expected norms
    const gender = context?.gender || 'male';
    const age = context?.age || 40;
    const ageGroup = getAgeGroup(age);
    const norms = getPGMUNorms(gender, observation.zone, ageGroup);

    // Deviation from normal
    const bulbDeviation = (observation.bulbWidth - norms.bulbWidth) / norms.bulbWidth;
    // Note: shaftDeviation reserved for future miniaturization detection enhancement
    const shaftDeviation = (observation.shaftThickness - norms.shaftThickness) / norms.shaftThickness;
    void shaftDeviation; // Reserved for future use in miniaturization detection
    const anagenRatio = observation.anagenTelogenRatio;
    const vellusRatio = observation.vellusTerminalRatio;

    // Healthy states: close to norms
    likelihoods.set(
      FollicleState.HEALTHY_ANAGEN,
      this.gaussianLikelihood(bulbDeviation, 0, 0.1) *
      this.gaussianLikelihood(anagenRatio, 0.85, 0.1)
    );

    likelihoods.set(
      FollicleState.HEALTHY_CATAGEN,
      this.gaussianLikelihood(anagenRatio, 0.7, 0.1)
    );

    likelihoods.set(
      FollicleState.HEALTHY_TELOGEN,
      this.gaussianLikelihood(anagenRatio, 0.6, 0.15)
    );

    // Pathological states
    likelihoods.set(
      FollicleState.EARLY_MINIATURIZATION,
      this.gaussianLikelihood(bulbDeviation, -0.1, 0.05) *
      this.gaussianLikelihood(vellusRatio, 0.3, 0.1)
    );

    likelihoods.set(
      FollicleState.ADVANCED_MINIATURIZATION,
      this.gaussianLikelihood(bulbDeviation, -0.2, 0.05) *
      this.gaussianLikelihood(vellusRatio, 0.5, 0.1)
    );

    likelihoods.set(
      FollicleState.STRESS_INDUCED,
      this.gaussianLikelihood(anagenRatio, 0.5, 0.1)
    );

    likelihoods.set(
      FollicleState.SENILE_ALOPECIA,
      this.gaussianLikelihood(bulbDeviation, -0.05, 0.03) *
      (age > 60 ? 1.5 : 0.5)
    );

    // Acoustic-based adjustments
    if (acousticObservation) {
      if (acousticObservation.structureClass === 'damaged') {
        // Increase likelihood of stress-induced
        const current = likelihoods.get(FollicleState.STRESS_INDUCED) || 0;
        likelihoods.set(FollicleState.STRESS_INDUCED, current * 1.5);
      }
    }

    // Inflammation (would need additional visual markers)
    likelihoods.set(FollicleState.INFLAMMATION, 0.1);  // Low prior without specific markers

    // Terminal states
    likelihoods.set(
      FollicleState.DORMANT,
      observation.density < 50 ? 0.3 : 0.05
    );

    likelihoods.set(
      FollicleState.TERMINAL,
      observation.density < 20 ? 0.2 : 0.01
    );

    return likelihoods;
  }

  /**
   * Gaussian likelihood function
   */
  private gaussianLikelihood(value: number, mean: number, std: number): number {
    const diff = value - mean;
    return Math.exp(-(diff * diff) / (2 * std * std));
  }

  /**
   * Compute progression risk from belief distribution
   */
  private computeProgressionRisk(distribution: Map<FollicleState, number>): number {
    const riskWeights: Record<FollicleState, number> = {
      [FollicleState.HEALTHY_ANAGEN]: 0.1,
      [FollicleState.HEALTHY_CATAGEN]: 0.15,
      [FollicleState.HEALTHY_TELOGEN]: 0.2,
      [FollicleState.EARLY_MINIATURIZATION]: 0.5,
      [FollicleState.ADVANCED_MINIATURIZATION]: 0.8,
      [FollicleState.STRESS_INDUCED]: 0.4,
      [FollicleState.INFLAMMATION]: 0.6,
      [FollicleState.SENILE_ALOPECIA]: 0.3,
      [FollicleState.DORMANT]: 0.7,
      [FollicleState.TERMINAL]: 0.95,
    };

    let risk = 0;
    for (const [state, prob] of distribution) {
      // eslint-disable-next-line security/detect-object-injection -- state is typed FollicleState enum
      risk += prob * (riskWeights[state] || 0.5);
    }
    return risk;
  }

  /**
   * Compute recovery potential from belief distribution
   */
  private computeRecoveryPotential(distribution: Map<FollicleState, number>): number {
    const recoveryWeights: Record<FollicleState, number> = {
      [FollicleState.HEALTHY_ANAGEN]: 0.95,
      [FollicleState.HEALTHY_CATAGEN]: 0.9,
      [FollicleState.HEALTHY_TELOGEN]: 0.85,
      [FollicleState.EARLY_MINIATURIZATION]: 0.7,
      [FollicleState.ADVANCED_MINIATURIZATION]: 0.4,
      [FollicleState.STRESS_INDUCED]: 0.8,
      [FollicleState.INFLAMMATION]: 0.6,
      [FollicleState.SENILE_ALOPECIA]: 0.3,
      [FollicleState.DORMANT]: 0.5,
      [FollicleState.TERMINAL]: 0.05,
    };

    let potential = 0;
    for (const [state, prob] of distribution) {
      // eslint-disable-next-line security/detect-object-injection -- state is typed FollicleState enum
      potential += prob * (recoveryWeights[state] || 0.5);
    }
    return potential;
  }

  /**
   * Get treatment recommendation using Thompson Sampling
   *
   * @emits TREATMENT_RECOMMENDED - When a treatment is recommended
   * @emits TREATMENT_CONTRAINDICATED - SAFETY-CRITICAL: When treatment has contraindications
   */
  public getRecommendation(
    patientId: string,
    context: IPatientContext
  ): ITreatmentRecommendation {
    const belief = this.patientBeliefs.get(patientId);
    if (!belief) {
      throw new Error(`Patient ${patientId} not initialized`);
    }

    const arms = this.thompsonArms.get(patientId);
    if (!arms) {
      throw new Error(`Thompson arms not initialized for ${patientId}`);
    }

    // Filter applicable arms for current state
    const applicableArms = arms.filter(arm =>
      arm.metadata.applicableStates.includes(belief.dominantState)
    );

    // Thompson Sampling: sample from Beta distributions
    const samples = applicableArms.map(arm => ({
      arm,
      sample: this.sampleBeta(arm.alpha, arm.beta),
    }));

    // Sort by sampled value
    samples.sort((a, b) => b.sample - a.sample);

    // Get top action (guaranteed to exist since arms are initialized)
    const topArm = samples[0];
    if (!topArm) {
      throw new Error('No treatment arms available for sampling');
    }
    const originalAction = topArm.arm.action;
    let primaryAction = originalAction;

    // Safety check
    const safetyContext: SafetyCheckContext = {
      proposedAction: primaryAction,
      patientContext: context,
      currentBeliefState: belief.stateDistribution,
      recentObservations: belief.beliefHistory.slice(-3).map(h => h.observation).filter((o): o is IFollicleObservation => o !== undefined),
    };

    const safetyResult = isActionSafe(safetyContext);

    if (!safetyResult.safe) {
      // SAFETY-CRITICAL: Emit TREATMENT_CONTRAINDICATED event
      for (const blocker of safetyResult.blockers) {
        const contraindicationPayload: ITreatmentContraindicatedPayload = {
          patientId,
          treatment: originalAction,
          contraindication: blocker.ruleId,
          severity: 'absolute',
          riskDescription: blocker.message,
          alternativesAvailable: true,
        };
        this.publishEvent(createDomainEvent(
          EventTypes.TREATMENT_CONTRAINDICATED,
          patientId,
          'treatment_recommendation',
          contraindicationPayload,
          this.createMetadata(patientId)
        ));
      }

      // Get safe alternative
      const alternative = getSafeAlternative(safetyContext);
      if (alternative) {
        primaryAction = alternative;
      }
    }

    // Build strategy
    const strategy = this.buildStrategy(belief, primaryAction, context);

    // Build alternatives
    const alternatives = samples.slice(1, 4).map(s => ({
      action: s.arm.action,
      score: s.sample,
      reasoning: this.getActionReasoning(s.arm, belief),
    }));

    // Build explanation
    const explanation = this.buildExplanation(topArm.arm, belief, context);

    const recommendation: ITreatmentRecommendation = {
      primaryAction,
      confidence: topArm.sample,
      expectedBenefit: this.computeExpectedBenefit(topArm.arm, belief),
      alternatives,
      strategy,
      safetyChecks: {
        passed: safetyResult.safe,
        warnings: safetyResult.warnings.map(w => w.message),
        blockers: safetyResult.blockers.map(b => b.message),
      },
      explanation,
    };

    // Emit TREATMENT_RECOMMENDED event
    const recommendationPayload: ITreatmentRecommendedPayload = {
      patientId,
      recommendedAction: primaryAction,
      currentState: belief.dominantState,
      expectedOutcome: {
        targetState: FollicleState.HEALTHY_ANAGEN, // Simplified target
        probability: recommendation.expectedBenefit,
        timeframeMonths: 6,
      },
      alternativeActions: alternatives.map(alt => ({
        action: alt.action,
        probability: alt.score,
      })),
      thompsonSamplingScore: topArm.sample,
      confidence: recommendation.confidence,
    };
    this.publishEvent(createDomainEvent(
      EventTypes.TREATMENT_RECOMMENDED,
      patientId,
      'treatment_recommendation',
      recommendationPayload,
      this.createMetadata(patientId)
    ));

    return recommendation;
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Approximation using gamma samples
    const gammaAlpha = this.sampleGamma(alpha);
    const gammaBeta = this.sampleGamma(beta);
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  /**
   * Sample from Gamma distribution (Marsaglia and Tsang's method)
   */
  private sampleGamma(shape: number): number {
    if (shape < 1) {
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller)
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Build treatment strategy timeline
   */
  private buildStrategy(
    belief: ITrichologyBeliefState,
    primaryAction: TrichologyAction,
    context: IPatientContext
  ): IStrategyStep[] {
    const strategy: IStrategyStep[] = [];

    // Step 1: Primary action
    strategy.push({
      step: 1,
      action: primaryAction,
      timing: 'now',
      expectedOutcome: this.getExpectedOutcome(primaryAction, belief),
    });

    // Step 2: Follow-up
    strategy.push({
      step: 2,
      action: TrichologyAction.WAIT_AND_OBSERVE,
      timing: 'in 2 months',
      condition: 'Repeat trichoscopy to assess response',
      expectedOutcome: 'Measure change in density and bulb width',
    });

    // Step 3: Conditional escalation
    if (belief.dominantState === FollicleState.EARLY_MINIATURIZATION) {
      strategy.push({
        step: 3,
        action: context.gender === 'male'
          ? TrichologyAction.FINASTERIDE
          : TrichologyAction.PRP_THERAPY,
        timing: 'if no improvement at 4 months',
        condition: 'Density continues to decline',
        expectedOutcome: 'Additional intervention to halt progression',
      });
    }

    return strategy;
  }

  /**
   * Get expected outcome description
   */
  private getExpectedOutcome(action: TrichologyAction, _belief: ITrichologyBeliefState): string {
    const outcomes: Record<TrichologyAction, string> = {
      [TrichologyAction.MINOXIDIL_2]: 'Stabilization of density, potential 10-15% improvement in 6 months',
      [TrichologyAction.MINOXIDIL_5]: 'Stabilization of density, potential 15-20% improvement in 6 months',
      [TrichologyAction.FINASTERIDE]: 'Halt miniaturization progression, potential regrowth in 6-12 months',
      [TrichologyAction.DUTASTERIDE]: 'Strong DHT blockade, significant improvement expected',
      [TrichologyAction.PRP_THERAPY]: 'Stimulate dormant follicles, improvement in 3-6 months',
      [TrichologyAction.MESOTHERAPY]: 'Nutrient delivery to follicles, modest improvement',
      [TrichologyAction.LLLT]: 'Stimulate blood flow, gradual improvement over 6 months',
      [TrichologyAction.STRESS_MANAGEMENT]: 'Reduce cortisol, recovery expected in 2-4 months',
      [TrichologyAction.NUTRITIONAL_OPTIMIZATION]: 'Support follicle health, gradual improvement',
      [TrichologyAction.WAIT_AND_OBSERVE]: 'Monitor for changes, reassess in follow-up',
      [TrichologyAction.REQUEST_ACOUSTIC_SCAN]: 'Detailed structural analysis of hair shaft',
      [TrichologyAction.REQUEST_BLOOD_WORK]: 'Rule out systemic causes (thyroid, iron, etc.)',
      [TrichologyAction.REQUEST_GENETIC_TEST]: 'Assess genetic predisposition (PRS)',
      [TrichologyAction.REFER_TO_SPECIALIST]: 'Expert evaluation for complex cases',
    };

    // eslint-disable-next-line security/detect-object-injection -- action is typed TrichologyAction enum
    return outcomes[action] || 'Outcome varies by individual response';
  }

  /**
   * Get reasoning for action selection
   */
  private getActionReasoning(arm: IThompsonArm, belief: ITrichologyBeliefState): string {
    const successRate = arm.alpha / (arm.alpha + arm.beta);
    return `Success rate: ${(successRate * 100).toFixed(0)}%, ` +
           `applicable for ${belief.dominantState}, ` +
           `side effect risk: ${(arm.metadata.sideEffectRisk * 100).toFixed(0)}%`;
  }

  /**
   * Build explanation for recommendation
   */
  private buildExplanation(
    arm: IThompsonArm,
    belief: ITrichologyBeliefState,
    context: IPatientContext
  ): ITreatmentRecommendation['explanation'] {
    const ageDelta = belief.ageDelta;
    const dominantState = belief.dominantState;

    let whyThisAction = '';
    if (ageDelta > 10) {
      whyThisAction += `Follicle biological age is ${ageDelta.toFixed(0)} years ahead of chronological age. `;
    }
    whyThisAction += `Primary condition detected: ${dominantState.replace(/_/g, ' ')}. `;
    whyThisAction += `${arm.action.replace(/_/g, ' ')} has ${((arm.alpha / (arm.alpha + arm.beta)) * 100).toFixed(0)}% historical success rate for this condition.`;

    const whyNotOthers: string[] = [];
    if (context.gender === 'female') {
      whyNotOthers.push('Finasteride excluded: contraindicated for females');
    }
    if ((belief.stateDistribution.get(FollicleState.INFLAMMATION) ?? 0) > 0.2) {
      whyNotOthers.push('Aggressive stimulation avoided due to inflammation risk');
    }

    let uncertaintyNote = '';
    if (belief.confidence < 0.5) {
      uncertaintyNote = `Note: Diagnostic confidence is ${(belief.confidence * 100).toFixed(0)}%. Consider additional tests to refine assessment.`;
    } else {
      uncertaintyNote = `Diagnostic confidence: ${(belief.confidence * 100).toFixed(0)}%`;
    }

    return {
      whyThisAction,
      whyNotOthers,
      uncertaintyNote,
    };
  }

  /**
   * Compute expected benefit of action
   */
  private computeExpectedBenefit(arm: IThompsonArm, belief: ITrichologyBeliefState): number {
    const successRate = arm.alpha / (arm.alpha + arm.beta);
    const recoveryPotential = belief.recoveryPotential;
    return successRate * recoveryPotential * (1 - arm.metadata.sideEffectRisk);
  }

  /**
   * Update Thompson Sampling based on treatment outcome
   *
   * @emits THOMPSON_ARM_UPDATED - When Thompson arm parameters are updated
   */
  public updateOutcome(
    patientId: string,
    action: TrichologyAction,
    outcome: 'positive' | 'neutral' | 'negative'
  ): void {
    const arms = this.thompsonArms.get(patientId);
    if (!arms) {return;}

    const arm = arms.find(a => a.action === action);
    if (!arm) {return;}

    // Capture previous values for event
    const previousAlpha = arm.alpha;
    const previousBeta = arm.beta;

    switch (outcome) {
      case 'positive':
        arm.alpha += 1;
        break;
      case 'negative':
        arm.beta += 1;
        break;
      case 'neutral':
        // Small updates for neutral
        arm.alpha += 0.3;
        arm.beta += 0.3;
        break;
    }

    // Emit THOMPSON_ARM_UPDATED event
    const payload: IThompsonArmUpdatedPayload = {
      action,
      previousAlpha,
      previousBeta,
      newAlpha: arm.alpha,
      newBeta: arm.beta,
      outcome: outcome === 'positive' ? 'success' : 'failure',
      totalTrials: Math.round(arm.alpha + arm.beta),
    };
    this.publishEvent(createDomainEvent(
      EventTypes.THOMPSON_ARM_UPDATED,
      patientId,
      'patient',
      payload,
      this.createMetadata(patientId)
    ));
  }

  /**
   * Get current belief state
   */
  public getBeliefState(patientId: string): ITrichologyBeliefState | undefined {
    return this.patientBeliefs.get(patientId);
  }

  /**
   * Predict trajectory (simplified KalmanFormer-style prediction)
   *
   * @emits TRAJECTORY_PREDICTED - When trajectory prediction is performed
   */
  public predictTrajectory(
    patientId: string,
    horizonMonths = 12
  ): ITrajectoryPrediction {
    const belief = this.patientBeliefs.get(patientId);
    if (!belief) {
      throw new Error(`Patient ${patientId} not initialized`);
    }

    // Simplified trajectory prediction based on current state
    const progressionRisk = belief.progressionRisk;

    // Predict future state distribution
    const predictedState = new Map<FollicleState, number>();
    for (const [state, prob] of belief.stateDistribution) {
      // States tend to progress toward worse conditions without treatment
      let adjustedProb = prob;
      if (state === FollicleState.EARLY_MINIATURIZATION) {
        adjustedProb *= (1 + progressionRisk * 0.5);
      }
      if (state === FollicleState.HEALTHY_ANAGEN) {
        adjustedProb *= (1 - progressionRisk * 0.3);
      }
      predictedState.set(state, adjustedProb);
    }

    // Normalize
    let total = 0;
    for (const prob of predictedState.values()) {total += prob;}
    for (const [state, prob] of predictedState) {
      predictedState.set(state, prob / total);
    }

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining';
    if (progressionRisk > 0.6) {
      trend = 'declining';
    } else if (progressionRisk < 0.3) {
      trend = 'improving';
    } else {
      trend = 'stable';
    }

    const prediction: ITrajectoryPrediction = {
      horizon: horizonMonths,
      predictedState,
      predictedMetrics: {
        density: {
          mean: 100 * (1 - progressionRisk * 0.2),
          confidence: [90 * (1 - progressionRisk * 0.3), 110 * (1 - progressionRisk * 0.1)],
        },
        bulbWidth: {
          mean: 70 * (1 - progressionRisk * 0.1),
          confidence: [65, 75],
        },
      },
      trend,
      confidence: belief.confidence * 0.8,  // Confidence decreases with prediction horizon
    };

    // Emit TRAJECTORY_PREDICTED event
    // Find predicted dominant state
    let maxProb = 0;
    let predictedDominant = belief.dominantState;
    for (const [state, prob] of predictedState) {
      if (prob > maxProb) {
        maxProb = prob;
        predictedDominant = state;
      }
    }

    const trajectoryPayload: ITrajectoryPredictedPayload = {
      patientId,
      zone: 'vertex', // Default zone for aggregate prediction
      currentState: belief.dominantState,
      predictions: [
        {
          monthsAhead: horizonMonths,
          predictedState: predictedDominant,
          probability: maxProb,
          confidenceInterval: [
            maxProb * 0.8,
            Math.min(1, maxProb * 1.2),
          ],
        },
      ],
    };
    this.publishEvent(createDomainEvent(
      EventTypes.TRAJECTORY_PREDICTED,
      patientId,
      'patient',
      trajectoryPayload,
      this.createMetadata(patientId)
    ));

    return prediction;
  }
}

/**
 * Factory function
 */
export function createFolliCoreEngine(config?: Partial<IFolliCoreConfig>): FolliCoreEngine {
  return new FolliCoreEngine(config);
}
