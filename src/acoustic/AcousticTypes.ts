/**
 * FolliCore Acoustic Module - Type Definitions
 *
 * Based on advanced research: OpenBEATs + Mamba-3 + ScAlN MEMS sensors
 * See: research/PHASE3_ACOUSTIC_ADVANCED_RESEARCH.md
 *
 * Scientific foundation:
 * - Acoustic impedance characteristics of human hair (PMC7984217)
 * - AI hair analysis via scattered acoustic waves (ScienceDaily 2024)
 * - Wearable mechano-acoustic sensors (Nanoscale 2025)
 */

import { ScalpZone } from '../vision/VisionTypes';

// ============================================================================
// SENSOR TYPES
// ============================================================================

/**
 * Acoustic sensor types supported by the system
 */
export type AcousticSensorType =
  | 'scaln_mems'      // Scandium-doped AlN MEMS (high-freq, 200kHz-2MHz)
  | 'piezo_contact'   // Piezoelectric contact microphone (20-100kHz)
  | 'capacitive_mems' // Standard MEMS microphone (20Hz-20kHz)
  | 'reference';      // Ambient noise reference

/**
 * Sensor channel configuration
 */
export interface ISensorChannel {
  /** Channel identifier */
  channelId: string;
  /** Sensor type */
  sensorType: AcousticSensorType;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Bit depth (16, 24, or 32) */
  bitDepth: 16 | 24 | 32;
  /** Frequency range in Hz [min, max] */
  frequencyRange: [number, number];
  /** Sensitivity in dB/Pa */
  sensitivity: number;
  /** Is this channel active */
  active: boolean;
}

/**
 * Sensor array configuration
 */
export interface ISensorArrayConfig {
  /** Array identifier */
  arrayId: string;
  /** Individual sensor channels */
  channels: ISensorChannel[];
  /** ADC model/version */
  adcModel: string;
  /** MCU identifier */
  mcuId: string;
  /** Firmware version */
  firmwareVersion: string;
  /** Calibration date */
  calibratedAt: Date;
}

/**
 * Default sensor array configuration based on research recommendations
 */
export const DEFAULT_SENSOR_ARRAY: ISensorArrayConfig = {
  arrayId: 'follicore-acoustic-v1',
  channels: [
    {
      channelId: 'primary',
      sensorType: 'scaln_mems',
      sampleRate: 192000,
      bitDepth: 24,
      frequencyRange: [200000, 2000000],
      sensitivity: -38,
      active: true,
    },
    {
      channelId: 'contact',
      sensorType: 'piezo_contact',
      sampleRate: 192000,
      bitDepth: 24,
      frequencyRange: [20, 100000],
      sensitivity: -42,
      active: true,
    },
    {
      channelId: 'ambient',
      sensorType: 'reference',
      sampleRate: 48000,
      bitDepth: 16,
      frequencyRange: [20, 20000],
      sensitivity: -26,
      active: true,
    },
  ],
  adcModel: 'ADS1256',
  mcuId: 'ESP32-S3',
  firmwareVersion: '1.0.0',
  calibratedAt: new Date(),
};

// ============================================================================
// AUDIO SIGNAL TYPES
// ============================================================================

/**
 * Raw audio signal input
 */
export interface IAudioSignal {
  /** Audio data as Float32Array (normalized -1 to 1) */
  data: Float32Array;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Duration in seconds */
  duration: number;
  /** Capture timestamp */
  capturedAt: Date;
  /** Source sensor channel */
  sourceChannel: string;
}

/**
 * Multi-channel acoustic recording
 */
export interface IAcousticRecording {
  /** Recording identifier */
  recordingId: string;
  /** Patient identifier */
  patientId: string;
  /** Scalp zone where recording was made */
  zone: ScalpZone;
  /** Individual channel signals */
  signals: Map<string, IAudioSignal>;
  /** Sensor array configuration used */
  sensorConfig: ISensorArrayConfig;
  /** Recording timestamp */
  recordedAt: Date;
  /** Total duration in seconds */
  totalDuration: number;
  /** Device identifier */
  deviceId: string;
  /** Environmental metadata */
  environment: IAcousticEnvironment;
}

/**
 * Environmental conditions during recording
 */
export interface IAcousticEnvironment {
  /** Ambient noise level in dB SPL */
  ambientNoiseDb: number;
  /** Temperature in Celsius */
  temperature?: number;
  /** Humidity percentage */
  humidity?: number;
  /** Contact pressure (if measured) */
  contactPressure?: number;
  /** Recording quality assessment */
  qualityScore: number;
}

// ============================================================================
// SPECTRAL ANALYSIS TYPES
// ============================================================================

/**
 * Mel spectrogram representation
 */
export interface IMelSpectrogram {
  /** Spectrogram data [time_frames x mel_bins] */
  data: Float32Array[];
  /** Number of time frames */
  timeFrames: number;
  /** Number of mel frequency bins */
  melBins: number;
  /** Hop size in samples */
  hopSize: number;
  /** Window size in samples */
  windowSize: number;
  /** Minimum frequency in Hz */
  fMin: number;
  /** Maximum frequency in Hz */
  fMax: number;
}

/**
 * Spectral features extracted from audio
 */
export interface ISpectralFeatures {
  /** Spectral centroid (brightness) */
  centroid: number;
  /** Spectral bandwidth */
  bandwidth: number;
  /** Spectral rolloff (95% energy) */
  rolloff: number;
  /** Spectral flatness (tonality) */
  flatness: number;
  /** Spectral contrast per band */
  contrast: number[];
  /** Zero crossing rate */
  zeroCrossingRate: number;
  /** RMS energy */
  rmsEnergy: number;
  /** Mel-frequency cepstral coefficients */
  mfcc: number[];
}

/**
 * Time-frequency analysis result
 */
export interface ITimeFrequencyAnalysis {
  /** Mel spectrogram */
  melSpectrogram: IMelSpectrogram;
  /** Frame-wise spectral features */
  spectralFeatures: ISpectralFeatures[];
  /** Global (aggregated) features */
  globalFeatures: ISpectralFeatures;
  /** Analysis timestamp */
  analyzedAt: Date;
}

// ============================================================================
// ML EMBEDDING TYPES
// ============================================================================

/**
 * OpenBEATs/Audio embedding output
 */
export interface IAudioEmbedding {
  /** Raw embedding vector */
  vector: Float32Array;
  /** Embedding dimension (768 for OpenBEATs-base) */
  dimension: number;
  /** Model used for extraction */
  model: AcousticModelType;
  /** Model version */
  modelVersion: string;
  /** Extraction timestamp */
  extractedAt: Date;
  /** Layer from which embedding was extracted */
  layer: number;
}

/**
 * Acoustic tokenizer output (BEATs-style)
 */
export interface IAcousticTokens {
  /** Token IDs */
  tokenIds: number[];
  /** Token embeddings */
  tokenEmbeddings: Float32Array[];
  /** Number of tokens */
  numTokens: number;
  /** Codebook size used */
  codebookSize: number;
}

/**
 * Supported acoustic ML models
 */
export type AcousticModelType =
  | 'openbeats-base'       // OpenBEATs base model
  | 'openbeats-large'      // OpenBEATs large model
  | 'beats-iter3'          // Original BEATs iteration 3
  | 'mamba-audio'          // Mamba-based audio model
  | 'ast-base'             // Audio Spectrogram Transformer
  | 'wav2vec2-conformer'   // Original planned model
  | 'whisper-encoder';     // Whisper encoder only

// ============================================================================
// HAIR STRUCTURE ANALYSIS TYPES
// ============================================================================

/**
 * Hair structure classification
 */
export type HairStructureClass =
  | 'healthy'       // Normal, undamaged structure
  | 'weathered'     // Mild environmental damage
  | 'chemically_damaged'  // Chemical treatment damage
  | 'mechanically_damaged' // Physical damage (heat, friction)
  | 'severely_damaged';    // Multiple damage types

/**
 * Porosity level classification
 */
export type PorosityLevel =
  | 'low'      // Cuticle tightly closed, healthy
  | 'normal'   // Slightly open cuticle, normal
  | 'high'     // Very open/damaged cuticle
  | 'variable'; // Inconsistent along shaft

/**
 * Hydration level classification
 */
export type HydrationLevel =
  | 'dehydrated'   // <8% moisture
  | 'low'          // 8-10% moisture
  | 'optimal'      // 10-15% moisture
  | 'high';        // >15% moisture

/**
 * Porosity analysis result
 */
export interface IPorosityAnalysis {
  /** Porosity score (0-1, lower is healthier) */
  score: number;
  /** Porosity level classification */
  level: PorosityLevel;
  /** High-frequency absorption coefficient */
  absorptionCoefficient: number;
  /** Cuticle integrity estimate (0-1) */
  cuticleIntegrity: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Hydration analysis result
 */
export interface IHydrationAnalysis {
  /** Hydration score (0-1, higher is healthier) */
  score: number;
  /** Hydration level classification */
  level: HydrationLevel;
  /** Estimated moisture percentage */
  moisturePercent: number;
  /** Wave velocity (correlates with moisture) */
  waveVelocity: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Structural damage analysis result
 */
export interface IStructuralAnalysis {
  /** Structure class */
  structureClass: HairStructureClass;
  /** Damage score (0-1, higher is more damaged) */
  damageScore: number;
  /** Scattering pattern regularity (0-1, higher is more regular/healthy) */
  scatteringRegularity: number;
  /** Damping coefficient (elasticity indicator) */
  dampingCoefficient: number;
  /** Resonance frequency (thickness indicator) */
  resonanceFrequency: number;
  /** Detected damage types */
  damageTypes: DamageType[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Types of hair damage detectable via acoustics
 */
export type DamageType =
  | 'cuticle_lifting'      // Raised cuticle scales
  | 'cortex_exposure'      // Exposed inner cortex
  | 'split_ends'           // Trichoptilosis
  | 'breakage_prone'       // Weak points
  | 'heat_damage'          // Thermal damage
  | 'chemical_damage'      // Chemical processing damage
  | 'mechanical_wear';     // Friction damage

// ============================================================================
// COMPLETE ANALYSIS TYPES
// ============================================================================

/**
 * Extended acoustic observation (replaces minimal IAcousticObservation)
 * This is the full analysis result for POMDP integration
 */
export interface IAcousticAnalysisResult {
  /** Analysis identifier */
  analysisId: string;
  /** Source recording reference */
  recordingId: string;
  /** Scalp zone analyzed */
  zone: ScalpZone;
  /** Analysis timestamp */
  analyzedAt: Date;

  /** Audio embedding for similarity search */
  embedding: IAudioEmbedding;

  /** Porosity analysis */
  porosity: IPorosityAnalysis;

  /** Hydration analysis */
  hydration: IHydrationAnalysis;

  /** Structural analysis */
  structure: IStructuralAnalysis;

  /** Time-frequency features */
  spectralAnalysis: ITimeFrequencyAnalysis;

  /** Acoustic tokens (for multimodal fusion) */
  acousticTokens?: IAcousticTokens;

  /** Overall analysis confidence */
  overallConfidence: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Model versions used */
  modelVersions: {
    featureExtractor: string;
    porosityHead: string;
    hydrationHead: string;
    structureHead: string;
  };

  /** Quality flags */
  qualityFlags: IAcousticQualityFlags;
}

/**
 * Quality assessment flags
 */
export interface IAcousticQualityFlags {
  /** Is signal-to-noise ratio acceptable */
  snrAcceptable: boolean;
  /** Is contact quality good */
  contactQualityGood: boolean;
  /** Were there motion artifacts */
  motionArtifactsDetected: boolean;
  /** Is ambient noise within limits */
  ambientNoiseAcceptable: boolean;
  /** Overall quality score (0-1) */
  overallQuality: number;
  /** Warnings */
  warnings: string[];
}

/**
 * Simplified observation for POMDP (compatible with TrichologyStates.ts)
 */
export interface IAcousticObservation {
  /** Porosity score (0-1, lower is healthier) */
  porosity: number;
  /** Hydration score (0-1, higher is healthier) */
  hydration: number;
  /** Structure classification */
  structureClass: 'healthy' | 'weathered' | 'damaged';
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Convert full analysis to simplified POMDP observation
 */
export function toAcousticObservation(
  analysis: IAcousticAnalysisResult
): IAcousticObservation {
  // Map detailed structure class to simplified
  let structureClass: 'healthy' | 'weathered' | 'damaged';
  switch (analysis.structure.structureClass) {
    case 'healthy':
      structureClass = 'healthy';
      break;
    case 'weathered':
      structureClass = 'weathered';
      break;
    default:
      structureClass = 'damaged';
  }

  return {
    porosity: analysis.porosity.score,
    hydration: analysis.hydration.score,
    structureClass,
    confidence: analysis.overallConfidence,
  };
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Acoustic pipeline configuration
 */
export interface IAcousticConfig {
  /** Feature extraction model */
  featureExtractor: {
    model: AcousticModelType;
    device: 'cpu' | 'cuda' | 'edge';
    precision: 'fp32' | 'fp16' | 'int8';
    batchSize: number;
  };

  /** Spectral analysis settings */
  spectral: {
    nFft: number;
    hopLength: number;
    nMels: number;
    fMin: number;
    fMax: number;
    windowType: 'hann' | 'hamming' | 'blackman';
  };

  /** Analysis thresholds */
  thresholds: {
    minConfidence: number;
    minSnrDb: number;
    maxAmbientNoiseDb: number;
    minRecordingDuration: number;
    maxRecordingDuration: number;
  };

  /** Edge deployment settings */
  edge: {
    enabled: boolean;
    modelPath: string;
    quantized: boolean;
    maxLatencyMs: number;
  };

  /** Similarity search */
  similaritySearch: {
    enabled: boolean;
    topK: number;
    minSimilarity: number;
    vectorDbUrl?: string;
  };
}

/**
 * Default acoustic configuration based on research recommendations
 */
export const DEFAULT_ACOUSTIC_CONFIG: IAcousticConfig = {
  featureExtractor: {
    model: 'openbeats-base',
    device: 'cuda',
    precision: 'fp16',
    batchSize: 1,
  },
  spectral: {
    nFft: 2048,
    hopLength: 512,
    nMels: 128,
    fMin: 20,
    fMax: 96000,  // High for ultrasonic analysis
    windowType: 'hann',
  },
  thresholds: {
    minConfidence: 0.6,
    minSnrDb: 20,
    maxAmbientNoiseDb: 60,
    minRecordingDuration: 5,
    maxRecordingDuration: 30,
  },
  edge: {
    enabled: false,
    modelPath: '',
    quantized: false,
    maxLatencyMs: 100,
  },
  similaritySearch: {
    enabled: true,
    topK: 5,
    minSimilarity: 0.7,
  },
};

/**
 * Edge-optimized configuration for TinyML deployment
 */
export const EDGE_ACOUSTIC_CONFIG: IAcousticConfig = {
  featureExtractor: {
    model: 'mamba-audio',
    device: 'edge',
    precision: 'int8',
    batchSize: 1,
  },
  spectral: {
    nFft: 1024,
    hopLength: 256,
    nMels: 64,
    fMin: 20,
    fMax: 48000,
    windowType: 'hann',
  },
  thresholds: {
    minConfidence: 0.5,
    minSnrDb: 15,
    maxAmbientNoiseDb: 70,
    minRecordingDuration: 3,
    maxRecordingDuration: 15,
  },
  edge: {
    enabled: true,
    modelPath: '/models/acoustic_int8.tflite',
    quantized: true,
    maxLatencyMs: 50,
  },
  similaritySearch: {
    enabled: false,
    topK: 0,
    minSimilarity: 0,
  },
};

// ============================================================================
// MEASUREMENT PROTOCOL TYPES
// ============================================================================

/**
 * Measurement protocol phases
 */
export type MeasurementPhase =
  | 'calibration'      // Sensor calibration
  | 'contact_check'    // Verify sensor contact
  | 'pulse_emission'   // Active chirp signal
  | 'passive_recording' // Passive vibration capture
  | 'analysis';        // ML analysis

/**
 * Measurement protocol configuration
 */
export interface IMeasurementProtocol {
  /** Protocol name */
  name: string;
  /** Protocol version */
  version: string;
  /** Phase durations in seconds */
  phaseDurations: Record<MeasurementPhase, number>;
  /** Chirp signal configuration (for pulse emission) */
  chirpConfig: {
    startFrequency: number;
    endFrequency: number;
    duration: number;
    amplitude: number;
  };
  /** Minimum acceptable contact impedance */
  minContactImpedance: number;
  /** Maximum acceptable contact impedance */
  maxContactImpedance: number;
}

/**
 * Default measurement protocol
 */
export const DEFAULT_MEASUREMENT_PROTOCOL: IMeasurementProtocol = {
  name: 'follicore-standard',
  version: '1.0.0',
  phaseDurations: {
    calibration: 5,
    contact_check: 2,
    pulse_emission: 2,
    passive_recording: 3,
    analysis: 0,  // Variable, depends on compute
  },
  chirpConfig: {
    startFrequency: 1000,
    endFrequency: 100000,
    duration: 0.5,
    amplitude: 0.3,
  },
  minContactImpedance: 100,
  maxContactImpedance: 10000,
};

/**
 * Measurement session state
 */
export interface IMeasurementSession {
  /** Session identifier */
  sessionId: string;
  /** Patient identifier */
  patientId: string;
  /** Current phase */
  currentPhase: MeasurementPhase;
  /** Phase start time */
  phaseStartedAt: Date;
  /** Protocol being used */
  protocol: IMeasurementProtocol;
  /** Collected recordings */
  recordings: IAcousticRecording[];
  /** Session status */
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// REFERENCE DATA TYPES
// ============================================================================

/**
 * Reference acoustic signature for comparison
 */
export interface IAcousticReference {
  /** Reference identifier */
  referenceId: string;
  /** Hair condition this represents */
  condition: HairStructureClass;
  /** Porosity level */
  porosityLevel: PorosityLevel;
  /** Hydration level */
  hydrationLevel: HydrationLevel;
  /** Reference embedding */
  embedding: Float32Array;
  /** Sample size this reference was built from */
  sampleSize: number;
  /** Creation date */
  createdAt: Date;
}

/**
 * Acoustic norms by hair type and condition
 * Similar to PGMU_NORMS for morphometry
 */
export const ACOUSTIC_NORMS = {
  healthy: {
    porosity: { mean: 0.2, std: 0.08 },
    hydration: { mean: 0.75, std: 0.1 },
    absorptionCoefficient: { mean: 0.15, std: 0.05 },
    dampingCoefficient: { mean: 0.3, std: 0.1 },
  },
  weathered: {
    porosity: { mean: 0.45, std: 0.12 },
    hydration: { mean: 0.55, std: 0.15 },
    absorptionCoefficient: { mean: 0.35, std: 0.1 },
    dampingCoefficient: { mean: 0.5, std: 0.12 },
  },
  damaged: {
    porosity: { mean: 0.7, std: 0.15 },
    hydration: { mean: 0.35, std: 0.12 },
    absorptionCoefficient: { mean: 0.55, std: 0.15 },
    dampingCoefficient: { mean: 0.7, std: 0.15 },
  },
};

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Acoustic module error codes
 */
export enum AcousticErrorCode {
  // Recording errors
  RECORDING_FAILED = 'RECORDING_FAILED',
  SENSOR_NOT_CONNECTED = 'SENSOR_NOT_CONNECTED',
  POOR_CONTACT = 'POOR_CONTACT',
  LOW_SNR = 'LOW_SNR',
  EXCESSIVE_NOISE = 'EXCESSIVE_NOISE',
  RECORDING_TOO_SHORT = 'RECORDING_TOO_SHORT',
  RECORDING_TOO_LONG = 'RECORDING_TOO_LONG',

  // Analysis errors
  MODEL_NOT_LOADED = 'MODEL_NOT_LOADED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  INVALID_SIGNAL = 'INVALID_SIGNAL',

  // Calibration errors
  CALIBRATION_FAILED = 'CALIBRATION_FAILED',
  CALIBRATION_EXPIRED = 'CALIBRATION_EXPIRED',

  // Edge deployment errors
  EDGE_MODEL_NOT_FOUND = 'EDGE_MODEL_NOT_FOUND',
  EDGE_INFERENCE_TIMEOUT = 'EDGE_INFERENCE_TIMEOUT',
  EDGE_MEMORY_EXCEEDED = 'EDGE_MEMORY_EXCEEDED',

  // Protocol errors
  PROTOCOL_VIOLATED = 'PROTOCOL_VIOLATED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
}

/**
 * Acoustic module error
 */
export class AcousticError extends Error {
  constructor(
    public code: AcousticErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AcousticError';
  }
}

// ============================================================================
// BACKEND INTERFACES (for pluggable implementations)
// ============================================================================

/**
 * Interface for audio feature extraction backend
 */
export interface IFeatureExtractorBackend {
  /** Initialize the model */
  initialize(): Promise<void>;

  /** Extract embeddings from audio */
  extractEmbedding(signal: IAudioSignal): Promise<IAudioEmbedding>;

  /** Extract acoustic tokens */
  extractTokens(signal: IAudioSignal): Promise<IAcousticTokens>;

  /** Get model info */
  getModelInfo(): { name: string; version: string; device: string };

  /** Cleanup resources */
  dispose(): Promise<void>;
}

/**
 * Interface for hair analysis backend
 */
export interface IHairAnalysisBackend {
  /** Initialize the model */
  initialize(): Promise<void>;

  /** Analyze porosity */
  analyzePorosity(
    embedding: IAudioEmbedding,
    spectral: ITimeFrequencyAnalysis
  ): Promise<IPorosityAnalysis>;

  /** Analyze hydration */
  analyzeHydration(
    embedding: IAudioEmbedding,
    spectral: ITimeFrequencyAnalysis
  ): Promise<IHydrationAnalysis>;

  /** Analyze structure */
  analyzeStructure(
    embedding: IAudioEmbedding,
    spectral: ITimeFrequencyAnalysis
  ): Promise<IStructuralAnalysis>;

  /** Cleanup resources */
  dispose(): Promise<void>;
}

/**
 * Interface for spectral analysis backend
 */
export interface ISpectralAnalysisBackend {
  /** Compute mel spectrogram */
  computeMelSpectrogram(
    signal: IAudioSignal,
    config: IAcousticConfig['spectral']
  ): Promise<IMelSpectrogram>;

  /** Extract spectral features */
  extractSpectralFeatures(
    spectrogram: IMelSpectrogram
  ): Promise<ISpectralFeatures[]>;

  /** Compute global features */
  computeGlobalFeatures(
    frameFeatures: ISpectralFeatures[]
  ): ISpectralFeatures;
}
