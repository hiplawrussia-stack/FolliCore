/**
 * FolliCore Base Error Class
 *
 * Provides structured error handling for medical software compliance:
 * - IEC 62304: Traceable error categorization
 * - ISO 14971: Severity classification for risk management
 * - HIPAA: Context for audit logging
 * - GDPR: Safe serialization (no PII in error messages)
 *
 * @module errors
 */

import {
  ErrorCode,
  type ErrorSeverity,
  type ErrorCategory,
  getErrorCategory,
  getDefaultSeverity,
  isSafetyCritical,
  getRiskDescription,
} from './ErrorCodes';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Error context for structured logging and tracing
 *
 * HIPAA Compliance Note:
 * - correlationId enables audit trail reconstruction
 * - Never include PHI in metadata
 */
export interface IErrorContext {
  /** Unique correlation ID for tracing (HIPAA audit) */
  correlationId?: string;
  /** Patient ID (anonymized/hashed for logging) */
  patientId?: string;
  /** Session ID if available */
  sessionId?: string;
  /** Component/module where error occurred */
  component?: string;
  /** Operation that failed */
  operation?: string;
  /** Scalp zone if applicable */
  zone?: 'temporal' | 'parietal' | 'occipital' | 'frontal' | 'vertex';
  /** Additional metadata (must not contain PHI) */
  metadata?: Record<string, unknown>;
}

/**
 * Serialized error format for API responses and logging
 *
 * GDPR Compliance Note:
 * - Client response excludes stack trace in production
 * - Internal logging may include full details
 */
export interface ISerializedError {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  isSafetyCritical: boolean;
  riskDescription: string;
  context?: Partial<IErrorContext>;
  cause?: string;
  stack?: string;
}

/**
 * Options for FolliCoreError constructor
 */
export interface IErrorOptions {
  /** Original error that caused this error */
  cause?: Error;
  /** Override default severity */
  severity?: ErrorSeverity;
  /** Is this an operational (expected) error? */
  isOperational?: boolean;
}

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for all FolliCore errors
 *
 * Provides:
 * - Structured error codes (IEC 62304 traceability)
 * - Severity classification (ISO 14971 risk management)
 * - Context for debugging (HIPAA audit compliance)
 * - Safe serialization (GDPR - no PII exposure)
 *
 * @example
 * ```typescript
 * throw new FolliCoreError(
 *   ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
 *   'Failed to update belief state for patient',
 *   {
 *     component: 'FolliCoreEngine',
 *     operation: 'updateBelief',
 *     zone: 'temporal'
 *   }
 * );
 * ```
 *
 * @example Safety-critical error
 * ```typescript
 * // This will be flagged as safety-critical
 * throw new FolliCoreError(
 *   ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED,
 *   'Finasteride contraindicated for pregnant patients',
 *   { component: 'TreatmentRecommender', patientId: 'hash_123' }
 * );
 * ```
 */
export class FolliCoreError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: IErrorContext;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;
  public readonly isSafetyCritical: boolean;
  public readonly riskDescription: string;

  constructor(
    code: ErrorCode,
    message: string,
    context: IErrorContext = {},
    options: IErrorOptions = {}
  ) {
    super(message, { cause: options.cause });

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.category = getErrorCategory(code);
    this.severity = options.severity ?? getDefaultSeverity(code);
    this.context = context;
    this.timestamp = new Date();
    this.isSafetyCritical = isSafetyCritical(code);
    this.riskDescription = getRiskDescription(this.severity);

    // Operational errors are expected and can be handled gracefully
    // Non-operational errors are programmer bugs that should crash
    this.isOperational = options.isOperational ?? true;

    // Capture stack trace, excluding constructor
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for internal logging
   *
   * Includes full details for debugging and audit
   */
  toJSON(): ISerializedError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      isSafetyCritical: this.isSafetyCritical,
      riskDescription: this.riskDescription,
      context: this.sanitizeContext(this.context),
      cause: this.cause instanceof Error ? this.cause.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Create safe version for client response
   *
   * GDPR Compliance:
   * - No stack traces
   * - No internal context details
   * - No cause chain
   */
  toClientResponse(): Pick<ISerializedError, 'code' | 'message' | 'timestamp' | 'severity'> {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      severity: this.severity,
    };
  }

  /**
   * Create HIPAA-compliant audit entry
   *
   * Includes correlation ID for audit trail reconstruction
   */
  toAuditEntry(): {
    code: ErrorCode;
    severity: ErrorSeverity;
    category: ErrorCategory;
    timestamp: string;
    correlationId?: string;
    component?: string;
    operation?: string;
    isSafetyCritical: boolean;
  } {
    return {
      code: this.code,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.context.correlationId,
      component: this.context.component,
      operation: this.context.operation,
      isSafetyCritical: this.isSafetyCritical,
    };
  }

  /**
   * Sanitize context to remove any potential PHI
   */
  private sanitizeContext(context: IErrorContext): Partial<IErrorContext> {
    // Only include safe fields
    return {
      correlationId: context.correlationId,
      sessionId: context.sessionId,
      component: context.component,
      operation: context.operation,
      zone: context.zone,
      // Exclude patientId from serialized output (use hashed version if needed)
      // Exclude metadata as it may contain sensitive info
    };
  }

  // ============================================================================
  // STATIC FACTORY METHODS
  // ============================================================================

  /**
   * Create FolliCoreError from unknown error
   *
   * Useful for wrapping external errors
   */
  static fromUnknown(
    error: unknown,
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: IErrorContext = {}
  ): FolliCoreError {
    if (error instanceof FolliCoreError) {
      return error;
    }

    if (error instanceof Error) {
      return new FolliCoreError(defaultCode, error.message, context, {
        cause: error,
      });
    }

    return new FolliCoreError(
      defaultCode,
      typeof error === 'string' ? error : 'An unknown error occurred',
      context
    );
  }

  /**
   * Check if error has a specific error code
   */
  static isErrorCode(error: unknown, code: ErrorCode): boolean {
    return error instanceof FolliCoreError && error.code === code;
  }

  /**
   * Check if error belongs to a category
   */
  static isCategory(error: unknown, category: ErrorCategory): boolean {
    return error instanceof FolliCoreError && error.category === category;
  }

  /**
   * Check if error is safety-critical
   */
  static isSafetyCriticalError(error: unknown): boolean {
    return error instanceof FolliCoreError && error.isSafetyCritical;
  }

  /**
   * Check if error is operational (expected, can be handled)
   */
  static isOperational(error: unknown): boolean {
    return error instanceof FolliCoreError && error.isOperational;
  }
}

// ============================================================================
// RESULT TYPE (FUNCTIONAL ERROR HANDLING)
// ============================================================================

/**
 * Result type for functional error handling
 *
 * Inspired by Rust's Result<T, E> pattern
 * Use this for operations that may fail with expected errors
 *
 * @example
 * ```typescript
 * function calculateFollicleAge(
 *   observation: IFollicleObservation
 * ): Result<number, FolliCoreError> {
 *   if (!isValidObservation(observation)) {
 *     return {
 *       success: false,
 *       error: new FolliCoreError(
 *         ErrorCode.VALIDATION_INVALID_FORMAT,
 *         'Invalid observation data'
 *       )
 *     };
 *   }
 *   return { success: true, value: computeAge(observation) };
 * }
 * ```
 */
export type Result<T, E extends Error = FolliCoreError> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Helper to create successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Helper to create failed result
 */
export function fail<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Helper to check if result is successful
 */
export function isOk<T, E extends Error>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success;
}

/**
 * Helper to check if result is failed
 */
export function isFail<T, E extends Error>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Unwrap result or throw error
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.value;
  }
  // TypeScript narrowing: at this point result is { success: false; error: E }
  const failedResult = result as { success: false; error: E };
  throw failedResult.error;
}

/**
 * Unwrap result or return default value
 */
export function unwrapOr<T, E extends Error>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.value : defaultValue;
}
