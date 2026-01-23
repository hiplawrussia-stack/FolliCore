/**
 * FolliCore Error Codes
 *
 * Categorized by layer following DDD principles and IEC 62304 requirements:
 * - DOMAIN_* : Business logic violations (trichology domain)
 * - VISION_* : Vision module errors (image analysis)
 * - ACOUSTIC_* : Acoustic module errors (ultrasound analysis)
 * - APP_* : Application/Use case errors
 * - INFRA_* : Infrastructure/Technical errors
 * - VALIDATION_* : Input validation errors
 *
 * ISO 14971 Risk Management Integration:
 * - Each error code maps to a severity level
 * - Critical errors trigger immediate safety protocols
 *
 * References:
 * - IEC 62304:2015 Software Safety Classification
 * - ISO 14971:2019 Risk Management for Medical Devices
 * - CLAUDE.md Safety Rules for FolliCore
 *
 * @see https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling/
 */

// ============================================================================
// ERROR CODES ENUM
// ============================================================================

export enum ErrorCode {
  // ============================================
  // Domain Layer Errors (Trichology Business Logic)
  // ============================================

  /** Belief state errors */
  DOMAIN_BELIEF_UPDATE_FAILED = 'DOMAIN_BELIEF_UPDATE_FAILED',
  DOMAIN_BELIEF_INVALID_OBSERVATION = 'DOMAIN_BELIEF_INVALID_OBSERVATION',
  DOMAIN_BELIEF_STATE_NOT_FOUND = 'DOMAIN_BELIEF_STATE_NOT_FOUND',
  DOMAIN_BELIEF_INCONSISTENT = 'DOMAIN_BELIEF_INCONSISTENT',

  /** Follicle state errors */
  DOMAIN_FOLLICLE_STATE_INVALID = 'DOMAIN_FOLLICLE_STATE_INVALID',
  DOMAIN_FOLLICLE_TRANSITION_FORBIDDEN = 'DOMAIN_FOLLICLE_TRANSITION_FORBIDDEN',

  /** Treatment recommendation errors */
  DOMAIN_TREATMENT_CONTRAINDICATED = 'DOMAIN_TREATMENT_CONTRAINDICATED',
  DOMAIN_TREATMENT_NOT_APPLICABLE = 'DOMAIN_TREATMENT_NOT_APPLICABLE',
  DOMAIN_TREATMENT_SELECTION_FAILED = 'DOMAIN_TREATMENT_SELECTION_FAILED',

  /** Thompson Sampling errors */
  DOMAIN_THOMPSON_SAMPLING_FAILED = 'DOMAIN_THOMPSON_SAMPLING_FAILED',
  DOMAIN_THOMPSON_NO_ELIGIBLE_ACTIONS = 'DOMAIN_THOMPSON_NO_ELIGIBLE_ACTIONS',

  /** Trajectory prediction errors */
  DOMAIN_TRAJECTORY_PREDICTION_FAILED = 'DOMAIN_TRAJECTORY_PREDICTION_FAILED',
  DOMAIN_TRAJECTORY_INSUFFICIENT_DATA = 'DOMAIN_TRAJECTORY_INSUFFICIENT_DATA',

  /** PGMU norms errors */
  DOMAIN_PGMU_NORMS_NOT_FOUND = 'DOMAIN_PGMU_NORMS_NOT_FOUND',
  DOMAIN_PGMU_AGE_OUT_OF_RANGE = 'DOMAIN_PGMU_AGE_OUT_OF_RANGE',

  /** Patient context errors */
  DOMAIN_PATIENT_NOT_INITIALIZED = 'DOMAIN_PATIENT_NOT_INITIALIZED',
  DOMAIN_PATIENT_CONTEXT_INVALID = 'DOMAIN_PATIENT_CONTEXT_INVALID',

  // ============================================
  // Vision Module Errors (Image Analysis)
  // ============================================

  /** Model errors */
  VISION_MODEL_NOT_LOADED = 'VISION_MODEL_NOT_LOADED',
  VISION_MODEL_INFERENCE_FAILED = 'VISION_MODEL_INFERENCE_FAILED',
  VISION_MODEL_INITIALIZATION_FAILED = 'VISION_MODEL_INITIALIZATION_FAILED',

  /** Image processing errors */
  VISION_IMAGE_INVALID_FORMAT = 'VISION_IMAGE_INVALID_FORMAT',
  VISION_IMAGE_RESOLUTION_TOO_LOW = 'VISION_IMAGE_RESOLUTION_TOO_LOW',
  VISION_IMAGE_CORRUPTED = 'VISION_IMAGE_CORRUPTED',

  /** Segmentation errors */
  VISION_SEGMENTATION_FAILED = 'VISION_SEGMENTATION_FAILED',
  VISION_SEGMENTATION_NO_FOLLICLES = 'VISION_SEGMENTATION_NO_FOLLICLES',

  /** Morphometry errors */
  VISION_MORPHOMETRY_EXTRACTION_FAILED = 'VISION_MORPHOMETRY_EXTRACTION_FAILED',
  VISION_MORPHOMETRY_CALIBRATION_MISSING = 'VISION_MORPHOMETRY_CALIBRATION_MISSING',

  /** Embedding errors */
  VISION_EMBEDDING_EXTRACTION_FAILED = 'VISION_EMBEDDING_EXTRACTION_FAILED',

  /** Analysis errors */
  VISION_ANALYSIS_TIMEOUT = 'VISION_ANALYSIS_TIMEOUT',
  VISION_ANALYSIS_LOW_CONFIDENCE = 'VISION_ANALYSIS_LOW_CONFIDENCE',

  // ============================================
  // Acoustic Module Errors (Ultrasound Analysis)
  // ============================================

  /** Signal processing errors */
  ACOUSTIC_SIGNAL_INVALID = 'ACOUSTIC_SIGNAL_INVALID',
  ACOUSTIC_SIGNAL_TOO_SHORT = 'ACOUSTIC_SIGNAL_TOO_SHORT',
  ACOUSTIC_SIGNAL_NOISE_TOO_HIGH = 'ACOUSTIC_SIGNAL_NOISE_TOO_HIGH',

  /** Analysis errors */
  ACOUSTIC_ANALYSIS_FAILED = 'ACOUSTIC_ANALYSIS_FAILED',
  ACOUSTIC_ANALYSIS_TIMEOUT = 'ACOUSTIC_ANALYSIS_TIMEOUT',

  /** Spectral analysis errors */
  ACOUSTIC_SPECTRAL_EXTRACTION_FAILED = 'ACOUSTIC_SPECTRAL_EXTRACTION_FAILED',
  ACOUSTIC_FFT_FAILED = 'ACOUSTIC_FFT_FAILED',

  /** Pattern matching errors */
  ACOUSTIC_PATTERN_NOT_RECOGNIZED = 'ACOUSTIC_PATTERN_NOT_RECOGNIZED',
  ACOUSTIC_DATABASE_EMPTY = 'ACOUSTIC_DATABASE_EMPTY',

  /** Model errors */
  ACOUSTIC_MODEL_NOT_LOADED = 'ACOUSTIC_MODEL_NOT_LOADED',

  // ============================================
  // Application Layer Errors (Use Cases)
  // ============================================

  /** Pipeline errors */
  APP_PIPELINE_INITIALIZATION_FAILED = 'APP_PIPELINE_INITIALIZATION_FAILED',
  APP_PIPELINE_STAGE_FAILED = 'APP_PIPELINE_STAGE_FAILED',
  APP_PIPELINE_TIMEOUT = 'APP_PIPELINE_TIMEOUT',

  /** Integration errors */
  APP_INTEGRATION_NOT_READY = 'APP_INTEGRATION_NOT_READY',
  APP_INTEGRATION_FAILED = 'APP_INTEGRATION_FAILED',

  /** Session errors */
  APP_SESSION_NOT_FOUND = 'APP_SESSION_NOT_FOUND',
  APP_SESSION_EXPIRED = 'APP_SESSION_EXPIRED',

  /** Export/Import errors */
  APP_EXPORT_FAILED = 'APP_EXPORT_FAILED',
  APP_IMPORT_FAILED = 'APP_IMPORT_FAILED',

  // ============================================
  // Infrastructure Layer Errors (Technical)
  // ============================================

  /** Storage errors */
  INFRA_STORAGE_READ_FAILED = 'INFRA_STORAGE_READ_FAILED',
  INFRA_STORAGE_WRITE_FAILED = 'INFRA_STORAGE_WRITE_FAILED',
  INFRA_STORAGE_CONNECTION_FAILED = 'INFRA_STORAGE_CONNECTION_FAILED',

  /** External service errors */
  INFRA_SERVICE_UNAVAILABLE = 'INFRA_SERVICE_UNAVAILABLE',
  INFRA_SERVICE_TIMEOUT = 'INFRA_SERVICE_TIMEOUT',
  INFRA_SERVICE_ERROR = 'INFRA_SERVICE_ERROR',

  /** Resource errors */
  INFRA_OUT_OF_MEMORY = 'INFRA_OUT_OF_MEMORY',
  INFRA_GPU_NOT_AVAILABLE = 'INFRA_GPU_NOT_AVAILABLE',

  // ============================================
  // Validation Errors (Input)
  // ============================================

  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_TYPE = 'VALIDATION_INVALID_TYPE',
  VALIDATION_INVALID_ZONE = 'VALIDATION_INVALID_ZONE',
  VALIDATION_INVALID_AGE = 'VALIDATION_INVALID_AGE',
  VALIDATION_INVALID_GENDER = 'VALIDATION_INVALID_GENDER',

  // ============================================
  // Generic/Unknown Errors
  // ============================================

  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

// ============================================================================
// ERROR SEVERITY (ISO 14971 aligned)
// ============================================================================

/**
 * Error severity levels aligned with ISO 14971 risk management
 *
 * Mapping to ISO 14971 severity of harm:
 * - LOW: Negligible - no injury expected
 * - MEDIUM: Minor - temporary discomfort, no medical intervention
 * - HIGH: Serious - medical intervention required
 * - CRITICAL: Death or permanent impairment possible
 */
export enum ErrorSeverity {
  /** Informational - no action needed, negligible impact */
  LOW = 'low',
  /** Warning - should be investigated, minor impact */
  MEDIUM = 'medium',
  /** Error - requires attention, serious impact possible */
  HIGH = 'high',
  /** Critical - immediate action required, safety-critical */
  CRITICAL = 'critical',
}

// ============================================================================
// ERROR CATEGORY
// ============================================================================

/**
 * Error category for classification and routing
 */
export enum ErrorCategory {
  /** Trichology business logic violations */
  DOMAIN = 'domain',
  /** Vision module (image analysis) failures */
  VISION = 'vision',
  /** Acoustic module (ultrasound analysis) failures */
  ACOUSTIC = 'acoustic',
  /** Application/use case failures */
  APPLICATION = 'application',
  /** Infrastructure/technical issues */
  INFRASTRUCTURE = 'infrastructure',
  /** Input validation failures */
  VALIDATION = 'validation',
  /** Unknown/unclassified errors */
  UNKNOWN = 'unknown',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get error category from error code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  if (code.startsWith('DOMAIN_')) {
    return ErrorCategory.DOMAIN;
  }
  if (code.startsWith('VISION_')) {
    return ErrorCategory.VISION;
  }
  if (code.startsWith('ACOUSTIC_')) {
    return ErrorCategory.ACOUSTIC;
  }
  if (code.startsWith('APP_')) {
    return ErrorCategory.APPLICATION;
  }
  if (code.startsWith('INFRA_')) {
    return ErrorCategory.INFRASTRUCTURE;
  }
  if (code.startsWith('VALIDATION_')) {
    return ErrorCategory.VALIDATION;
  }
  return ErrorCategory.UNKNOWN;
}

/**
 * Get default severity for error code
 *
 * Severity mapping follows CLAUDE.md safety rules:
 * - Treatment-related errors: HIGH (may affect patient safety)
 * - Contraindication errors: CRITICAL (CLAUDE.md Rule 1)
 * - Vision/Acoustic analysis: MEDIUM (diagnostic, not therapeutic)
 * - Validation errors: LOW (input issues)
 */
export function getDefaultSeverity(code: ErrorCode): ErrorSeverity {
  // CRITICAL: Treatment contraindication (CLAUDE.md Rule 1)
  if (code === ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED) {
    return ErrorSeverity.CRITICAL;
  }

  // HIGH: Treatment-related errors (may affect recommendations)
  if (
    code.includes('TREATMENT') ||
    code.includes('THOMPSON') ||
    code === ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED
  ) {
    return ErrorSeverity.HIGH;
  }

  // HIGH: Infrastructure failures
  if (code.startsWith('INFRA_')) {
    return ErrorSeverity.HIGH;
  }

  // HIGH: Internal/Unknown errors
  if (code === ErrorCode.INTERNAL_ERROR || code === ErrorCode.UNKNOWN_ERROR) {
    return ErrorSeverity.HIGH;
  }

  // MEDIUM: Domain and analysis errors
  if (
    code.startsWith('DOMAIN_') ||
    code.startsWith('VISION_') ||
    code.startsWith('ACOUSTIC_') ||
    code.startsWith('APP_')
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // LOW: Validation errors
  if (code.startsWith('VALIDATION_')) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Check if error code requires immediate attention (safety-critical)
 *
 * Per CLAUDE.md: Safety > Ethics > Standards > Features
 */
export function isSafetyCritical(code: ErrorCode): boolean {
  return (
    code === ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED ||
    getDefaultSeverity(code) === ErrorSeverity.CRITICAL
  );
}

/**
 * Get ISO 14971 risk level description for error
 */
export function getRiskDescription(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'Negligible - No injury or health damage expected';
    case ErrorSeverity.MEDIUM:
      return 'Minor - Temporary discomfort, self-resolving';
    case ErrorSeverity.HIGH:
      return 'Serious - May require medical intervention';
    case ErrorSeverity.CRITICAL:
      return 'Critical - Death or permanent impairment possible';
  }
}
