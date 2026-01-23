/**
 * FolliCore gRPC Types
 *
 * TypeScript type definitions matching Protocol Buffers schema.
 *
 * IEC 62304 Note:
 *   These types ensure type safety between TypeScript and Python ML API.
 *   Any changes must be synchronized with ml/protos/*.proto files.
 *
 * References:
 * - Protocol Buffers: https://protobuf.dev/programming-guides/proto3/
 * - gRPC Node.js: https://grpc.io/docs/languages/node/basics/
 */

// ============================================================================
// COMMON TYPES (follicore.proto)
// ============================================================================

/**
 * Scalp zones for analysis (PGMU methodology)
 */
export enum ScalpZone {
  UNSPECIFIED = 0,
  FRONTAL = 1,
  TEMPORAL_LEFT = 2,
  TEMPORAL_RIGHT = 3,
  PARIETAL = 4,
  VERTEX = 5,
  OCCIPITAL = 6,
}

/**
 * Biological sex for safety rules (finasteride contraindications)
 */
export enum BiologicalSex {
  UNSPECIFIED = 0,
  MALE = 1,
  FEMALE = 2,
}

/**
 * Request metadata for traceability (IEC 62304)
 */
export interface RequestMetadata {
  /** Unique request identifier (UUID) */
  requestId: string;
  /** Client version */
  clientVersion: string;
  /** Timestamp (ISO 8601) */
  timestamp: string;
  /** Patient ID (pseudonymized) */
  patientId?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional context */
  context: Record<string, string>;
}

/**
 * Response metadata for audit trail
 */
export interface ResponseMetadata {
  /** Request ID (echoed) */
  requestId: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Model versions used */
  modelVersions: Record<string, string>;
  /** Timestamp */
  timestamp: string;
}

/**
 * Confidence score with explanation
 */
export interface ConfidenceScore {
  /** Confidence value (0.0 - 1.0) */
  value: number;
  /** Method used to calculate */
  method: string;
  /** Factors affecting confidence */
  factors: string[];
}

/**
 * Model information for version tracking
 */
export interface ModelInfo {
  /** Model identifier */
  modelId: string;
  /** Model name */
  modelName: string;
  /** Model version */
  version: string;
  /** Checkpoint identifier */
  checkpoint?: string;
  /** Training dataset */
  trainingDataset?: string;
  /** Metrics on validation set */
  metrics: Record<string, number>;
}

/**
 * Image quality assessment
 */
export interface ImageQualityAssessment {
  /** Overall quality score (0.0 - 1.0) */
  overallQuality: number;
  /** Sharpness score */
  sharpness: number;
  /** Brightness score */
  brightness: number;
  /** Contrast score */
  contrast: number;
  /** Is acceptable for analysis */
  isAcceptable: boolean;
  /** Issues detected */
  issues: string[];
  /** Recommendations for improvement */
  recommendations: string[];
}

// ============================================================================
// VISION SERVICE TYPES (vision.proto)
// ============================================================================

/**
 * Image data for analysis
 */
export interface ImageData {
  /** Image bytes (PNG or JPEG) */
  imageBytes: Uint8Array;
  /** Image format */
  format: 'PNG' | 'JPEG' | 'TIFF';
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Magnification level */
  magnification?: number;
  /** Scalp zone */
  zone?: ScalpZone;
}

/**
 * Feature extraction request
 */
export interface ExtractFeaturesRequest {
  /** Image data */
  image: ImageData;
  /** Request metadata */
  metadata: RequestMetadata;
  /** Return attention maps for explainability */
  returnAttentionMaps?: boolean;
  /** Return patch-level features */
  returnPatchFeatures?: boolean;
}

/**
 * Feature vector from DINOv2
 */
export interface FeatureVector {
  /** CLS token embedding */
  embedding: Float32Array;
  /** Embedding dimension */
  dimension: number;
  /** Patch embeddings (optional) */
  patchEmbeddings?: Float32Array[];
  /** Attention maps (optional) */
  attentionMaps?: AttentionMap[];
}

/**
 * Attention map for explainability (GDPR Article 22)
 */
export interface AttentionMap {
  /** Layer index */
  layer: number;
  /** Head index */
  head: number;
  /** Attention weights (flattened) */
  weights: Float32Array;
  /** Height of attention map */
  height: number;
  /** Width of attention map */
  width: number;
}

/**
 * Feature extraction response
 */
export interface ExtractFeaturesResponse {
  /** Feature vector */
  features: FeatureVector;
  /** Response metadata */
  metadata: ResponseMetadata;
  /** Image quality assessment */
  quality: ImageQualityAssessment;
  /** Model info */
  modelInfo: ModelInfo;
}

/**
 * Follicle state enum (matches TrichologyStates.ts)
 */
export enum FollicleState {
  UNSPECIFIED = 0,
  HEALTHY_ANAGEN = 1,
  HEALTHY_CATAGEN = 2,
  HEALTHY_TELOGEN = 3,
  EARLY_MINIATURIZATION = 4,
  ADVANCED_MINIATURIZATION = 5,
  STRESS_INDUCED = 6,
  INFLAMMATION = 7,
  SENILE_ALOPECIA = 8,
  DORMANT = 9,
  TERMINAL = 10,
}

/**
 * Bounding box for detected follicle
 */
export interface BoundingBox {
  /** X coordinate (normalized 0-1) */
  x: number;
  /** Y coordinate (normalized 0-1) */
  y: number;
  /** Width (normalized 0-1) */
  width: number;
  /** Height (normalized 0-1) */
  height: number;
}

/**
 * Detected follicle from segmentation
 */
export interface DetectedFollicle {
  /** Follicle ID within image */
  follicleId: string;
  /** Bounding box */
  boundingBox: BoundingBox;
  /** Segmentation mask (RLE encoded) */
  maskRle: Uint8Array;
  /** Predicted state */
  state: FollicleState;
  /** State confidence */
  stateConfidence: number;
  /** Bulb width in micrometers */
  bulbWidthUm: number;
  /** Shaft thickness in micrometers */
  shaftThicknessUm: number;
  /** Hair type (terminal vs vellus) */
  hairType: 'TERMINAL' | 'VELLUS' | 'INTERMEDIATE';
  /** Cycle phase (anagen, catagen, telogen) */
  cyclePhase: 'ANAGEN' | 'CATAGEN' | 'TELOGEN' | 'UNKNOWN';
}

/**
 * Segmentation request
 */
export interface SegmentFolliclesRequest {
  /** Image data */
  image: ImageData;
  /** Request metadata */
  metadata: RequestMetadata;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of follicles to detect */
  maxFollicles?: number;
  /** Calibration (pixels per micrometer) */
  calibration?: {
    pixelsPerMicrometer: number;
  };
}

/**
 * Segmentation response
 */
export interface SegmentFolliclesResponse {
  /** Detected follicles */
  follicles: DetectedFollicle[];
  /** Total follicle count */
  totalCount: number;
  /** Response metadata */
  metadata: ResponseMetadata;
  /** Segmentation model info */
  modelInfo: ModelInfo;
}

/**
 * Morphometric analysis result
 */
export interface MorphometricAnalysis {
  /** Mean bulb width in micrometers */
  meanBulbWidthUm: number;
  /** Std dev of bulb width */
  stdBulbWidthUm: number;
  /** Mean shaft thickness */
  meanShaftThicknessUm: number;
  /** Std dev of shaft thickness */
  stdShaftThicknessUm: number;
  /** Vellus to terminal ratio */
  vellusTerminalRatio: number;
  /** Anagen to telogen ratio */
  anagenTelogenRatio: number;
  /** Hair density (per cm²) */
  densityPerCm2: number;
  /** Follicular unit distribution */
  fuDistribution: {
    single: number;
    double: number;
    triple: number;
    quad: number;
  };
  /** Comparison with PGMU norms */
  pgmuComparison: {
    bulbWidthPercentile: number;
    shaftThicknessPercentile: number;
    densityPercentile: number;
    isWithinNormalRange: boolean;
    deviationFromMean: number;
  };
  /** Sample size */
  sampleSize: number;
  /** Overall confidence */
  confidence: ConfidenceScore;
}

/**
 * Analysis explanation for GDPR Article 22
 */
export interface AnalysisExplanation {
  /** Summary of analysis */
  summary: string;
  /** Key factors */
  keyFactors: Array<{
    factor: string;
    value: string;
    importance: number;
  }>;
  /** Attention visualization (base64 image) */
  attentionVisualization?: string;
  /** Comparison with similar cases */
  similarCases: Array<{
    caseId: string;
    similarity: number;
    outcome: string;
  }>;
  /** Limitations and caveats */
  limitations: string[];
}

// ============================================================================
// ACOUSTIC SERVICE TYPES (acoustic.proto)
// ============================================================================

/**
 * Audio data for analysis
 */
export interface AudioData {
  /** Audio samples (float32) */
  samples: Float32Array;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Recording format */
  format: 'PCM_FLOAT32' | 'PCM_INT16' | 'PCM_INT24';
  /** Scalp zone */
  zone?: ScalpZone;
}

/**
 * Acoustic feature extraction request
 */
export interface ExtractAcousticFeaturesRequest {
  /** Audio data */
  audio: AudioData;
  /** Request metadata */
  metadata: RequestMetadata;
  /** Return mel spectrogram */
  returnMelSpectrogram?: boolean;
  /** Return acoustic tokens */
  returnTokens?: boolean;
}

/**
 * Audio embedding from OpenBEATs/BEATs
 */
export interface AudioEmbedding {
  /** Embedding vector */
  embedding: Float32Array;
  /** Embedding dimension */
  dimension: number;
  /** Frame-level embeddings (optional) */
  frameEmbeddings?: Float32Array[];
  /** Acoustic tokens (optional) */
  tokens?: number[];
}

/**
 * Acoustic feature extraction response
 */
export interface ExtractAcousticFeaturesResponse {
  /** Audio embedding */
  features: AudioEmbedding;
  /** Response metadata */
  metadata: ResponseMetadata;
  /** Signal quality assessment */
  signalQuality: SignalQualityAssessment;
  /** Model info */
  modelInfo: ModelInfo;
}

/**
 * Signal quality assessment
 */
export interface SignalQualityAssessment {
  /** Signal-to-noise ratio in dB */
  snrDb: number;
  /** Is SNR acceptable */
  snrAcceptable: boolean;
  /** Contact quality (0-1) */
  contactQuality: number;
  /** Motion artifacts detected */
  motionArtifactsDetected: boolean;
  /** Ambient noise level dB SPL */
  ambientNoiseDb: number;
  /** Clipping detected */
  clippingDetected: boolean;
  /** Overall quality score */
  overallQuality: number;
  /** Issues */
  issues: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Hair property estimates
 */
export interface HairPropertyEstimates {
  /** Porosity score (0-1, lower is healthier) */
  porosity: {
    score: number;
    level: 'LOW' | 'NORMAL' | 'HIGH' | 'VARIABLE';
    confidence: number;
  };
  /** Hydration score (0-1, higher is healthier) */
  hydration: {
    score: number;
    level: 'DEHYDRATED' | 'LOW' | 'OPTIMAL' | 'HIGH';
    moisturePercent: number;
    confidence: number;
  };
  /** Structure classification */
  structure: {
    class: 'HEALTHY' | 'WEATHERED' | 'CHEMICALLY_DAMAGED' | 'MECHANICALLY_DAMAGED' | 'SEVERELY_DAMAGED';
    damageScore: number;
    damageTypes: string[];
    confidence: number;
  };
  /** Elasticity estimate */
  elasticity: {
    score: number;
    dampingCoefficient: number;
    resonanceFrequency: number;
    confidence: number;
  };
}

/**
 * Spectral analysis result
 */
export interface SpectralAnalysis {
  /** Spectral centroid */
  centroid: number;
  /** Spectral bandwidth */
  bandwidth: number;
  /** Spectral rolloff */
  rolloff: number;
  /** Spectral flatness */
  flatness: number;
  /** Zero crossing rate */
  zeroCrossingRate: number;
  /** RMS energy */
  rmsEnergy: number;
  /** MFCCs */
  mfcc: number[];
  /** Mel spectrogram (optional, base64) */
  melSpectrogramB64?: string;
}

/**
 * Hair properties analysis request
 */
export interface AnalyzeHairPropertiesRequest {
  /** Audio data */
  audio: AudioData;
  /** Request metadata */
  metadata: RequestMetadata;
  /** Include spectral analysis */
  includeSpectralAnalysis?: boolean;
  /** Include explanation */
  includeExplanation?: boolean;
}

/**
 * Hair properties analysis response
 */
export interface AnalyzeHairPropertiesResponse {
  /** Hair property estimates */
  properties: HairPropertyEstimates;
  /** Spectral analysis (optional) */
  spectralAnalysis?: SpectralAnalysis;
  /** Explanation (optional) */
  explanation?: AnalysisExplanation;
  /** Response metadata */
  metadata: ResponseMetadata;
  /** Model info */
  modelInfo: ModelInfo;
}

// ============================================================================
// HEALTH CHECK TYPES (health.proto)
// ============================================================================

/**
 * Health check status
 */
export enum ServingStatus {
  UNKNOWN = 0,
  SERVING = 1,
  NOT_SERVING = 2,
  SERVICE_UNKNOWN = 3,
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Serving status */
  status: ServingStatus;
}

/**
 * Model readiness response
 */
export interface ModelReadinessResponse {
  /** Is ready */
  ready: boolean;
  /** Status per model */
  models: Array<{
    modelId: string;
    loaded: boolean;
    warmedUp: boolean;
    lastUsedAt?: string;
    errorMessage?: string;
  }>;
}

/**
 * System health response
 */
export interface SystemHealthResponse {
  /** Overall healthy */
  healthy: boolean;
  /** Timestamp */
  timestamp: string;
  /** Uptime in seconds */
  uptimeSeconds: number;
  /** Component statuses */
  components: Record<string, {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    message?: string;
    latencyMs?: number;
  }>;
  /** Resource utilization */
  resources: {
    cpuPercent: number;
    memoryPercent: number;
    gpuPercent?: number;
    gpuMemoryPercent?: number;
  };
}

// ============================================================================
// CLIENT CONFIGURATION
// ============================================================================

/**
 * gRPC client configuration
 */
export interface GrpcClientConfig {
  /** ML API host */
  host: string;
  /** gRPC port */
  port: number;
  /** Use TLS */
  useTls: boolean;
  /** TLS certificate path (if useTls) */
  tlsCertPath?: string;
  /** Connection timeout in milliseconds */
  connectTimeoutMs: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Retry configuration */
  retry: {
    maxRetries: number;
    initialBackoffMs: number;
    maxBackoffMs: number;
    backoffMultiplier: number;
  };
  /** Keepalive configuration */
  keepalive: {
    timeMs: number;
    timeoutMs: number;
    permitWithoutCalls: boolean;
  };
  /** Enable compression */
  compression: boolean;
  /** Max message size in bytes */
  maxMessageSize: number;
}

/**
 * Default gRPC client configuration
 */
export const DEFAULT_GRPC_CONFIG: GrpcClientConfig = {
  host: 'localhost',
  port: 50051,
  useTls: false,
  connectTimeoutMs: 5000,
  requestTimeoutMs: 30000,
  retry: {
    maxRetries: 3,
    initialBackoffMs: 100,
    maxBackoffMs: 5000,
    backoffMultiplier: 2,
  },
  keepalive: {
    timeMs: 30000,
    timeoutMs: 5000,
    permitWithoutCalls: true,
  },
  compression: true,
  maxMessageSize: 100 * 1024 * 1024, // 100MB for images
};

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * gRPC error codes
 */
export enum GrpcErrorCode {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}

/**
 * gRPC error class
 */
export class GrpcError extends Error {
  constructor(
    public code: GrpcErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GrpcError';
  }
}

/**
 * Connection error
 */
export class GrpcConnectionError extends GrpcError {
  constructor(message: string, details?: unknown) {
    super(GrpcErrorCode.UNAVAILABLE, message, details);
    this.name = 'GrpcConnectionError';
  }
}

/**
 * Timeout error
 */
export class GrpcTimeoutError extends GrpcError {
  constructor(message: string, details?: unknown) {
    super(GrpcErrorCode.DEADLINE_EXCEEDED, message, details);
    this.name = 'GrpcTimeoutError';
  }
}
