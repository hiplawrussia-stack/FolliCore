/**
 * FolliCore Vision Module Errors
 *
 * Errors specific to trichoscopy image analysis.
 * Covers DINOv2 embedding, segmentation, and morphometry extraction.
 *
 * @module errors
 */

import { ErrorCode } from './ErrorCodes';
import { FolliCoreError, type IErrorContext } from './FolliCoreError';

// ============================================================================
// MODEL ERRORS
// ============================================================================

/**
 * Error thrown when vision model is not loaded
 */
export class VisionModelNotLoadedError extends FolliCoreError {
  public readonly modelName: string;

  constructor(modelName: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_MODEL_NOT_LOADED,
      `Vision model '${modelName}' is not loaded. Call initialize() first.`,
      { ...context, component: context.component ?? 'TrichoscopyAnalyzer' }
    );
    this.name = 'VisionModelNotLoadedError';
    this.modelName = modelName;
  }
}

/**
 * Error thrown when model inference fails
 */
export class VisionInferenceError extends FolliCoreError {
  public readonly modelName: string;

  constructor(
    modelName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VISION_MODEL_INFERENCE_FAILED,
      `Model '${modelName}' inference failed: ${message}`,
      { ...context, component: context.component ?? 'TrichoscopyAnalyzer' }
    );
    this.name = 'VisionInferenceError';
    this.modelName = modelName;
  }
}

/**
 * Error thrown when model initialization fails
 */
export class VisionModelInitializationError extends FolliCoreError {
  public readonly modelName: string;

  constructor(
    modelName: string,
    message: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VISION_MODEL_INITIALIZATION_FAILED,
      `Failed to initialize model '${modelName}': ${message}`,
      { ...context, component: context.component ?? 'TrichoscopyAnalyzer' }
    );
    this.name = 'VisionModelInitializationError';
    this.modelName = modelName;
  }
}

// ============================================================================
// IMAGE PROCESSING ERRORS
// ============================================================================

/**
 * Error thrown when image format is invalid
 */
export class InvalidImageFormatError extends FolliCoreError {
  public readonly expectedFormats: string[];
  public readonly actualFormat?: string;

  constructor(
    expectedFormats: string[],
    actualFormat?: string,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VISION_IMAGE_INVALID_FORMAT,
      `Invalid image format. Expected: ${expectedFormats.join(', ')}${actualFormat ? `, got: ${actualFormat}` : ''}`,
      { ...context, component: context.component ?? 'ImageProcessor' }
    );
    this.name = 'InvalidImageFormatError';
    this.expectedFormats = expectedFormats;
    this.actualFormat = actualFormat;
  }
}

/**
 * Error thrown when image resolution is too low for analysis
 */
export class ImageResolutionTooLowError extends FolliCoreError {
  public readonly requiredWidth: number;
  public readonly requiredHeight: number;
  public readonly actualWidth: number;
  public readonly actualHeight: number;

  constructor(
    requiredWidth: number,
    requiredHeight: number,
    actualWidth: number,
    actualHeight: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VISION_IMAGE_RESOLUTION_TOO_LOW,
      `Image resolution too low. Required: ${requiredWidth}x${requiredHeight}, Got: ${actualWidth}x${actualHeight}`,
      { ...context, component: context.component ?? 'ImageProcessor' }
    );
    this.name = 'ImageResolutionTooLowError';
    this.requiredWidth = requiredWidth;
    this.requiredHeight = requiredHeight;
    this.actualWidth = actualWidth;
    this.actualHeight = actualHeight;
  }
}

/**
 * Error thrown when image data is corrupted
 */
export class ImageCorruptedError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_IMAGE_CORRUPTED,
      `Image data corrupted: ${message}`,
      { ...context, component: context.component ?? 'ImageProcessor' }
    );
    this.name = 'ImageCorruptedError';
  }
}

// ============================================================================
// SEGMENTATION ERRORS
// ============================================================================

/**
 * Error thrown when segmentation fails
 */
export class SegmentationError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_SEGMENTATION_FAILED,
      `Segmentation failed: ${message}`,
      { ...context, component: context.component ?? 'SegmentationModel' }
    );
    this.name = 'SegmentationError';
  }
}

/**
 * Error thrown when no follicles are detected in the image
 */
export class NoFolliclesDetectedError extends FolliCoreError {
  constructor(context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_SEGMENTATION_NO_FOLLICLES,
      'No follicles detected in the image. Ensure the image is a valid trichoscopy capture.',
      { ...context, component: context.component ?? 'SegmentationModel' }
    );
    this.name = 'NoFolliclesDetectedError';
  }
}

// ============================================================================
// MORPHOMETRY ERRORS
// ============================================================================

/**
 * Error thrown when morphometry extraction fails
 */
export class MorphometryExtractionError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_MORPHOMETRY_EXTRACTION_FAILED,
      `Morphometry extraction failed: ${message}`,
      { ...context, component: context.component ?? 'MorphometryExtractor' }
    );
    this.name = 'MorphometryExtractionError';
  }
}

/**
 * Error thrown when calibration data is missing
 */
export class CalibrationMissingError extends FolliCoreError {
  constructor(context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_MORPHOMETRY_CALIBRATION_MISSING,
      'Calibration data (pixels per micrometer) is required for morphometry extraction',
      { ...context, component: context.component ?? 'MorphometryExtractor' }
    );
    this.name = 'CalibrationMissingError';
  }
}

// ============================================================================
// EMBEDDING ERRORS
// ============================================================================

/**
 * Error thrown when embedding extraction fails
 */
export class EmbeddingExtractionError extends FolliCoreError {
  constructor(message: string, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_EMBEDDING_EXTRACTION_FAILED,
      `Embedding extraction failed: ${message}`,
      { ...context, component: context.component ?? 'FeatureExtractor' }
    );
    this.name = 'EmbeddingExtractionError';
  }
}

// ============================================================================
// ANALYSIS ERRORS
// ============================================================================

/**
 * Error thrown when vision analysis times out
 */
export class VisionAnalysisTimeoutError extends FolliCoreError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number, context: IErrorContext = {}) {
    super(
      ErrorCode.VISION_ANALYSIS_TIMEOUT,
      `Vision analysis timed out after ${timeoutMs}ms`,
      { ...context, component: context.component ?? 'TrichoscopyAnalyzer' }
    );
    this.name = 'VisionAnalysisTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when analysis confidence is too low
 */
export class LowConfidenceAnalysisError extends FolliCoreError {
  public readonly confidence: number;
  public readonly threshold: number;

  constructor(
    confidence: number,
    threshold: number,
    context: IErrorContext = {}
  ) {
    super(
      ErrorCode.VISION_ANALYSIS_LOW_CONFIDENCE,
      `Analysis confidence (${(confidence * 100).toFixed(1)}%) below threshold (${(threshold * 100).toFixed(1)}%)`,
      { ...context, component: context.component ?? 'TrichoscopyAnalyzer' }
    );
    this.name = 'LowConfidenceAnalysisError';
    this.confidence = confidence;
    this.threshold = threshold;
  }
}
