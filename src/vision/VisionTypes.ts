/**
 * FolliCore Vision Module - Type Definitions
 *
 * Based on advanced research: DINOv2 + SAM + Mamba architectures
 * See: research/VISION_MODULE_ADVANCED_RESEARCH.md
 */

/**
 * Scalp zones for analysis
 */
export type ScalpZone = 'temporal' | 'parietal' | 'occipital' | 'frontal';

/**
 * Raw image input for analysis
 */
export interface ITrichoscopyImage {
  /** Image data as base64 or buffer */
  data: string | Buffer;
  /** Image format */
  format: 'png' | 'jpeg' | 'tiff';
  /** Image dimensions */
  width: number;
  height: number;
  /** Magnification level (e.g., 20x, 50x, 100x) */
  magnification: number;
  /** Scalp zone where image was captured */
  zone: ScalpZone;
  /** Capture timestamp */
  capturedAt: Date;
  /** Device/camera identifier */
  deviceId?: string;
}

/**
 * DINOv2 feature embedding output
 * 1024-dimensional vector for ViT-Large
 */
export interface IImageEmbedding {
  /** Raw embedding vector */
  vector: Float32Array;
  /** Embedding dimension (1024 for DINOv2-Large) */
  dimension: number;
  /** Model version used */
  modelVersion: string;
  /** Extraction timestamp */
  extractedAt: Date;
}

/**
 * Morphometric measurements from CV analysis
 * Aligned with PGMU methodology
 */
export interface IMorphometryResult {
  /** Hair bulb width in micrometers */
  bulbWidth: number;
  /** Hair shaft thickness in micrometers */
  shaftThickness: number;
  /** Standard deviation of bulb width measurements */
  bulbWidthStd: number;
  /** Standard deviation of shaft thickness measurements */
  shaftThicknessStd: number;
  /** Number of follicles measured */
  sampleSize: number;
  /** Measurement confidence (0-1) */
  confidence: number;
}

/**
 * Density analysis results
 */
export interface IDensityResult {
  /** Total hair count in analyzed area */
  totalHairCount: number;
  /** Hairs per square centimeter */
  density: number;
  /** Follicular units per square centimeter */
  follicularUnits: number;
  /** Distribution: single/double/triple/quad follicular units */
  fuDistribution: {
    single: number;
    double: number;
    triple: number;
    quad: number;
  };
  /** Analyzed area in square millimeters */
  analyzedArea: number;
  /** Measurement confidence (0-1) */
  confidence: number;
}

/**
 * Hair cycle phase classification
 */
export interface ICycleAnalysis {
  /** Anagen (growth) hair count */
  anagenCount: number;
  /** Catagen (transition) hair count */
  catagenCount: number;
  /** Telogen (resting) hair count */
  telogenCount: number;
  /** Anagen to telogen ratio (healthy ~0.85) */
  anagenTelogenRatio: number;
  /** Vellus (thin) hair count */
  vellusCount: number;
  /** Terminal (thick) hair count */
  terminalCount: number;
  /** Vellus to terminal ratio (healthy <0.2) */
  vellusTerminalRatio: number;
  /** Classification confidence (0-1) */
  confidence: number;
}

/**
 * SAM-based segmentation result
 */
export interface ISegmentationResult {
  /** Follicular unit masks (binary masks as base64) */
  follicleMasks: string[];
  /** Scalp region mask */
  scalpMask: string;
  /** Hair shaft masks */
  shaftMasks: string[];
  /** Region of interest boundaries */
  roiBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Segmentation confidence (0-1) */
  confidence: number;
}

/**
 * Attention/explainability heatmap
 */
export interface IAttentionMap {
  /** Heatmap data as base64 image */
  heatmap: string;
  /** Top attention regions */
  topRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    attention: number;
  }>;
  /** Method used (Grad-CAM, ViT-CX, etc.) */
  method: 'grad-cam' | 'vit-cx' | 'attention-rollout';
}

/**
 * Similar case from vector database
 */
export interface ISimilarCase {
  /** Case identifier */
  caseId: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Diagnosis/state of similar case */
  diagnosis: string;
  /** Treatment that was applied */
  treatment?: string;
  /** Treatment outcome */
  outcome?: 'positive' | 'neutral' | 'negative';
}

/**
 * Complete trichoscopy analysis result
 */
export interface ITrichoscopyAnalysis {
  /** Analysis identifier */
  analysisId: string;
  /** Source image reference */
  imageId: string;
  /** Scalp zone analyzed */
  zone: ScalpZone;
  /** Analysis timestamp */
  analyzedAt: Date;

  /** DINOv2 embedding for similarity search */
  embedding: IImageEmbedding;

  /** Morphometric measurements */
  morphometry: IMorphometryResult;

  /** Density analysis */
  density: IDensityResult;

  /** Hair cycle analysis */
  cycleAnalysis: ICycleAnalysis;

  /** Segmentation masks */
  segmentation: ISegmentationResult;

  /** Explainability heatmap */
  attentionMap?: IAttentionMap;

  /** Similar cases from database */
  similarCases?: ISimilarCase[];

  /** Overall analysis confidence */
  overallConfidence: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Model versions used */
  modelVersions: {
    featureExtractor: string;
    morphometryHead: string;
    segmentationModel: string;
  };
}

/**
 * Vision pipeline configuration
 */
export interface IVisionConfig {
  /** Feature extraction model */
  featureExtractor: {
    model: 'dinov2-small' | 'dinov2-base' | 'dinov2-large' | 'dinov2-giant';
    device: 'cpu' | 'cuda' | 'mps';
    precision: 'fp32' | 'fp16' | 'int8';
  };

  /** Segmentation model */
  segmentation: {
    model: 'sam' | 'medsam' | 'sam-adapter';
    promptMode: 'automatic' | 'point' | 'box';
  };

  /** Morphometry extraction */
  morphometry: {
    minSampleSize: number;
    confidenceThreshold: number;
    calibration: {
      pixelsPerMicrometer: number;
    };
  };

  /** Similarity search */
  similaritySearch: {
    enabled: boolean;
    topK: number;
    minSimilarity: number;
    vectorDbUrl?: string;
  };

  /** Explainability */
  explainability: {
    enabled: boolean;
    method: 'grad-cam' | 'vit-cx' | 'attention-rollout';
  };

  /** Performance */
  performance: {
    batchSize: number;
    maxConcurrency: number;
    cacheEmbeddings: boolean;
  };
}

/**
 * Default vision configuration
 */
export const DEFAULT_VISION_CONFIG: IVisionConfig = {
  featureExtractor: {
    model: 'dinov2-large',
    device: 'cuda',
    precision: 'fp16',
  },
  segmentation: {
    model: 'medsam',
    promptMode: 'automatic',
  },
  morphometry: {
    minSampleSize: 10,
    confidenceThreshold: 0.7,
    calibration: {
      pixelsPerMicrometer: 2.5, // Depends on magnification
    },
  },
  similaritySearch: {
    enabled: true,
    topK: 5,
    minSimilarity: 0.7,
  },
  explainability: {
    enabled: true,
    method: 'vit-cx',
  },
  performance: {
    batchSize: 1,
    maxConcurrency: 4,
    cacheEmbeddings: true,
  },
};

/**
 * Vision module error types
 */
export enum VisionErrorCode {
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  CALIBRATION_MISSING = 'CALIBRATION_MISSING',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  SEGMENTATION_FAILED = 'SEGMENTATION_FAILED',
  VECTOR_DB_ERROR = 'VECTOR_DB_ERROR',
}

/**
 * Vision module error
 */
export class VisionError extends Error {
  constructor(
    public code: VisionErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VisionError';
  }
}
