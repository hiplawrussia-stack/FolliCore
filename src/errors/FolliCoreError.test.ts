/**
 * FolliCore Error Module Tests
 *
 * Comprehensive tests for:
 * - Base error class (FolliCoreError)
 * - Error codes and utilities
 * - Error handler singleton
 * - Domain-specific errors
 * - Validation errors
 * - Result type utilities
 *
 * @module errors/tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Base error
  FolliCoreError,
  type IErrorContext,
  // Error codes
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  getErrorCategory,
  getDefaultSeverity,
  isSafetyCritical,
  getRiskDescription,
  // Result type utilities
  ok,
  fail,
  isOk,
  isFail,
  unwrap,
  unwrapOr,
  type Result,
  // Error handler
  ErrorHandler,
  getErrorHandler,
  handleError,
  handleErrorSync,
  // Domain errors
  BeliefUpdateError,
  InvalidObservationError,
  BeliefStateNotFoundError,
  InvalidFollicleStateError,
  ForbiddenStateTransitionError,
  TreatmentContraindicatedError,
  TreatmentNotApplicableError,
  TreatmentSelectionError,
  ThompsonSamplingError,
  NoEligibleActionsError,
  TrajectoryPredictionError,
  InsufficientTrajectoryDataError,
  PGMUNormsNotFoundError,
  AgeOutOfRangeError,
  PatientNotInitializedError,
  InvalidPatientContextError,
  // Validation errors
  RequiredFieldError,
  InvalidFormatError,
  OutOfRangeError,
  InvalidTypeError,
  InvalidZoneError,
  InvalidAgeError,
  InvalidGenderError,
  validateRequiredFields,
  validateRange,
  validateZone,
  validateGender,
  validateAge,
  // Infrastructure errors
  UnknownError,
  InternalError,
  NotImplementedError,
} from './index';

// ============================================================================
// ERROR CODES TESTS
// ============================================================================

describe('ErrorCodes', () => {
  describe('getErrorCategory', () => {
    it('should return DOMAIN for DOMAIN_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED)).toBe(
        ErrorCategory.DOMAIN
      );
      expect(getErrorCategory(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED)).toBe(
        ErrorCategory.DOMAIN
      );
    });

    it('should return VISION for VISION_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.VISION_MODEL_NOT_LOADED)).toBe(
        ErrorCategory.VISION
      );
      expect(getErrorCategory(ErrorCode.VISION_IMAGE_INVALID_FORMAT)).toBe(
        ErrorCategory.VISION
      );
    });

    it('should return ACOUSTIC for ACOUSTIC_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.ACOUSTIC_SIGNAL_INVALID)).toBe(
        ErrorCategory.ACOUSTIC
      );
      expect(getErrorCategory(ErrorCode.ACOUSTIC_ANALYSIS_FAILED)).toBe(
        ErrorCategory.ACOUSTIC
      );
    });

    it('should return APPLICATION for APP_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.APP_PIPELINE_INITIALIZATION_FAILED)).toBe(
        ErrorCategory.APPLICATION
      );
      expect(getErrorCategory(ErrorCode.APP_SESSION_NOT_FOUND)).toBe(
        ErrorCategory.APPLICATION
      );
    });

    it('should return INFRASTRUCTURE for INFRA_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.INFRA_STORAGE_READ_FAILED)).toBe(
        ErrorCategory.INFRASTRUCTURE
      );
      expect(getErrorCategory(ErrorCode.INFRA_SERVICE_UNAVAILABLE)).toBe(
        ErrorCategory.INFRASTRUCTURE
      );
    });

    it('should return VALIDATION for VALIDATION_ prefixed codes', () => {
      expect(getErrorCategory(ErrorCode.VALIDATION_REQUIRED_FIELD)).toBe(
        ErrorCategory.VALIDATION
      );
      expect(getErrorCategory(ErrorCode.VALIDATION_INVALID_FORMAT)).toBe(
        ErrorCategory.VALIDATION
      );
    });

    it('should return UNKNOWN for generic codes', () => {
      expect(getErrorCategory(ErrorCode.UNKNOWN_ERROR)).toBe(ErrorCategory.UNKNOWN);
      expect(getErrorCategory(ErrorCode.INTERNAL_ERROR)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('getDefaultSeverity', () => {
    it('should return CRITICAL for DOMAIN_TREATMENT_CONTRAINDICATED', () => {
      expect(getDefaultSeverity(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED)).toBe(
        ErrorSeverity.CRITICAL
      );
    });

    it('should return HIGH for treatment-related errors', () => {
      expect(getDefaultSeverity(ErrorCode.DOMAIN_TREATMENT_SELECTION_FAILED)).toBe(
        ErrorSeverity.HIGH
      );
      expect(getDefaultSeverity(ErrorCode.DOMAIN_THOMPSON_SAMPLING_FAILED)).toBe(
        ErrorSeverity.HIGH
      );
    });

    it('should return HIGH for infrastructure errors', () => {
      expect(getDefaultSeverity(ErrorCode.INFRA_STORAGE_READ_FAILED)).toBe(
        ErrorSeverity.HIGH
      );
      expect(getDefaultSeverity(ErrorCode.INFRA_SERVICE_UNAVAILABLE)).toBe(
        ErrorSeverity.HIGH
      );
    });

    it('should return MEDIUM for domain and analysis errors', () => {
      expect(getDefaultSeverity(ErrorCode.DOMAIN_BELIEF_STATE_NOT_FOUND)).toBe(
        ErrorSeverity.MEDIUM
      );
      expect(getDefaultSeverity(ErrorCode.VISION_SEGMENTATION_FAILED)).toBe(
        ErrorSeverity.MEDIUM
      );
    });

    it('should return LOW for validation errors', () => {
      expect(getDefaultSeverity(ErrorCode.VALIDATION_REQUIRED_FIELD)).toBe(
        ErrorSeverity.LOW
      );
      expect(getDefaultSeverity(ErrorCode.VALIDATION_INVALID_FORMAT)).toBe(
        ErrorSeverity.LOW
      );
    });
  });

  describe('isSafetyCritical', () => {
    it('should return true for DOMAIN_TREATMENT_CONTRAINDICATED', () => {
      expect(isSafetyCritical(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED)).toBe(true);
    });

    it('should return false for non-critical errors', () => {
      expect(isSafetyCritical(ErrorCode.VALIDATION_REQUIRED_FIELD)).toBe(false);
      expect(isSafetyCritical(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED)).toBe(false);
    });
  });

  describe('getRiskDescription', () => {
    it('should return correct descriptions for each severity', () => {
      expect(getRiskDescription(ErrorSeverity.LOW)).toContain('Negligible');
      expect(getRiskDescription(ErrorSeverity.MEDIUM)).toContain('Minor');
      expect(getRiskDescription(ErrorSeverity.HIGH)).toContain('Serious');
      expect(getRiskDescription(ErrorSeverity.CRITICAL)).toContain('Critical');
    });
  });
});

// ============================================================================
// BASE ERROR CLASS TESTS
// ============================================================================

describe('FolliCoreError', () => {
  describe('constructor', () => {
    it('should create error with correct properties', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
        'Test error message',
        { correlationId: 'test-123', component: 'TestComponent' }
      );

      expect(error.code).toBe(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED);
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.DOMAIN);
      // DOMAIN_BELIEF_UPDATE_FAILED is HIGH because belief updates affect treatment recommendations
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context.correlationId).toBe('test-123');
      expect(error.context.component).toBe('TestComponent');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.isOperational).toBe(true);
      expect(error.isSafetyCritical).toBe(false);
    });

    it('should maintain prototype chain for instanceof', () => {
      const error = new FolliCoreError(ErrorCode.UNKNOWN_ERROR, 'Test');
      expect(error instanceof FolliCoreError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should allow severity override', () => {
      const error = new FolliCoreError(
        ErrorCode.VALIDATION_REQUIRED_FIELD,
        'Test',
        {},
        { severity: ErrorSeverity.HIGH }
      );
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should set cause from options', () => {
      const cause = new Error('Original error');
      const error = new FolliCoreError(
        ErrorCode.UNKNOWN_ERROR,
        'Wrapper error',
        {},
        { cause }
      );
      expect(error.cause).toBe(cause);
    });

    it('should mark DOMAIN_TREATMENT_CONTRAINDICATED as safety-critical', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED,
        'Treatment contraindicated'
      );
      expect(error.isSafetyCritical).toBe(true);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('toJSON', () => {
    it('should serialize error correctly', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
        'Test error',
        { correlationId: 'json-test', component: 'Serializer' }
      );

      const json = error.toJSON();

      expect(json.code).toBe(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED);
      expect(json.message).toBe('Test error');
      expect(json.category).toBe(ErrorCategory.DOMAIN);
      // DOMAIN_BELIEF_UPDATE_FAILED is HIGH because belief updates affect treatment recommendations
      expect(json.severity).toBe(ErrorSeverity.HIGH);
      expect(json.timestamp).toBeDefined();
      expect(json.isSafetyCritical).toBe(false);
      expect(json.riskDescription).toBeDefined();
      expect(json.context?.correlationId).toBe('json-test');
    });

    it('should exclude patientId from context (GDPR compliance)', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_PATIENT_NOT_INITIALIZED,
        'Patient error',
        { patientId: 'patient-123', correlationId: 'test' }
      );

      const json = error.toJSON();
      expect(json.context?.patientId).toBeUndefined();
    });

    it('should include cause message if present', () => {
      const cause = new Error('Original cause');
      const error = new FolliCoreError(
        ErrorCode.UNKNOWN_ERROR,
        'Wrapper',
        {},
        { cause }
      );

      const json = error.toJSON();
      expect(json.cause).toBe('Original cause');
    });
  });

  describe('toClientResponse', () => {
    it('should return safe client-facing error', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
        'Belief update failed',
        { correlationId: 'internal-id', component: 'Engine' }
      );

      const response = error.toClientResponse();

      expect(response.code).toBe(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED);
      expect(response.message).toBe('Belief update failed');
      expect(response.timestamp).toBeDefined();
      expect(response.severity).toBeDefined();
      expect((response as Record<string, unknown>).context).toBeUndefined();
      expect((response as Record<string, unknown>).stack).toBeUndefined();
      expect((response as Record<string, unknown>).cause).toBeUndefined();
    });
  });

  describe('toAuditEntry', () => {
    it('should return HIPAA-compliant audit entry', () => {
      const error = new FolliCoreError(
        ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED,
        'Treatment blocked',
        { correlationId: 'audit-123', component: 'SafetyChecker', operation: 'checkContraindications' }
      );

      const audit = error.toAuditEntry();

      expect(audit.code).toBe(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED);
      expect(audit.severity).toBe(ErrorSeverity.CRITICAL);
      expect(audit.category).toBe(ErrorCategory.DOMAIN);
      expect(audit.correlationId).toBe('audit-123');
      expect(audit.component).toBe('SafetyChecker');
      expect(audit.operation).toBe('checkContraindications');
      expect(audit.isSafetyCritical).toBe(true);
      expect(audit.timestamp).toBeDefined();
    });
  });

  describe('static methods', () => {
    describe('fromUnknown', () => {
      it('should return same error if already FolliCoreError', () => {
        const original = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        const result = FolliCoreError.fromUnknown(original);
        expect(result).toBe(original);
      });

      it('should wrap standard Error', () => {
        const original = new Error('Standard error');
        const result = FolliCoreError.fromUnknown(original);

        expect(result).toBeInstanceOf(FolliCoreError);
        expect(result.message).toBe('Standard error');
        expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(result.cause).toBe(original);
      });

      it('should convert string to error', () => {
        const result = FolliCoreError.fromUnknown('String error');
        expect(result.message).toBe('String error');
      });

      it('should handle unknown values', () => {
        const result = FolliCoreError.fromUnknown({ weird: 'object' });
        expect(result.message).toBe('An unknown error occurred');
      });

      it('should use custom error code if provided', () => {
        const result = FolliCoreError.fromUnknown(
          new Error('Test'),
          ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED
        );
        expect(result.code).toBe(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED);
      });
    });

    describe('isErrorCode', () => {
      it('should return true for matching error code', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        expect(FolliCoreError.isErrorCode(error, ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED)).toBe(true);
      });

      it('should return false for non-matching error code', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        expect(FolliCoreError.isErrorCode(error, ErrorCode.UNKNOWN_ERROR)).toBe(false);
      });

      it('should return false for non-FolliCoreError', () => {
        const error = new Error('Test');
        expect(FolliCoreError.isErrorCode(error, ErrorCode.UNKNOWN_ERROR)).toBe(false);
      });
    });

    describe('isCategory', () => {
      it('should return true for matching category', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        expect(FolliCoreError.isCategory(error, ErrorCategory.DOMAIN)).toBe(true);
      });

      it('should return false for non-matching category', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        expect(FolliCoreError.isCategory(error, ErrorCategory.VISION)).toBe(false);
      });
    });

    describe('isSafetyCriticalError', () => {
      it('should return true for safety-critical errors', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED, 'Test');
        expect(FolliCoreError.isSafetyCriticalError(error)).toBe(true);
      });

      it('should return false for non-critical errors', () => {
        const error = new FolliCoreError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'Test');
        expect(FolliCoreError.isSafetyCriticalError(error)).toBe(false);
      });
    });

    describe('isOperational', () => {
      it('should return true for operational errors by default', () => {
        const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
        expect(FolliCoreError.isOperational(error)).toBe(true);
      });

      it('should return false for non-operational errors', () => {
        const error = new FolliCoreError(
          ErrorCode.INTERNAL_ERROR,
          'Bug',
          {},
          { isOperational: false }
        );
        expect(FolliCoreError.isOperational(error)).toBe(false);
      });
    });
  });
});

// ============================================================================
// RESULT TYPE TESTS
// ============================================================================

describe('Result Type Utilities', () => {
  describe('ok', () => {
    it('should create successful result', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      expect((result as { success: true; value: number }).value).toBe(42);
    });
  });

  describe('fail', () => {
    it('should create failed result', () => {
      const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
      const result = fail(error);
      expect(result.success).toBe(false);
      expect((result as { success: false; error: FolliCoreError }).error).toBe(error);
    });
  });

  describe('isOk', () => {
    it('should return true for successful result', () => {
      const result: Result<number, FolliCoreError> = ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for failed result', () => {
      const result: Result<number, FolliCoreError> = fail(
        new FolliCoreError(ErrorCode.UNKNOWN_ERROR, 'Test')
      );
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isFail', () => {
    it('should return true for failed result', () => {
      const result: Result<number, FolliCoreError> = fail(
        new FolliCoreError(ErrorCode.UNKNOWN_ERROR, 'Test')
      );
      expect(isFail(result)).toBe(true);
    });

    it('should return false for successful result', () => {
      const result: Result<number, FolliCoreError> = ok(42);
      expect(isFail(result)).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('should return value for successful result', () => {
      const result: Result<number, FolliCoreError> = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw for failed result', () => {
      const error = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test error');
      const result: Result<number, FolliCoreError> = fail(error);
      expect(() => unwrap(result)).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for successful result', () => {
      const result: Result<number, FolliCoreError> = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for failed result', () => {
      const result: Result<number, FolliCoreError> = fail(
        new FolliCoreError(ErrorCode.UNKNOWN_ERROR, 'Test')
      );
      expect(unwrapOr(result, 100)).toBe(100);
    });
  });
});

// ============================================================================
// ERROR HANDLER TESTS
// ============================================================================

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.resetInstance();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const handler1 = ErrorHandler.getInstance();
      const handler2 = ErrorHandler.getInstance();
      expect(handler1).toBe(handler2);
    });

    it('should reset instance correctly', () => {
      const handler1 = ErrorHandler.getInstance();
      ErrorHandler.resetInstance();
      const handler2 = ErrorHandler.getInstance();
      expect(handler1).not.toBe(handler2);
    });

    it('should provide global getter', () => {
      const handler = getErrorHandler();
      expect(handler).toBe(ErrorHandler.getInstance());
    });
  });

  describe('handle', () => {
    it('should convert unknown errors to FolliCoreError', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      const result = await handler.handle(new Error('Standard error'));

      expect(result).toBeInstanceOf(FolliCoreError);
      expect(result.message).toBe('Standard error');
    });

    it('should return existing FolliCoreError unchanged', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      const original = new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test');
      const result = await handler.handle(original);

      expect(result).toBe(original);
    });

    it('should update statistics', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test'));
      await handler.handle(new FolliCoreError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'Test'));

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.byCategory[ErrorCategory.DOMAIN]).toBe(1);
      expect(stats.byCategory[ErrorCategory.VALIDATION]).toBe(1);
    });

    it('should call safety escalation handler for critical errors', async () => {
      const escalationHandler = {
        escalate: vi.fn(),
      };

      const handler = ErrorHandler.getInstance();
      handler.configure({
        enableConsoleLog: false,
        enableSafetyEscalation: true,
        safetyEscalationHandler: escalationHandler,
      });

      const criticalError = new FolliCoreError(
        ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED,
        'Contraindicated'
      );

      await handler.handle(criticalError);

      expect(escalationHandler.escalate).toHaveBeenCalledWith(criticalError);
    });

    it('should track safety-critical count', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(
        new FolliCoreError(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED, 'Test')
      );

      const stats = handler.getStats();
      expect(stats.safetyCriticalCount).toBe(1);
    });
  });

  describe('handleSync', () => {
    it('should handle errors synchronously', () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      const result = handler.handleSync(new Error('Sync error'));

      expect(result).toBeInstanceOf(FolliCoreError);
      expect(result.message).toBe('Sync error');
    });
  });

  describe('getStats and resetStats', () => {
    it('should return correct statistics', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(
        new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test 1')
      );
      await handler.handle(
        new FolliCoreError(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED, 'Test 2')
      );
      await handler.handle(
        new FolliCoreError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'Test 3')
      );

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.byCategory[ErrorCategory.DOMAIN]).toBe(2);
      expect(stats.byCategory[ErrorCategory.VALIDATION]).toBe(1);
      expect(stats.safetyCriticalCount).toBe(1);
      expect(stats.lastError).toBeDefined();
    });

    it('should reset statistics', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(new FolliCoreError(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, 'Test'));

      handler.resetStats();
      const stats = handler.getStats();

      expect(stats.totalErrors).toBe(0);
      expect(stats.safetyCriticalCount).toBe(0);
    });
  });

  describe('createRiskReport', () => {
    it('should generate ISO 14971 risk report', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(
        new FolliCoreError(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED, 'Critical')
      );
      await handler.handle(
        new FolliCoreError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'Low')
      );

      const report = handler.createRiskReport();

      expect(report.reportDate).toBeDefined();
      expect(report.totalErrorsAnalyzed).toBe(2);
      expect(report.safetyCriticalCount).toBe(1);
      expect(report.safetyCriticalRatio).toBe(0.5);
      expect(report.riskAssessment).toBe('critical');
      expect(report.recommendations).toContain(
        'CRITICAL: Safety-critical errors detected. Review contraindication handling.'
      );
    });

    it('should return low risk for no critical errors', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      await handler.handle(
        new FolliCoreError(ErrorCode.VALIDATION_REQUIRED_FIELD, 'Low')
      );

      const report = handler.createRiskReport();
      expect(report.riskAssessment).toBe('low');
    });
  });

  describe('utility functions', () => {
    it('handleError should use global handler', async () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      const result = await handleError(new Error('Utility error'));

      expect(result).toBeInstanceOf(FolliCoreError);
    });

    it('handleErrorSync should use global handler', () => {
      const handler = ErrorHandler.getInstance();
      handler.configure({ enableConsoleLog: false });

      const result = handleErrorSync(new Error('Sync utility error'));

      expect(result).toBeInstanceOf(FolliCoreError);
    });
  });
});

// ============================================================================
// DOMAIN ERRORS TESTS
// ============================================================================

describe('Domain Errors', () => {
  describe('BeliefUpdateError', () => {
    it('should create error with correct code and defaults', () => {
      const error = new BeliefUpdateError('Update failed');

      expect(error.code).toBe(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED);
      expect(error.name).toBe('BeliefUpdateError');
      expect(error.context.component).toBe('BeliefUpdater');
    });
  });

  describe('InvalidObservationError', () => {
    it('should create error with observation type', () => {
      const error = new InvalidObservationError('Invalid data', {
        observationType: 'follicle',
      });

      expect(error.code).toBe(ErrorCode.DOMAIN_BELIEF_INVALID_OBSERVATION);
      expect(error.name).toBe('InvalidObservationError');
    });
  });

  describe('BeliefStateNotFoundError', () => {
    it('should create error with patient reference', () => {
      const error = new BeliefStateNotFoundError('patient-123');

      expect(error.code).toBe(ErrorCode.DOMAIN_BELIEF_STATE_NOT_FOUND);
      expect(error.message).toContain('Initialize patient first');
    });
  });

  describe('InvalidFollicleStateError', () => {
    it('should include invalid state in error', () => {
      const error = new InvalidFollicleStateError('invalid_state');

      expect(error.code).toBe(ErrorCode.DOMAIN_FOLLICLE_STATE_INVALID);
      expect(error.state).toBe('invalid_state');
    });
  });

  describe('ForbiddenStateTransitionError', () => {
    it('should include transition details', () => {
      const error = new ForbiddenStateTransitionError('active', 'miniaturized');

      expect(error.code).toBe(ErrorCode.DOMAIN_FOLLICLE_TRANSITION_FORBIDDEN);
      expect(error.fromState).toBe('active');
      expect(error.toState).toBe('miniaturized');
      expect(error.message).toContain('active');
      expect(error.message).toContain('miniaturized');
    });
  });

  describe('TreatmentContraindicatedError', () => {
    it('should be marked as CRITICAL (CLAUDE.md Rule 1)', () => {
      const error = new TreatmentContraindicatedError('finasteride', 'pregnancy');

      expect(error.code).toBe(ErrorCode.DOMAIN_TREATMENT_CONTRAINDICATED);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.isSafetyCritical).toBe(true);
      expect(error.treatment).toBe('finasteride');
      expect(error.contraindication).toBe('pregnancy');
    });
  });

  describe('TreatmentNotApplicableError', () => {
    it('should include treatment and state', () => {
      const error = new TreatmentNotApplicableError('finasteride', 'atrophied');

      expect(error.code).toBe(ErrorCode.DOMAIN_TREATMENT_NOT_APPLICABLE);
      expect(error.treatment).toBe('finasteride');
      expect(error.currentState).toBe('atrophied');
    });
  });

  describe('NoEligibleActionsError', () => {
    it('should include checked actions count', () => {
      const error = new NoEligibleActionsError(5, 'All contraindicated');

      expect(error.code).toBe(ErrorCode.DOMAIN_THOMPSON_NO_ELIGIBLE_ACTIONS);
      expect(error.checkedActions).toBe(5);
      expect(error.reason).toBe('All contraindicated');
    });
  });

  describe('TrajectoryPredictionError', () => {
    it('should include horizon months', () => {
      const error = new TrajectoryPredictionError('Prediction failed', 12);

      expect(error.code).toBe(ErrorCode.DOMAIN_TRAJECTORY_PREDICTION_FAILED);
      expect(error.horizonMonths).toBe(12);
    });
  });

  describe('InsufficientTrajectoryDataError', () => {
    it('should include observation counts', () => {
      const error = new InsufficientTrajectoryDataError(3, 1);

      expect(error.code).toBe(ErrorCode.DOMAIN_TRAJECTORY_INSUFFICIENT_DATA);
      expect(error.requiredObservations).toBe(3);
      expect(error.actualObservations).toBe(1);
    });
  });

  describe('PGMUNormsNotFoundError', () => {
    it('should include PGMU parameters', () => {
      const error = new PGMUNormsNotFoundError('male', 'vertex', '30-39');

      expect(error.code).toBe(ErrorCode.DOMAIN_PGMU_NORMS_NOT_FOUND);
      expect(error.gender).toBe('male');
      expect(error.zone).toBe('vertex');
      expect(error.ageGroup).toBe('30-39');
    });
  });

  describe('AgeOutOfRangeError', () => {
    it('should include age boundaries', () => {
      const error = new AgeOutOfRangeError(15, 21, 86);

      expect(error.code).toBe(ErrorCode.DOMAIN_PGMU_AGE_OUT_OF_RANGE);
      expect(error.age).toBe(15);
      expect(error.minAge).toBe(21);
      expect(error.maxAge).toBe(86);
    });
  });

  describe('PatientNotInitializedError', () => {
    it('should suggest initialization', () => {
      const error = new PatientNotInitializedError('patient-123');

      expect(error.code).toBe(ErrorCode.DOMAIN_PATIENT_NOT_INITIALIZED);
      expect(error.message).toContain('initializePatient()');
    });
  });

  describe('InvalidPatientContextError', () => {
    it('should include field and reason', () => {
      const error = new InvalidPatientContextError('age', 'must be positive');

      expect(error.code).toBe(ErrorCode.DOMAIN_PATIENT_CONTEXT_INVALID);
      expect(error.field).toBe('age');
      expect(error.reason).toBe('must be positive');
    });
  });
});

// ============================================================================
// VALIDATION ERRORS TESTS
// ============================================================================

describe('Validation Errors', () => {
  describe('RequiredFieldError', () => {
    it('should include field name', () => {
      const error = new RequiredFieldError('patientId');

      expect(error.code).toBe(ErrorCode.VALIDATION_REQUIRED_FIELD);
      expect(error.fieldName).toBe('patientId');
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('InvalidFormatError', () => {
    it('should include field and expected format', () => {
      const error = new InvalidFormatError('email', 'user@domain.com');

      expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_FORMAT);
      expect(error.fieldName).toBe('email');
      expect(error.expectedFormat).toBe('user@domain.com');
    });
  });

  describe('OutOfRangeError', () => {
    it('should include range details', () => {
      const error = new OutOfRangeError('age', 150, 0, 120);

      expect(error.code).toBe(ErrorCode.VALIDATION_OUT_OF_RANGE);
      expect(error.fieldName).toBe('age');
      expect(error.actualValue).toBe(150);
      expect(error.min).toBe(0);
      expect(error.max).toBe(120);
    });
  });

  describe('InvalidTypeError', () => {
    it('should include type information', () => {
      const error = new InvalidTypeError('count', 'number', 'string');

      expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_TYPE);
      expect(error.fieldName).toBe('count');
      expect(error.expectedType).toBe('number');
      expect(error.actualType).toBe('string');
    });
  });

  describe('InvalidZoneError', () => {
    it('should include valid zones', () => {
      const error = new InvalidZoneError('back');

      expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_ZONE);
      expect(error.zone).toBe('back');
      expect(error.validZones).toContain('temporal');
      expect(error.validZones).toContain('vertex');
    });
  });

  describe('InvalidAgeError', () => {
    it('should include age bounds', () => {
      const error = new InvalidAgeError(-5, 0, 120);

      expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_AGE);
      expect(error.age).toBe(-5);
      expect(error.minAge).toBe(0);
      expect(error.maxAge).toBe(120);
    });
  });

  describe('InvalidGenderError', () => {
    it('should include valid genders', () => {
      const error = new InvalidGenderError('unknown');

      expect(error.code).toBe(ErrorCode.VALIDATION_INVALID_GENDER);
      expect(error.gender).toBe('unknown');
      expect(error.validGenders).toContain('male');
      expect(error.validGenders).toContain('female');
    });
  });
});

// ============================================================================
// VALIDATION HELPERS TESTS
// ============================================================================

describe('Validation Helpers', () => {
  describe('validateRequiredFields', () => {
    it('should pass for object with all required fields', () => {
      const obj = { name: 'test', age: 25, gender: 'male' };
      expect(() => validateRequiredFields(obj, ['name', 'age'])).not.toThrow();
    });

    it('should throw RequiredFieldError for missing field', () => {
      const obj = { name: 'test' };
      expect(() =>
        validateRequiredFields(obj as Record<string, unknown>, ['name', 'age'])
      ).toThrow(RequiredFieldError);
    });

    it('should throw for null values', () => {
      const obj = { name: 'test', age: null };
      expect(() =>
        validateRequiredFields(obj as Record<string, unknown>, ['name', 'age'])
      ).toThrow(RequiredFieldError);
    });
  });

  describe('validateRange', () => {
    it('should pass for value within range', () => {
      expect(() => validateRange('age', 25, 0, 120)).not.toThrow();
    });

    it('should throw OutOfRangeError for value below min', () => {
      expect(() => validateRange('age', -5, 0, 120)).toThrow(OutOfRangeError);
    });

    it('should throw OutOfRangeError for value above max', () => {
      expect(() => validateRange('age', 150, 0, 120)).toThrow(OutOfRangeError);
    });

    it('should handle min-only validation', () => {
      expect(() => validateRange('count', 5, 0)).not.toThrow();
      expect(() => validateRange('count', -1, 0)).toThrow(OutOfRangeError);
    });

    it('should handle max-only validation', () => {
      expect(() => validateRange('count', 50, undefined, 100)).not.toThrow();
      expect(() => validateRange('count', 150, undefined, 100)).toThrow(OutOfRangeError);
    });
  });

  describe('validateZone', () => {
    it('should pass for valid zones', () => {
      expect(() => validateZone('temporal')).not.toThrow();
      expect(() => validateZone('parietal')).not.toThrow();
      expect(() => validateZone('occipital')).not.toThrow();
      expect(() => validateZone('frontal')).not.toThrow();
      expect(() => validateZone('vertex')).not.toThrow();
    });

    it('should throw InvalidZoneError for invalid zone', () => {
      expect(() => validateZone('back')).toThrow(InvalidZoneError);
      expect(() => validateZone('crown')).toThrow(InvalidZoneError);
    });
  });

  describe('validateGender', () => {
    it('should pass for valid genders', () => {
      expect(() => validateGender('male')).not.toThrow();
      expect(() => validateGender('female')).not.toThrow();
    });

    it('should throw InvalidGenderError for invalid gender', () => {
      expect(() => validateGender('other')).toThrow(InvalidGenderError);
      expect(() => validateGender('unknown')).toThrow(InvalidGenderError);
    });
  });

  describe('validateAge', () => {
    it('should pass for valid ages', () => {
      expect(() => validateAge(25, 18, 100)).not.toThrow();
      expect(() => validateAge(18, 18, 100)).not.toThrow();
      expect(() => validateAge(100, 18, 100)).not.toThrow();
    });

    it('should throw InvalidAgeError for age below minimum', () => {
      expect(() => validateAge(15, 18, 100)).toThrow(InvalidAgeError);
    });

    it('should throw InvalidAgeError for age above maximum', () => {
      expect(() => validateAge(110, 18, 100)).toThrow(InvalidAgeError);
    });

    it('should throw InvalidAgeError for non-integer age', () => {
      expect(() => validateAge(25.5, 18, 100)).toThrow(InvalidAgeError);
    });
  });
});

// ============================================================================
// INFRASTRUCTURE ERRORS TESTS
// ============================================================================

describe('Infrastructure Errors', () => {
  describe('UnknownError', () => {
    it('should create unknown error', () => {
      const error = new UnknownError('Something unexpected happened');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('InternalError', () => {
    it('should create internal error', () => {
      const error = new InternalError('Internal bug');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('NotImplementedError', () => {
    it('should create not implemented error', () => {
      const error = new NotImplementedError('Feature X');
      expect(error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
    });
  });
});
