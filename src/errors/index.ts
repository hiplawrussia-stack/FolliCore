/**
 * FolliCore Errors Module
 *
 * Comprehensive error handling system for medical software compliance:
 * - IEC 62304: Structured error codes with traceability
 * - ISO 14971: Severity classification for risk management
 * - HIPAA: Audit-ready error logging
 * - GDPR: Safe serialization (no PII exposure)
 *
 * Usage:
 * ```typescript
 * import {
 *   FolliCoreError,
 *   ErrorCode,
 *   ErrorHandler,
 *   TreatmentContraindicatedError,
 * } from './errors';
 *
 * // Throw domain-specific error
 * throw new TreatmentContraindicatedError(
 *   TrichologyAction.FINASTERIDE,
 *   'pregnancy',
 *   { correlationId: '...' }
 * );
 *
 * // Use ErrorHandler for centralized handling
 * const handler = ErrorHandler.getInstance();
 * await handler.handle(error, { component: 'Engine' });
 * ```
 *
 * @module errors
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export {
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  getErrorCategory,
  getDefaultSeverity,
  isSafetyCritical,
  getRiskDescription,
} from './ErrorCodes';

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

export {
  FolliCoreError,
  type IErrorContext,
  type ISerializedError,
  type IErrorOptions,
  // Result type utilities
  type Result,
  ok,
  fail,
  isOk,
  isFail,
  unwrap,
  unwrapOr,
} from './FolliCoreError';

// ============================================================================
// DOMAIN ERRORS (Trichology)
// ============================================================================

export {
  // Belief state errors
  BeliefUpdateError,
  InvalidObservationError,
  BeliefStateNotFoundError,
  // Follicle state errors
  InvalidFollicleStateError,
  ForbiddenStateTransitionError,
  // Treatment errors (including safety-critical)
  TreatmentContraindicatedError,
  TreatmentNotApplicableError,
  TreatmentSelectionError,
  // Thompson Sampling errors
  ThompsonSamplingError,
  NoEligibleActionsError,
  // Trajectory errors
  TrajectoryPredictionError,
  InsufficientTrajectoryDataError,
  // PGMU norms errors
  PGMUNormsNotFoundError,
  AgeOutOfRangeError,
  // Patient context errors
  PatientNotInitializedError,
  InvalidPatientContextError,
} from './DomainErrors';

// ============================================================================
// VISION MODULE ERRORS
// ============================================================================

export {
  // Model errors
  VisionModelNotLoadedError,
  VisionInferenceError,
  VisionModelInitializationError,
  // Image processing errors
  InvalidImageFormatError,
  ImageResolutionTooLowError,
  ImageCorruptedError,
  // Segmentation errors
  SegmentationError,
  NoFolliclesDetectedError,
  // Morphometry errors
  MorphometryExtractionError,
  CalibrationMissingError,
  // Embedding errors
  EmbeddingExtractionError,
  // Analysis errors
  VisionAnalysisTimeoutError,
  LowConfidenceAnalysisError,
} from './VisionErrors';

// ============================================================================
// ACOUSTIC MODULE ERRORS
// ============================================================================

export {
  // Signal processing errors
  InvalidSignalError,
  SignalTooShortError,
  NoiseTooHighError,
  // Analysis errors
  AcousticAnalysisError,
  AcousticAnalysisTimeoutError,
  // Spectral analysis errors
  SpectralExtractionError,
  FFTError,
  // Pattern matching errors
  PatternNotRecognizedError,
  AcousticDatabaseEmptyError,
  // Model errors
  AcousticModelNotLoadedError,
} from './AcousticErrors';

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export {
  // Generic validation errors
  RequiredFieldError,
  InvalidFormatError,
  OutOfRangeError,
  InvalidTypeError,
  // Trichology-specific validation
  InvalidZoneError,
  InvalidAgeError,
  InvalidGenderError,
  // Validation helpers
  validateRequiredFields,
  validateRange,
  validateZone,
  validateGender,
  validateAge,
} from './ValidationErrors';

// ============================================================================
// APPLICATION ERRORS
// ============================================================================

export {
  // Pipeline errors
  PipelineInitializationError,
  PipelineStageError,
  PipelineTimeoutError,
  // Integration errors
  IntegrationNotReadyError,
  IntegrationError,
  // Session errors
  SessionNotFoundError,
  SessionExpiredError,
  // Export/Import errors
  ExportError,
  ImportError,
} from './ApplicationErrors';

// ============================================================================
// INFRASTRUCTURE ERRORS
// ============================================================================

export {
  // Storage errors
  StorageReadError,
  StorageWriteError,
  StorageConnectionError,
  // External service errors
  ServiceUnavailableError,
  ServiceTimeoutError,
  ServiceError,
  // Resource errors
  OutOfMemoryError,
  GPUNotAvailableError,
  // Generic errors
  UnknownError,
  InternalError,
  NotImplementedError,
} from './InfrastructureErrors';

// ============================================================================
// ERROR HANDLER
// ============================================================================

export {
  ErrorHandler,
  type IErrorHandlerConfig,
  type IErrorLogger,
  type IErrorLogEntry,
  type ISafetyEscalationHandler,
  type IRecoveryStrategy,
  type IErrorStats,
  type IRiskReport,
  // Utility functions
  getErrorHandler,
  handleError,
  handleErrorSync,
  withErrorHandling,
} from './ErrorHandler';
