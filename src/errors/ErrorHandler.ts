/**
 * FolliCore Error Handler
 *
 * Centralized error handling with:
 * - ISO 14971 risk management integration
 * - HIPAA-compliant audit logging
 * - Safety-critical error escalation
 * - Error recovery strategies
 *
 * @module errors
 */

import {
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
} from './ErrorCodes';
import {
  FolliCoreError,
  type IErrorContext,
  type ISerializedError,
} from './FolliCoreError';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Error handler configuration
 */
export interface IErrorHandlerConfig {
  /** Enable console logging */
  enableConsoleLog: boolean;
  /** Enable detailed stack traces */
  enableStackTrace: boolean;
  /** Enable safety-critical escalation */
  enableSafetyEscalation: boolean;
  /** Custom error logger */
  logger?: IErrorLogger;
  /** Safety escalation handler */
  safetyEscalationHandler?: ISafetyEscalationHandler;
  /** Error recovery strategies */
  recoveryStrategies?: Map<ErrorCode, IRecoveryStrategy>;
}

/**
 * Error logger interface for custom logging implementations
 */
export interface IErrorLogger {
  log(entry: IErrorLogEntry): void | Promise<void>;
}

/**
 * Error log entry for audit trails (HIPAA compliant)
 */
export interface IErrorLogEntry {
  timestamp: string;
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  correlationId?: string;
  component?: string;
  operation?: string;
  isSafetyCritical: boolean;
  riskDescription: string;
  stack?: string;
}

/**
 * Safety escalation handler for critical errors
 */
export interface ISafetyEscalationHandler {
  escalate(error: FolliCoreError): void | Promise<void>;
}

/**
 * Recovery strategy for specific error codes
 */
export interface IRecoveryStrategy {
  /** Can this error be recovered? */
  canRecover(error: FolliCoreError): boolean;
  /** Attempt recovery */
  recover(error: FolliCoreError): Promise<void>;
}

/**
 * Error statistics
 */
export interface IErrorStats {
  totalErrors: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  safetyCriticalCount: number;
  lastError?: ISerializedError;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: IErrorHandlerConfig = {
  enableConsoleLog: process.env.NODE_ENV === 'development',
  enableStackTrace: process.env.NODE_ENV === 'development',
  enableSafetyEscalation: true,
};

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

/**
 * FolliCore Error Handler
 *
 * Singleton pattern for centralized error handling.
 * Integrates with ISO 14971 risk management framework.
 *
 * @example
 * ```typescript
 * const handler = ErrorHandler.getInstance();
 *
 * // Configure handler
 * handler.configure({
 *   enableConsoleLog: true,
 *   safetyEscalationHandler: {
 *     escalate: (error) => {
 *       // Send alert to medical staff
 *       alertService.sendCriticalAlert(error);
 *     }
 *   }
 * });
 *
 * // Handle error
 * try {
 *   await processPatient(data);
 * } catch (error) {
 *   handler.handle(error, { component: 'PatientProcessor' });
 * }
 * ```
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private config: IErrorHandlerConfig;
  private stats: IErrorStats;

  private constructor(config: Partial<IErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.initializeStats();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    ErrorHandler.instance = null;
  }

  /**
   * Configure the error handler
   */
  configure(config: Partial<IErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handle an error
   *
   * This is the main entry point for error handling.
   * It will:
   * 1. Convert unknown errors to FolliCoreError
   * 2. Log the error
   * 3. Update statistics
   * 4. Escalate safety-critical errors
   * 5. Attempt recovery if strategy exists
   */
  async handle(
    error: unknown,
    context: IErrorContext = {}
  ): Promise<FolliCoreError> {
    // Convert to FolliCoreError
    const folliError = this.toFolliCoreError(error, context);

    // Update statistics
    this.updateStats(folliError);

    // Log the error
    await this.logError(folliError);

    // Handle safety-critical errors
    if (folliError.isSafetyCritical && this.config.enableSafetyEscalation) {
      await this.escalateSafetyError(folliError);
    }

    // Attempt recovery if strategy exists
    await this.attemptRecovery(folliError);

    return folliError;
  }

  /**
   * Handle error synchronously (for use in catch blocks that can't be async)
   */
  handleSync(error: unknown, context: IErrorContext = {}): FolliCoreError {
    const folliError = this.toFolliCoreError(error, context);
    this.updateStats(folliError);

    // Log synchronously if console logging is enabled
    if (this.config.enableConsoleLog) {
      this.consoleLog(folliError);
    }

    return folliError;
  }

  /**
   * Convert unknown error to FolliCoreError
   */
  toFolliCoreError(error: unknown, context: IErrorContext = {}): FolliCoreError {
    return FolliCoreError.fromUnknown(error, ErrorCode.UNKNOWN_ERROR, context);
  }

  /**
   * Check if error is operational (can be handled gracefully)
   */
  isOperational(error: unknown): boolean {
    return FolliCoreError.isOperational(error);
  }

  /**
   * Check if error is safety-critical
   */
  isSafetyCritical(error: unknown): boolean {
    return FolliCoreError.isSafetyCriticalError(error);
  }

  /**
   * Get error statistics
   */
  getStats(): IErrorStats {
    return { ...this.stats };
  }

  /**
   * Reset error statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Create error report for ISO 14971 risk management
   */
  createRiskReport(): IRiskReport {
    const stats = this.getStats();
    const criticalRatio = stats.totalErrors > 0
      ? stats.safetyCriticalCount / stats.totalErrors
      : 0;

    return {
      reportDate: new Date().toISOString(),
      totalErrorsAnalyzed: stats.totalErrors,
      categoryDistribution: stats.byCategory,
      severityDistribution: stats.bySeverity,
      safetyCriticalCount: stats.safetyCriticalCount,
      safetyCriticalRatio: criticalRatio,
      riskAssessment: this.assessOverallRisk(stats),
      recommendations: this.generateRecommendations(stats),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeStats(): IErrorStats {
    return {
      totalErrors: 0,
      byCategory: {
        [ErrorCategory.DOMAIN]: 0,
        [ErrorCategory.VISION]: 0,
        [ErrorCategory.ACOUSTIC]: 0,
        [ErrorCategory.APPLICATION]: 0,
        [ErrorCategory.INFRASTRUCTURE]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.UNKNOWN]: 0,
      },
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      safetyCriticalCount: 0,
    };
  }

  private updateStats(error: FolliCoreError): void {
    this.stats.totalErrors++;
    this.stats.byCategory[error.category]++;
    this.stats.bySeverity[error.severity]++;

    if (error.isSafetyCritical) {
      this.stats.safetyCriticalCount++;
    }

    this.stats.lastError = error.toJSON();
  }

  private async logError(error: FolliCoreError): Promise<void> {
    const entry: IErrorLogEntry = {
      timestamp: error.timestamp.toISOString(),
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      correlationId: error.context.correlationId,
      component: error.context.component,
      operation: error.context.operation,
      isSafetyCritical: error.isSafetyCritical,
      riskDescription: error.riskDescription,
      stack: this.config.enableStackTrace ? error.stack : undefined,
    };

    // Custom logger
    if (this.config.logger) {
      await this.config.logger.log(entry);
    }

    // Console logging
    if (this.config.enableConsoleLog) {
      this.consoleLog(error);
    }
  }

  private consoleLog(error: FolliCoreError): void {
    const prefix = error.isSafetyCritical ? '[SAFETY-CRITICAL]' : '';
    const severityIcon = this.getSeverityIcon(error.severity);

    // eslint-disable-next-line no-console -- Intentional console logging for development
    console.error(
      `${severityIcon} ${prefix} [${error.code}] ${error.message}`,
      {
        category: error.category,
        severity: error.severity,
        component: error.context.component,
        operation: error.context.operation,
        riskDescription: error.riskDescription,
      }
    );

    if (this.config.enableStackTrace && error.stack) {
      // eslint-disable-next-line no-console
      console.error(error.stack);
    }
  }

  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return 'ℹ️';
      case ErrorSeverity.MEDIUM: return '⚠️';
      case ErrorSeverity.HIGH: return '🔴';
      case ErrorSeverity.CRITICAL: return '🚨';
    }
  }

  private async escalateSafetyError(error: FolliCoreError): Promise<void> {
    if (this.config.safetyEscalationHandler) {
      await this.config.safetyEscalationHandler.escalate(error);
    }
  }

  private async attemptRecovery(error: FolliCoreError): Promise<void> {
    const strategy = this.config.recoveryStrategies?.get(error.code);

    if (strategy?.canRecover(error)) {
      await strategy.recover(error);
    }
  }

  private assessOverallRisk(stats: IErrorStats): 'low' | 'medium' | 'high' | 'critical' {
    if (stats.safetyCriticalCount > 0) {
      return 'critical';
    }
    if (stats.bySeverity[ErrorSeverity.HIGH] > stats.totalErrors * 0.1) {
      return 'high';
    }
    if (stats.bySeverity[ErrorSeverity.MEDIUM] > stats.totalErrors * 0.3) {
      return 'medium';
    }
    return 'low';
  }

  private generateRecommendations(stats: IErrorStats): string[] {
    const recommendations: string[] = [];

    if (stats.safetyCriticalCount > 0) {
      recommendations.push(
        'CRITICAL: Safety-critical errors detected. Review contraindication handling.'
      );
    }

    if (stats.byCategory[ErrorCategory.VISION] > stats.totalErrors * 0.2) {
      recommendations.push(
        'High rate of vision module errors. Review image quality requirements.'
      );
    }

    if (stats.byCategory[ErrorCategory.INFRASTRUCTURE] > stats.totalErrors * 0.1) {
      recommendations.push(
        'Infrastructure errors elevated. Review system resources and connectivity.'
      );
    }

    if (stats.byCategory[ErrorCategory.VALIDATION] > stats.totalErrors * 0.5) {
      recommendations.push(
        'High validation error rate. Consider improving input validation UX.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Error rates within acceptable limits.');
    }

    return recommendations;
  }
}

// ============================================================================
// RISK REPORT INTERFACE
// ============================================================================

/**
 * ISO 14971 Risk Report
 */
export interface IRiskReport {
  reportDate: string;
  totalErrorsAnalyzed: number;
  categoryDistribution: Record<ErrorCategory, number>;
  severityDistribution: Record<ErrorSeverity, number>;
  safetyCriticalCount: number;
  safetyCriticalRatio: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Global error handler getter
 */
export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}

/**
 * Quick error handling utility
 */
export async function handleError(
  error: unknown,
  context: IErrorContext = {}
): Promise<FolliCoreError> {
  return ErrorHandler.getInstance().handle(error, context);
}

/**
 * Quick sync error handling utility
 */
export function handleErrorSync(
  error: unknown,
  context: IErrorContext = {}
): FolliCoreError {
  return ErrorHandler.getInstance().handleSync(error, context);
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: IErrorContext = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      // eslint-disable-next-line @typescript-eslint/return-await -- Type assertion after await triggers false positive
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      const handledError = await handleError(error, context);
      throw handledError;
    }
  }) as T;
}
