/**
 * FolliCore Domain Events
 *
 * Trichology-specific domain events for event sourcing.
 * All events are immutable and represent facts that have occurred.
 *
 * IEC 62304 Traceability:
 * - Each event type maps to specific use cases
 * - Safety-critical events are explicitly marked
 *
 * @module events
 */

import { randomUUID } from 'crypto';
import type {
  IDomainEvent,
  IEventMetadata,
  AggregateType,
} from './IEvents';
import type { FollicleState, TrichologyAction } from '../trichology/domain/TrichologyStates';

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

/**
 * All domain event types in FolliCore
 */
export const EventTypes = {
  // Patient events
  PATIENT_INITIALIZED: 'PATIENT_INITIALIZED',
  PATIENT_CONTEXT_UPDATED: 'PATIENT_CONTEXT_UPDATED',

  // Analysis session events
  ANALYSIS_SESSION_STARTED: 'ANALYSIS_SESSION_STARTED',
  ANALYSIS_SESSION_COMPLETED: 'ANALYSIS_SESSION_COMPLETED',
  ANALYSIS_SESSION_FAILED: 'ANALYSIS_SESSION_FAILED',

  // Observation events
  FOLLICLE_OBSERVATION_RECORDED: 'FOLLICLE_OBSERVATION_RECORDED',
  ACOUSTIC_OBSERVATION_RECORDED: 'ACOUSTIC_OBSERVATION_RECORDED',
  MULTIMODAL_OBSERVATION_RECORDED: 'MULTIMODAL_OBSERVATION_RECORDED',

  // Belief state events
  BELIEF_STATE_INITIALIZED: 'BELIEF_STATE_INITIALIZED',
  BELIEF_STATE_UPDATED: 'BELIEF_STATE_UPDATED',
  BELIEF_STATE_SIGNIFICANT_CHANGE: 'BELIEF_STATE_SIGNIFICANT_CHANGE',

  // Treatment events
  TREATMENT_RECOMMENDED: 'TREATMENT_RECOMMENDED',
  TREATMENT_CONTRAINDICATED: 'TREATMENT_CONTRAINDICATED',
  TREATMENT_OUTCOME_RECORDED: 'TREATMENT_OUTCOME_RECORDED',

  // Thompson Sampling events
  THOMPSON_SAMPLING_PERFORMED: 'THOMPSON_SAMPLING_PERFORMED',
  THOMPSON_ARM_UPDATED: 'THOMPSON_ARM_UPDATED',

  // Trajectory events
  TRAJECTORY_PREDICTED: 'TRAJECTORY_PREDICTED',
  TRAJECTORY_DEVIATION_DETECTED: 'TRAJECTORY_DEVIATION_DETECTED',

  // Safety events
  SAFETY_RULE_TRIGGERED: 'SAFETY_RULE_TRIGGERED',
  CONTRAINDICATION_DETECTED: 'CONTRAINDICATION_DETECTED',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// ============================================================================
// BASE EVENT FACTORY
// ============================================================================

/**
 * Create a domain event with all required fields
 */
export function createDomainEvent<TPayload>(
  eventType: EventType,
  aggregateId: string,
  aggregateType: AggregateType,
  payload: TPayload,
  metadata: IEventMetadata
): IDomainEvent<TPayload> {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId,
    aggregateType,
    timestamp: new Date(),
    version: 1,
    payload,
    metadata,
  };
}

// ============================================================================
// PATIENT EVENTS
// ============================================================================

/**
 * Patient initialization payload
 */
export interface IPatientInitializedPayload {
  patientId: string;
  age: number;
  gender: 'male' | 'female';
  medicalHistory?: string[];
  contraindications?: string[];
}

/**
 * Patient initialized event
 */
export interface IPatientInitializedEvent
  extends IDomainEvent<IPatientInitializedPayload> {
  eventType: typeof EventTypes.PATIENT_INITIALIZED;
}

/**
 * Create patient initialized event
 */
export function createPatientInitializedEvent(
  patientId: string,
  payload: IPatientInitializedPayload,
  metadata: IEventMetadata
): IPatientInitializedEvent {
  return createDomainEvent(
    EventTypes.PATIENT_INITIALIZED,
    patientId,
    'patient',
    payload,
    metadata
  ) as IPatientInitializedEvent;
}

// ============================================================================
// ANALYSIS SESSION EVENTS
// ============================================================================

/**
 * Analysis session started payload
 */
export interface IAnalysisSessionStartedPayload {
  sessionId: string;
  patientId: string;
  analysisType: 'vision' | 'acoustic' | 'multimodal';
  zones: ('temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex')[];
}

/**
 * Analysis session started event
 */
export interface IAnalysisSessionStartedEvent
  extends IDomainEvent<IAnalysisSessionStartedPayload> {
  eventType: typeof EventTypes.ANALYSIS_SESSION_STARTED;
}

/**
 * Analysis session completed payload
 */
export interface IAnalysisSessionCompletedPayload {
  sessionId: string;
  patientId: string;
  duration: number;
  observationsCount: number;
  summary: {
    dominantState: FollicleState;
    overallConfidence: number;
    zonesAnalyzed: number;
  };
}

/**
 * Analysis session completed event
 */
export interface IAnalysisSessionCompletedEvent
  extends IDomainEvent<IAnalysisSessionCompletedPayload> {
  eventType: typeof EventTypes.ANALYSIS_SESSION_COMPLETED;
}

// ============================================================================
// OBSERVATION EVENTS
// ============================================================================

/**
 * Follicle observation payload
 */
export interface IFollicleObservationPayload {
  observationId: string;
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  metrics: {
    vellus_count?: number;
    terminal_count?: number;
    miniaturized_count?: number;
    anagen_count?: number;
    telogen_count?: number;
    density?: number;
    mean_diameter?: number;
    v_t_ratio?: number;
    a_t_ratio?: number;
  };
  confidence: number;
  inferredState?: FollicleState;
}

/**
 * Follicle observation recorded event
 */
export interface IFollicleObservationRecordedEvent
  extends IDomainEvent<IFollicleObservationPayload> {
  eventType: typeof EventTypes.FOLLICLE_OBSERVATION_RECORDED;
}

/**
 * Acoustic observation payload
 */
export interface IAcousticObservationPayload {
  observationId: string;
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  structureClass: 'healthy' | 'weathered' | 'damaged';
  porosityLevel: string;
  hydrationLevel: string;
  confidence: number;
}

/**
 * Acoustic observation recorded event
 */
export interface IAcousticObservationRecordedEvent
  extends IDomainEvent<IAcousticObservationPayload> {
  eventType: typeof EventTypes.ACOUSTIC_OBSERVATION_RECORDED;
}

// ============================================================================
// BELIEF STATE EVENTS
// ============================================================================

/**
 * Belief state update payload
 */
export interface IBeliefStateUpdatedPayload {
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  previousBelief: Record<FollicleState, number>;
  newBelief: Record<FollicleState, number>;
  dominantState: FollicleState;
  confidence: number;
  observationType: 'follicle' | 'acoustic' | 'multimodal';
  changes: {
    state: FollicleState;
    previousProbability: number;
    newProbability: number;
    delta: number;
  }[];
}

/**
 * Belief state updated event
 */
export interface IBeliefStateUpdatedEvent
  extends IDomainEvent<IBeliefStateUpdatedPayload> {
  eventType: typeof EventTypes.BELIEF_STATE_UPDATED;
}

/**
 * Significant belief change payload
 */
export interface IBeliefStateSignificantChangePayload {
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  previousDominantState: FollicleState;
  newDominantState: FollicleState;
  changeType: 'improvement' | 'deterioration' | 'stabilization';
  magnitude: number;
  clinicalSignificance: 'low' | 'medium' | 'high';
}

/**
 * Belief state significant change event
 */
export interface IBeliefStateSignificantChangeEvent
  extends IDomainEvent<IBeliefStateSignificantChangePayload> {
  eventType: typeof EventTypes.BELIEF_STATE_SIGNIFICANT_CHANGE;
}

// ============================================================================
// TREATMENT EVENTS
// ============================================================================

/**
 * Treatment recommendation payload
 */
export interface ITreatmentRecommendedPayload {
  patientId: string;
  recommendedAction: TrichologyAction;
  currentState: FollicleState;
  expectedOutcome: {
    targetState: FollicleState;
    probability: number;
    timeframeMonths: number;
  };
  alternativeActions: {
    action: TrichologyAction;
    probability: number;
  }[];
  thompsonSamplingScore: number;
  confidence: number;
}

/**
 * Treatment recommended event
 */
export interface ITreatmentRecommendedEvent
  extends IDomainEvent<ITreatmentRecommendedPayload> {
  eventType: typeof EventTypes.TREATMENT_RECOMMENDED;
}

/**
 * SAFETY-CRITICAL: Treatment contraindication payload
 *
 * Per CLAUDE.md Rule 1: "Contraindications are absolute barriers"
 */
export interface ITreatmentContraindicatedPayload {
  patientId: string;
  treatment: TrichologyAction;
  contraindication: string;
  severity: 'warning' | 'absolute';
  riskDescription: string;
  alternativesAvailable: boolean;
}

/**
 * SAFETY-CRITICAL: Treatment contraindicated event
 */
export interface ITreatmentContraindicatedEvent
  extends IDomainEvent<ITreatmentContraindicatedPayload> {
  eventType: typeof EventTypes.TREATMENT_CONTRAINDICATED;
}

/**
 * Treatment outcome payload
 */
export interface ITreatmentOutcomePayload {
  patientId: string;
  treatment: TrichologyAction;
  outcome: 'success' | 'partial' | 'failure' | 'adverse';
  outcomeScore: number;
  observedStateChange?: {
    fromState: FollicleState;
    toState: FollicleState;
  };
  duration: number;
  sideEffects?: string[];
}

/**
 * Treatment outcome recorded event
 */
export interface ITreatmentOutcomeRecordedEvent
  extends IDomainEvent<ITreatmentOutcomePayload> {
  eventType: typeof EventTypes.TREATMENT_OUTCOME_RECORDED;
}

// ============================================================================
// THOMPSON SAMPLING EVENTS
// ============================================================================

/**
 * Thompson sampling payload
 */
export interface IThompsonSamplingPayload {
  patientId: string;
  currentState: FollicleState;
  sampledActions: {
    action: TrichologyAction;
    sampledValue: number;
    alpha: number;
    beta: number;
  }[];
  selectedAction: TrichologyAction;
  explorationRate: number;
}

/**
 * Thompson sampling performed event
 */
export interface IThompsonSamplingPerformedEvent
  extends IDomainEvent<IThompsonSamplingPayload> {
  eventType: typeof EventTypes.THOMPSON_SAMPLING_PERFORMED;
}

/**
 * Thompson arm update payload
 */
export interface IThompsonArmUpdatedPayload {
  action: TrichologyAction;
  previousAlpha: number;
  previousBeta: number;
  newAlpha: number;
  newBeta: number;
  outcome: 'success' | 'failure';
  totalTrials: number;
}

/**
 * Thompson arm updated event
 */
export interface IThompsonArmUpdatedEvent
  extends IDomainEvent<IThompsonArmUpdatedPayload> {
  eventType: typeof EventTypes.THOMPSON_ARM_UPDATED;
}

// ============================================================================
// TRAJECTORY EVENTS
// ============================================================================

/**
 * Trajectory prediction payload
 */
export interface ITrajectoryPredictedPayload {
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  currentState: FollicleState;
  predictions: {
    monthsAhead: number;
    predictedState: FollicleState;
    probability: number;
    confidenceInterval: [number, number];
  }[];
  assumedTreatment?: TrichologyAction;
}

/**
 * Trajectory predicted event
 */
export interface ITrajectoryPredictedEvent
  extends IDomainEvent<ITrajectoryPredictedPayload> {
  eventType: typeof EventTypes.TRAJECTORY_PREDICTED;
}

/**
 * Trajectory deviation payload
 */
export interface ITrajectoryDeviationPayload {
  patientId: string;
  zone: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  predictedState: FollicleState;
  actualState: FollicleState;
  deviationType: 'better_than_expected' | 'worse_than_expected';
  magnitude: number;
  possibleCauses: string[];
}

/**
 * Trajectory deviation detected event
 */
export interface ITrajectoryDeviationDetectedEvent
  extends IDomainEvent<ITrajectoryDeviationPayload> {
  eventType: typeof EventTypes.TRAJECTORY_DEVIATION_DETECTED;
}

// ============================================================================
// SAFETY EVENTS
// ============================================================================

/**
 * Safety rule triggered payload
 */
export interface ISafetyRuleTriggeredPayload {
  ruleId: string;
  ruleName: string;
  ruleType: 'warning' | 'block' | 'review';
  trigger: string;
  context: Record<string, unknown>;
  actionTaken: string;
}

/**
 * Safety rule triggered event
 */
export interface ISafetyRuleTriggeredEvent
  extends IDomainEvent<ISafetyRuleTriggeredPayload> {
  eventType: typeof EventTypes.SAFETY_RULE_TRIGGERED;
}

/**
 * SAFETY-CRITICAL: Contraindication detected payload
 */
export interface IContraindicationDetectedPayload {
  patientId: string;
  treatment: TrichologyAction;
  contraindication: string;
  source: 'medical_history' | 'current_condition' | 'medication' | 'allergy';
  severity: 'warning' | 'absolute';
  recommendation: string;
}

/**
 * SAFETY-CRITICAL: Contraindication detected event
 */
export interface IContraindicationDetectedEvent
  extends IDomainEvent<IContraindicationDetectedPayload> {
  eventType: typeof EventTypes.CONTRAINDICATION_DETECTED;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if event is a belief state update event
 */
export function isBeliefStateUpdatedEvent(
  event: IDomainEvent
): event is IBeliefStateUpdatedEvent {
  return event.eventType === EventTypes.BELIEF_STATE_UPDATED;
}

/**
 * Check if event is a treatment recommended event
 */
export function isTreatmentRecommendedEvent(
  event: IDomainEvent
): event is ITreatmentRecommendedEvent {
  return event.eventType === EventTypes.TREATMENT_RECOMMENDED;
}

/**
 * Check if event is a safety-critical event
 */
export function isSafetyCriticalEvent(event: IDomainEvent): boolean {
  return (
    event.eventType === EventTypes.TREATMENT_CONTRAINDICATED ||
    event.eventType === EventTypes.CONTRAINDICATION_DETECTED ||
    event.eventType === EventTypes.SAFETY_RULE_TRIGGERED
  );
}

/**
 * Check if event is an observation event
 */
export function isObservationEvent(event: IDomainEvent): boolean {
  return (
    event.eventType === EventTypes.FOLLICLE_OBSERVATION_RECORDED ||
    event.eventType === EventTypes.ACOUSTIC_OBSERVATION_RECORDED ||
    event.eventType === EventTypes.MULTIMODAL_OBSERVATION_RECORDED
  );
}
