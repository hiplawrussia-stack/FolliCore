/**
 * FolliCore Acoustic Module Errors
 *
 * Errors specific to acoustic/ultrasound analysis.
 * Covers signal processing, spectral analysis, and pattern matching.
 *
 * @module errors
 */

import { ErrorCode } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';

// ============================================================================
// SIGNAL PROCESSING ERRORS
// ============================================================================

/**
 * Error thrown when acoustic signal data is invalid
 */
export class InvalidSignalError extends FolliCoreError {
  public readonly reason: string;

  constructor(reason: string, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_SIGNAL_INVALID,
      `Invalid acoustic signal: ${reason}`,
      { ...context, component: context.component ?? 'SignalProcessor' }
    );
    this.name = 'InvalidSignalError';
    this.reason = reason;
  }
}

/**
 * Error thrown when signal duration is too short
 */
export class SignalTooShortError extends FolliCoreError {
  public readonly requiredSamples: number;
  public readonly actualSamples: number;

  constructor(
    requiredSamples: number,
    actualSamples: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.ACOUSTIC_SIGNAL_TOO_SHORT,
      `Signal too short. Required: ${requiredSamples} samples, Got: ${actualSamples} samples`,
      { ...context, component: context.component ?? 'SignalProcessor' }
    );
    this.name = 'SignalTooShortError';
    this.requiredSamples = requiredSamples;
    this.actualSamples = actualSamples;
  }
}

/**
 * Error thrown when signal noise level is too high
 */
export class NoiseTooHighError extends FolliCoreError {
  public readonly snr: number;
  public readonly threshold: number;

  constructor(
    snr: number,
    threshold: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.ACOUSTIC_SIGNAL_NOISE_TOO_HIGH,
      `Signal-to-noise ratio (${snr.toFixed(1)} dB) below threshold (${threshold.toFixed(1)} dB)`,
      { ...context, component: context.component ?? 'SignalProcessor' }
    );
    this.name = 'NoiseTooHighError';
    this.snr = snr;
    this.threshold = threshold;
  }
}

// ============================================================================
// ANALYSIS ERRORS
// ============================================================================

/**
 * Error thrown when acoustic analysis fails
 */
export class AcousticAnalysisError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_ANALYSIS_FAILED,
      `Acoustic analysis failed: ${message}`,
      { ...context, component: context.component ?? 'AcousticAnalyzer' }
    );
    this.name = 'AcousticAnalysisError';
  }
}

/**
 * Error thrown when acoustic analysis times out
 */
export class AcousticAnalysisTimeoutError extends FolliCoreError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_ANALYSIS_TIMEOUT,
      `Acoustic analysis timed out after ${timeoutMs}ms`,
      { ...context, component: context.component ?? 'AcousticAnalyzer' }
    );
    this.name = 'AcousticAnalysisTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

// ============================================================================
// SPECTRAL ANALYSIS ERRORS
// ============================================================================

/**
 * Error thrown when spectral feature extraction fails
 */
export class SpectralExtractionError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_SPECTRAL_EXTRACTION_FAILED,
      `Spectral extraction failed: ${message}`,
      { ...context, component: context.component ?? 'SpectralAnalyzer' }
    );
    this.name = 'SpectralExtractionError';
  }
}

/**
 * Error thrown when FFT computation fails
 */
export class FFTError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_FFT_FAILED,
      `FFT computation failed: ${message}`,
      { ...context, component: context.component ?? 'SpectralAnalyzer' }
    );
    this.name = 'FFTError';
  }
}

// ============================================================================
// PATTERN MATCHING ERRORS
// ============================================================================

/**
 * Error thrown when acoustic pattern is not recognized
 */
export class PatternNotRecognizedError extends FolliCoreError {
  public readonly confidence: number;

  constructor(confidence: number, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_PATTERN_NOT_RECOGNIZED,
      `Acoustic pattern not recognized (confidence: ${(confidence * 100).toFixed(1)}%)`,
      { ...context, component: context.component ?? 'PatternMatcher' }
    );
    this.name = 'PatternNotRecognizedError';
    this.confidence = confidence;
  }
}

/**
 * Error thrown when acoustic database is empty
 */
export class AcousticDatabaseEmptyError extends FolliCoreError {
  constructor(context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_DATABASE_EMPTY,
      'Acoustic pattern database is empty. Cannot perform similarity matching.',
      { ...context, component: context.component ?? 'SimilarityEngine' }
    );
    this.name = 'AcousticDatabaseEmptyError';
  }
}

// ============================================================================
// MODEL ERRORS
// ============================================================================

/**
 * Error thrown when acoustic model is not loaded
 */
export class AcousticModelNotLoadedError extends FolliCoreError {
  public readonly modelName: string;

  constructor(modelName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.ACOUSTIC_MODEL_NOT_LOADED,
      `Acoustic model '${modelName}' is not loaded. Call initialize() first.`,
      { ...context, component: context.component ?? 'AcousticAnalyzer' }
    );
    this.name = 'AcousticModelNotLoadedError';
    this.modelName = modelName;
  }
}
