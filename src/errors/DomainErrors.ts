/**
 * FolliCore Domain Errors
 *
 * Trichology-specific domain errors for business logic violations.
 * These errors represent invalid states or operations in the trichology domain.
 *
 * IEC 62304 Traceability:
 * - Each error class maps to specific use cases
 * - Safety-critical errors are explicitly marked
 *
 * @module errors
 */

import { ErrorCode, ErrorSeverity } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';
import type { FollicleState, TrichologyAction } from '../trichology/domain/TrichologyStates';

// ============================================================================
// BELIEF STATE ERRORS
// ============================================================================

/**
 * Error thrown when belief state update fails
 */
export class BeliefUpdateError extends FolliCoreError {
  constructor(
    message: string,
    context: IErrorContext & { patientId?: string; observationType?: string } = {}
  ) {
    super(
      ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
      message,
      { ...context, component: context.component ?? 'BeliefUpdater' }
    );
    this.name = 'BeliefUpdateError';
  }
}

/**
 * Error thrown when observation data is invalid for belief update
 */
export class InvalidObservationError extends FolliCoreError {
  constructor(
    message: string,
    context: IErrorContext & { observationType?: 'follicle' | 'acoustic' } = {}
  ) {
    super(
      ErrorCode.DOMAIN_BELIEF_INVALID_OBSERVATION,
      message,
      { ...context, component: context.component ?? 'ObservationValidator' }
    );
    this.name = 'InvalidObservationError';
  }
}

/**
 * Error thrown when belief state is not found for a patient
 */
export class BeliefStateNotFoundError extends FolliCoreError {
  constructor(patientId: string, context: IErrorContext = {}) {
    super(
      ErrorCode.DOMAIN_BELIEF_STATE_NOT_FOUND,
      `Belief state not found for patient. Initialize patient first.`,
      { ...context, component: context.component ?? 'FolliCoreEngine' }
    );
    this.name = 'BeliefStateNotFoundError';
  }
}

// ============================================================================
// FOLLICLE STATE ERRORS
// ============================================================================

/**
 * Error thrown when follicle state is invalid
 */
export class InvalidFollicleStateError extends FolliCoreError {
  public readonly state: string;

  constructor(state: string, context: IErrorContext = {}) {
    super(
      ErrorCode.DOMAIN_FOLLICLE_STATE_INVALID,
      `Invalid follicle state: ${state}`,
      { ...context, component: context.component ?? 'StateValidator' }
    );
    this.name = 'InvalidFollicleStateError';
    this.state = state;
  }
}

/**
 * Error thrown when state transition is not allowed
 */
export class ForbiddenStateTransitionError extends FolliCoreError {
  public readonly fromState: FollicleState;
  public readonly toState: FollicleState;

  constructor(
    fromState: FollicleState,
    toState: FollicleState,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_FOLLICLE_TRANSITION_FORBIDDEN,
      `State transition from '${fromState}' to '${toState}' is not allowed`,
      { ...context, component: context.component ?? 'TransitionModel' }
    );
    this.name = 'ForbiddenStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

// ============================================================================
// TREATMENT ERRORS
// ============================================================================

/**
 * SAFETY-CRITICAL: Treatment contraindication error
 *
 * This error is flagged as CRITICAL per CLAUDE.md Rule 1:
 * "Contraindications are absolute barriers"
 *
 * When thrown, the system MUST NOT proceed with the treatment recommendation.
 */
export class TreatmentContraindicatedError extends FolliCoreError {
  public readonly treatment: TrichologyAction;
  public readonly contraindication: string;

  constructor(
    treatment: TrichologyAction,
    contraindication: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED,
      `Treatment '${treatment}' is contraindicated: ${contraindication}`,
      { ...context, component: context.component ?? 'TreatmentRecommender' },
      { severity: ErrorSeverity.CRITICAL }
    );
    this.name = 'TreatmentContraindicatedError';
    this.treatment = treatment;
    this.contraindication = contraindication;
  }
}

/**
 * Error thrown when treatment is not applicable for current state
 */
export class TreatmentNotApplicableError extends FolliCoreError {
  public readonly treatment: TrichologyAction;
  public readonly currentState: FollicleState;

  constructor(
    treatment: TrichologyAction,
    currentState: FollicleState,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_TREATMENT_NOT_APPLICABLE,
      `Treatment '${treatment}' is not applicable for state '${currentState}'`,
      { ...context, component: context.component ?? 'TreatmentRecommender' }
    );
    this.name = 'TreatmentNotApplicableError';
    this.treatment = treatment;
    this.currentState = currentState;
  }
}

/**
 * Error thrown when treatment selection fails
 */
export class TreatmentSelectionError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.DOMAIN_TREATMENT_SELECTION_FAILED,
      message,
      { ...context, component: context.component ?? 'ThompsonSampler' }
    );
    this.name = 'TreatmentSelectionError';
  }
}

// ============================================================================
// THOMPSON SAMPLING ERRORS
// ============================================================================

/**
 * Error thrown when Thompson Sampling algorithm fails
 */
export class ThompsonSamplingError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.DOMAIN_THOMPSON_SAMPLING_FAILED,
      message,
      { ...context, component: context.component ?? 'ThompsonSampler' }
    );
    this.name = 'ThompsonSamplingError';
  }
}

/**
 * Error thrown when no eligible actions are available for Thompson Sampling
 */
export class NoEligibleActionsError extends FolliCoreError {
  public readonly checkedActions: number;
  public readonly reason: string;

  constructor(
    checkedActions: number,
    reason: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_THOMPSON_NO_ELIGIBLE_ACTIONS,
      `No eligible treatment actions found. Checked ${checkedActions} actions. Reason: ${reason}`,
      { ...context, component: context.component ?? 'ThompsonSampler' }
    );
    this.name = 'NoEligibleActionsError';
    this.checkedActions = checkedActions;
    this.reason = reason;
  }
}

// ============================================================================
// TRAJECTORY ERRORS
// ============================================================================

/**
 * Error thrown when trajectory prediction fails
 */
export class TrajectoryPredictionError extends FolliCoreError {
  public readonly horizonMonths?: number;

  constructor(
    message: string,
    horizonMonths?: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_TRAJECTORY_PREDICTION_FAILED,
      message,
      { ...context, component: context.component ?? 'TrajectoryPredictor' }
    );
    this.name = 'TrajectoryPredictionError';
    this.horizonMonths = horizonMonths;
  }
}

/**
 * Error thrown when insufficient data for trajectory prediction
 */
export class InsufficientTrajectoryDataError extends FolliCoreError {
  public readonly requiredObservations: number;
  public readonly actualObservations: number;

  constructor(
    requiredObservations: number,
    actualObservations: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_TRAJECTORY_INSUFFICIENT_DATA,
      `Insufficient data for trajectory prediction. Required: ${requiredObservations}, Actual: ${actualObservations}`,
      { ...context, component: context.component ?? 'TrajectoryPredictor' }
    );
    this.name = 'InsufficientTrajectoryDataError';
    this.requiredObservations = requiredObservations;
    this.actualObservations = actualObservations;
  }
}

// ============================================================================
// PGMU NORMS ERRORS
// ============================================================================

/**
 * Error thrown when PGMU norms are not found for given parameters
 */
export class PGMUNormsNotFoundError extends FolliCoreError {
  public readonly gender: string;
  public readonly zone: string;
  public readonly ageGroup: string;

  constructor(
    gender: string,
    zone: string,
    ageGroup: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_PGMU_NORMS_NOT_FOUND,
      `PGMU norms not found for gender=${gender}, zone=${zone}, ageGroup=${ageGroup}`,
      { ...context, component: context.component ?? 'PGMUNorms', zone: zone as IErrorContext['zone'] }
    );
    this.name = 'PGMUNormsNotFoundError';
    this.gender = gender;
    this.zone = zone;
    this.ageGroup = ageGroup;
  }
}

/**
 * Error thrown when age is out of valid range for PGMU norms
 */
export class AgeOutOfRangeError extends FolliCoreError {
  public readonly age: number;
  public readonly minAge: number;
  public readonly maxAge: number;

  constructor(
    age: number,
    minAge = 21,
    maxAge = 86,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_PGMU_AGE_OUT_OF_RANGE,
      `Age ${age} is out of valid range [${minAge}-${maxAge}] for PGMU norms`,
      { ...context, component: context.component ?? 'PGMUNorms' }
    );
    this.name = 'AgeOutOfRangeError';
    this.age = age;
    this.minAge = minAge;
    this.maxAge = maxAge;
  }
}

// ============================================================================
// PATIENT CONTEXT ERRORS
// ============================================================================

/**
 * Error thrown when patient is not initialized
 */
export class PatientNotInitializedError extends FolliCoreError {
  constructor(patientId: string, context: IErrorContext = {}) {
    super(
      ErrorCode.DOMAIN_PATIENT_NOT_INITIALIZED,
      `Patient not initialized. Call initializePatient() first.`,
      { ...context, component: context.component ?? 'FolliCoreEngine' }
    );
    this.name = 'PatientNotInitializedError';
  }
}

/**
 * Error thrown when patient context is invalid
 */
export class InvalidPatientContextError extends FolliCoreError {
  public readonly field: string;
  public readonly reason: string;

  constructor(
    field: string,
    reason: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.DOMAIN_PATIENT_CONTEXT_INVALID,
      `Invalid patient context: ${field} - ${reason}`,
      { ...context, component: context.component ?? 'PatientContextValidator' }
    );
    this.name = 'InvalidPatientContextError';
    this.field = field;
    this.reason = reason;
  }
}
