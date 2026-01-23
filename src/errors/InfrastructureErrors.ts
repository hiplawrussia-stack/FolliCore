/**
 * FolliCore Infrastructure Layer Errors
 *
 * Technical/infrastructure errors.
 * These are typically HIGH severity as they indicate system-level issues.
 *
 * @module errors
 */

import { ErrorCode } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';

// ============================================================================
// STORAGE ERRORS
// ============================================================================

/**
 * Error thrown when storage read operation fails
 */
export class StorageReadError extends FolliCoreError {
  public readonly storageName: string;
  public readonly key?: string;

  constructor(
    storageName: string,
    message: string,
    key?: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_STORAGE_READ_FAILED,
      `Storage '${storageName}' read failed${key ? ` for key '${key}'` : ''}: ${message}`,
      { ...context, component: context.component ?? storageName }
    );
    this.name = 'StorageReadError';
    this.storageName = storageName;
    this.key = key;
  }
}

/**
 * Error thrown when storage write operation fails
 */
export class StorageWriteError extends FolliCoreError {
  public readonly storageName: string;
  public readonly key?: string;

  constructor(
    storageName: string,
    message: string,
    key?: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_STORAGE_WRITE_FAILED,
      `Storage '${storageName}' write failed${key ? ` for key '${key}'` : ''}: ${message}`,
      { ...context, component: context.component ?? storageName }
    );
    this.name = 'StorageWriteError';
    this.storageName = storageName;
    this.key = key;
  }
}

/**
 * Error thrown when storage connection fails
 */
export class StorageConnectionError extends FolliCoreError {
  public readonly storageName: string;

  constructor(
    storageName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_STORAGE_CONNECTION_FAILED,
      `Storage '${storageName}' connection failed: ${message}`,
      { ...context, component: context.component ?? storageName }
    );
    this.name = 'StorageConnectionError';
    this.storageName = storageName;
  }
}

// ============================================================================
// EXTERNAL SERVICE ERRORS
// ============================================================================

/**
 * Error thrown when external service is unavailable
 */
export class ServiceUnavailableError extends FolliCoreError {
  public readonly serviceName: string;

  constructor(serviceName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.INFRA_SERVICE_UNAVAILABLE,
      `External service '${serviceName}' is unavailable`,
      { ...context, component: context.component ?? serviceName }
    );
    this.name = 'ServiceUnavailableError';
    this.serviceName = serviceName;
  }
}

/**
 * Error thrown when external service times out
 */
export class ServiceTimeoutError extends FolliCoreError {
  public readonly serviceName: string;
  public readonly timeoutMs: number;

  constructor(
    serviceName: string,
    timeoutMs: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_SERVICE_TIMEOUT,
      `External service '${serviceName}' timed out after ${timeoutMs}ms`,
      { ...context, component: context.component ?? serviceName }
    );
    this.name = 'ServiceTimeoutError';
    this.serviceName = serviceName;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when external service returns an error
 */
export class ServiceError extends FolliCoreError {
  public readonly serviceName: string;
  public readonly statusCode?: number;

  constructor(
    serviceName: string,
    message: string,
    statusCode?: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_SERVICE_ERROR,
      `External service '${serviceName}' error${statusCode ? ` (${statusCode})` : ''}: ${message}`,
      { ...context, component: context.component ?? serviceName }
    );
    this.name = 'ServiceError';
    this.serviceName = serviceName;
    this.statusCode = statusCode;
  }
}

// ============================================================================
// RESOURCE ERRORS
// ============================================================================

/**
 * Error thrown when system runs out of memory
 */
export class OutOfMemoryError extends FolliCoreError {
  public readonly requiredMB?: number;
  public readonly availableMB?: number;

  constructor(
    message: string,
    requiredMB?: number,
    availableMB?: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.INFRA_OUT_OF_MEMORY,
      `Out of memory: ${message}${requiredMB && availableMB ? ` (Required: ${requiredMB}MB, Available: ${availableMB}MB)` : ''}`,
      { ...context, component: context.component ?? 'MemoryManager' }
    );
    this.name = 'OutOfMemoryError';
    this.requiredMB = requiredMB;
    this.availableMB = availableMB;
  }
}

/**
 * Error thrown when GPU is not available
 */
export class GPUNotAvailableError extends FolliCoreError {
  public readonly requiredVRAM?: number;

  constructor(message: string, requiredVRAM?: number, context: IErrorContext = {}) {
    super(
      ErrorCode.INFRA_GPU_NOT_AVAILABLE,
      `GPU not available: ${message}${requiredVRAM ? ` (Required VRAM: ${requiredVRAM}MB)` : ''}`,
      { ...context, component: context.component ?? 'GPUManager' }
    );
    this.name = 'GPUNotAvailableError';
    this.requiredVRAM = requiredVRAM;
  }
}

// ============================================================================
// GENERIC ERRORS
// ============================================================================

/**
 * Error for unknown/unclassified errors
 */
export class UnknownError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.UNKNOWN_ERROR,
      message,
      context
    );
    this.name = 'UnknownError';
  }
}

/**
 * Error for internal system errors
 */
export class InternalError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.INTERNAL_ERROR,
      `Internal error: ${message}`,
      context,
      { isOperational: false }  // Non-operational - programmer bug
    );
    this.name = 'InternalError';
  }
}

/**
 * Error for not implemented features
 */
export class NotImplementedError extends FolliCoreError {
  public readonly featureName: string;

  constructor(featureName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.NOT_IMPLEMENTED,
      `Feature '${featureName}' is not implemented`,
      context
    );
    this.name = 'NotImplementedError';
    this.featureName = featureName;
  }
}
