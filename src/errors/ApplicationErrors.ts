/**
 * FolliCore Application Layer Errors
 *
 * Use case and integration errors.
 * These errors represent failures in application-level operations.
 *
 * @module errors
 */

import { ErrorCode } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';

// ============================================================================
// PIPELINE ERRORS
// ============================================================================

/**
 * Error thrown when pipeline initialization fails
 */
export class PipelineInitializationError extends FolliCoreError {
  public readonly pipelineName: string;

  constructor(
    pipelineName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_PIPELINE_INITIALIZATION_FAILED,
      `Pipeline '${pipelineName}' initialization failed: ${message}`,
      { ...context, component: context.component ?? pipelineName }
    );
    this.name = 'PipelineInitializationError';
    this.pipelineName = pipelineName;
  }
}

/**
 * Error thrown when a pipeline stage fails
 */
export class PipelineStageError extends FolliCoreError {
  public readonly stageName: string;
  public readonly pipelineName: string;

  constructor(
    pipelineName: string,
    stageName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_PIPELINE_STAGE_FAILED,
      `Pipeline '${pipelineName}' stage '${stageName}' failed: ${message}`,
      { ...context, component: context.component ?? pipelineName, operation: stageName }
    );
    this.name = 'PipelineStageError';
    this.pipelineName = pipelineName;
    this.stageName = stageName;
  }
}

/**
 * Error thrown when pipeline times out
 */
export class PipelineTimeoutError extends FolliCoreError {
  public readonly pipelineName: string;
  public readonly timeoutMs: number;

  constructor(
    pipelineName: string,
    timeoutMs: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_PIPELINE_TIMEOUT,
      `Pipeline '${pipelineName}' timed out after ${timeoutMs}ms`,
      { ...context, component: context.component ?? pipelineName }
    );
    this.name = 'PipelineTimeoutError';
    this.pipelineName = pipelineName;
    this.timeoutMs = timeoutMs;
  }
}

// ============================================================================
// INTEGRATION ERRORS
// ============================================================================

/**
 * Error thrown when integration is not ready
 */
export class IntegrationNotReadyError extends FolliCoreError {
  public readonly integrationName: string;

  constructor(integrationName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.APP_INTEGRATION_NOT_READY,
      `Integration '${integrationName}' is not ready. Call initialize() first.`,
      { ...context, component: context.component ?? integrationName }
    );
    this.name = 'IntegrationNotReadyError';
    this.integrationName = integrationName;
  }
}

/**
 * Error thrown when integration fails
 */
export class IntegrationError extends FolliCoreError {
  public readonly integrationName: string;

  constructor(
    integrationName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_INTEGRATION_FAILED,
      `Integration '${integrationName}' failed: ${message}`,
      { ...context, component: context.component ?? integrationName }
    );
    this.name = 'IntegrationError';
    this.integrationName = integrationName;
  }
}

// ============================================================================
// SESSION ERRORS
// ============================================================================

/**
 * Error thrown when session is not found
 */
export class SessionNotFoundError extends FolliCoreError {
  public readonly sessionId: string;

  constructor(sessionId: string, context: IErrorContext = {}) {
    super(
      ErrorCode.APP_SESSION_NOT_FOUND,
      `Session not found`,
      { ...context, sessionId, component: context.component ?? 'SessionManager' }
    );
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when session has expired
 */
export class SessionExpiredError extends FolliCoreError {
  public readonly sessionId: string;
  public readonly expiredAt: Date;

  constructor(
    sessionId: string,
    expiredAt: Date,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_SESSION_EXPIRED,
      `Session expired at ${expiredAt.toISOString()}`,
      { ...context, sessionId, component: context.component ?? 'SessionManager' }
    );
    this.name = 'SessionExpiredError';
    this.sessionId = sessionId;
    this.expiredAt = expiredAt;
  }
}

// ============================================================================
// EXPORT/IMPORT ERRORS
// ============================================================================

/**
 * Error thrown when data export fails
 */
export class ExportError extends FolliCoreError {
  public readonly exportType: string;

  constructor(
    exportType: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_EXPORT_FAILED,
      `Export (${exportType}) failed: ${message}`,
      { ...context, component: context.component ?? 'DataExporter' }
    );
    this.name = 'ExportError';
    this.exportType = exportType;
  }
}

/**
 * Error thrown when data import fails
 */
export class ImportError extends FolliCoreError {
  public readonly importType: string;

  constructor(
    importType: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.APP_IMPORT_FAILED,
      `Import (${importType}) failed: ${message}`,
      { ...context, component: context.component ?? 'DataImporter' }
    );
    this.name = 'ImportError';
    this.importType = importType;
  }
}
