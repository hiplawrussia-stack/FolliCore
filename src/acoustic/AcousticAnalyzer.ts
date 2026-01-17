/**
 * FolliCore Acoustic Module - AcousticAnalyzer
 *
 * Main orchestrator for acoustic hair structure analysis.
 * Architecture: OpenBEATs/Mamba (foundation) + Task-specific heads
 *
 * Pipeline:
 * 1. Signal preprocessing & quality check
 * 2. Spectral analysis (Mel spectrogram, MFCCs)
 * 3. Feature extraction (OpenBEATs/Mamba embeddings)
 * 4. Hair analysis heads (porosity, hydration, structure)
 * 5. Result aggregation with confidence scoring
 *
 * @see research/PHASE3_ACOUSTIC_ADVANCED_RESEARCH.md
 */

import {
  // Signal types
  IAudioSignal,
  IAcousticRecording,
  IAcousticEnvironment,

  // Spectral types
  IMelSpectrogram,
  ISpectralFeatures,
  ITimeFrequencyAnalysis,

  // ML types
  IAudioEmbedding,
  IAcousticTokens,

  // Analysis types
  IPorosityAnalysis,
  IHydrationAnalysis,
  IStructuralAnalysis,
  IAcousticAnalysisResult,
  IAcousticQualityFlags,
  IAcousticObservation,
  toAcousticObservation,

  // Configuration
  IAcousticConfig,
  DEFAULT_ACOUSTIC_CONFIG,
  EDGE_ACOUSTIC_CONFIG,

  // Reference
  ACOUSTIC_NORMS,

  // Backend interfaces
  IFeatureExtractorBackend,
  IHairAnalysisBackend,
  ISpectralAnalysisBackend,

  // Errors
  AcousticError,
  AcousticErrorCode,
} from './AcousticTypes';

import { ScalpZone } from '../vision/VisionTypes';

// ============================================================================
// ADDITIONAL BACKEND INTERFACES
// ============================================================================

/**
 * Signal preprocessor interface
 * Handles noise reduction, normalization, and quality assessment
 */
export interface ISignalPreprocessor {
  /** Preprocess raw audio signal */
  preprocess(signal: IAudioSignal): Promise<IAudioSignal>;

  /** Apply noise reduction using reference channel */
  reduceNoise(signal: IAudioSignal, reference: IAudioSignal): Promise<IAudioSignal>;

  /** Normalize signal amplitude */
  normalize(signal: IAudioSignal): IAudioSignal;

  /** Calculate signal-to-noise ratio in dB */
  calculateSnr(signal: IAudioSignal, reference?: IAudioSignal): number;

  /** Detect motion artifacts */
  detectMotionArtifacts(signal: IAudioSignal): boolean;
}

/**
 * Acoustic similarity search interface
 */
export interface IAcousticVectorDatabase {
  /** Search for similar acoustic signatures */
  search(
    embedding: IAudioEmbedding,
    topK: number,
    minSimilarity: number
  ): Promise<IAcousticSimilarCase[]>;

  /** Add case to database */
  addCase(
    caseId: string,
    embedding: IAudioEmbedding,
    metadata: IAcousticCaseMetadata
  ): Promise<void>;

  /** Check connection */
  isConnected(): boolean;
}

/**
 * Similar acoustic case from database
 */
export interface IAcousticSimilarCase {
  /** Case identifier */
  caseId: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Hair condition */
  condition: string;
  /** Treatment applied */
  treatment?: string;
  /** Treatment outcome */
  outcome?: 'positive' | 'neutral' | 'negative';
}

/**
 * Metadata for acoustic case storage
 */
export interface IAcousticCaseMetadata {
  condition: string;
  porosityLevel: string;
  hydrationLevel: string;
  treatment?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// ANALYZER COMPONENTS
// ============================================================================

/**
 * All components required by AcousticAnalyzer
 */
export interface IAcousticAnalyzerComponents {
  /** Signal preprocessor */
  preprocessor: ISignalPreprocessor;
  /** Spectral analysis backend */
  spectralBackend: ISpectralAnalysisBackend;
  /** Feature extraction backend (OpenBEATs/Mamba) */
  featureExtractor: IFeatureExtractorBackend;
  /** Hair analysis backend */
  hairAnalysisBackend: IHairAnalysisBackend;
  /** Optional: Vector database for similarity search */
  vectorDb?: IAcousticVectorDatabase;
}

// ============================================================================
// ACOUSTIC ANALYZER CLASS
// ============================================================================

/**
 * AcousticAnalyzer - Main analysis orchestrator
 *
 * Coordinates all acoustic components to produce comprehensive hair structure
 * analysis that can be fed into FolliCoreEngine's POMDP alongside vision data.
 *
 * @example
 * ```typescript
 * const analyzer = new AcousticAnalyzer();
 * await analyzer.initialize(components);
 *
 * const result = await analyzer.analyze(recording);
 * const observation = analyzer.toObservation(result);
 * ```
 */
export class AcousticAnalyzer {
  private config: IAcousticConfig;
  private preprocessor: ISignalPreprocessor | null = null;
  private spectralBackend: ISpectralAnalysisBackend | null = null;
  private featureExtractor: IFeatureExtractorBackend | null = null;
  private hairAnalysisBackend: IHairAnalysisBackend | null = null;
  private vectorDb: IAcousticVectorDatabase | null = null;
  private isInitialized = false;

  constructor(config: Partial<IAcousticConfig> = {}) {
    this.config = { ...DEFAULT_ACOUSTIC_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize analyzer with ML backends
   *
   * @param components - Required backend components
   */
  async initialize(components: IAcousticAnalyzerComponents): Promise<void> {
    this.preprocessor = components.preprocessor;
    this.spectralBackend = components.spectralBackend;
    this.featureExtractor = components.featureExtractor;
    this.hairAnalysisBackend = components.hairAnalysisBackend;
    this.vectorDb = components.vectorDb || null;

    // Initialize all backends
    await Promise.all([
      this.featureExtractor.initialize(),
      this.hairAnalysisBackend.initialize(),
    ]);

    this.isInitialized = true;
  }

  /**
   * Check if analyzer is ready for analysis
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  // ==========================================================================
  // MAIN ANALYSIS METHODS
  // ==========================================================================

  /**
   * Analyze an acoustic recording
   *
   * Full pipeline: preprocessing → spectral → embedding → hair analysis
   *
   * @param recording - Multi-channel acoustic recording
   * @returns Complete analysis result
   */
  async analyze(recording: IAcousticRecording): Promise<IAcousticAnalysisResult> {
    if (!this.isInitialized) {
      throw new AcousticError(
        AcousticErrorCode.MODEL_NOT_LOADED,
        'Analyzer not initialized. Call initialize() first.'
      );
    }

    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();

    // Step 1: Validate recording
    this.validateRecording(recording);

    // Step 2: Get primary signal and preprocess
    const primarySignal = this.getPrimarySignal(recording);
    const referenceSignal = this.getReferenceSignal(recording);

    // Step 3: Quality assessment
    const qualityFlags = await this.assessQuality(
      primarySignal,
      referenceSignal,
      recording.environment
    );

    // Check if quality is acceptable
    if (qualityFlags.overallQuality < this.config.thresholds.minConfidence) {
      throw new AcousticError(
        AcousticErrorCode.LOW_CONFIDENCE,
        `Recording quality too low: ${qualityFlags.overallQuality.toFixed(2)}`,
        { qualityFlags }
      );
    }

    // Step 4: Preprocess signal
    let processedSignal = this.preprocessor!.normalize(primarySignal);
    if (referenceSignal) {
      processedSignal = await this.preprocessor!.reduceNoise(
        processedSignal,
        referenceSignal
      );
    }
    processedSignal = await this.preprocessor!.preprocess(processedSignal);

    // Step 5: Spectral analysis
    const spectralAnalysis = await this.performSpectralAnalysis(processedSignal);

    // Step 6: Extract embeddings
    const embedding = await this.featureExtractor!.extractEmbedding(processedSignal);

    // Step 7: Extract acoustic tokens (optional, for multimodal fusion)
    let acousticTokens: IAcousticTokens | undefined;
    try {
      acousticTokens = await this.featureExtractor!.extractTokens(processedSignal);
    } catch {
      // Tokens are optional, continue without them
    }

    // Step 8: Hair structure analysis
    const [porosity, hydration, structure] = await Promise.all([
      this.hairAnalysisBackend!.analyzePorosity(embedding, spectralAnalysis),
      this.hairAnalysisBackend!.analyzeHydration(embedding, spectralAnalysis),
      this.hairAnalysisBackend!.analyzeStructure(embedding, spectralAnalysis),
    ]);

    // Step 9: Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      porosity.confidence,
      hydration.confidence,
      structure.confidence,
      qualityFlags.overallQuality
    );

    const processingTimeMs = Date.now() - startTime;

    // Build result
    const result: IAcousticAnalysisResult = {
      analysisId,
      recordingId: recording.recordingId,
      zone: recording.zone,
      analyzedAt: new Date(),
      embedding,
      porosity,
      hydration,
      structure,
      spectralAnalysis,
      acousticTokens,
      overallConfidence,
      processingTimeMs,
      modelVersions: this.getModelVersions(),
      qualityFlags,
    };

    return result;
  }

  /**
   * Analyze only - get analysis without full pipeline
   * Useful for quick preview or validation
   *
   * @param recording - Acoustic recording
   * @returns Simplified observation
   */
  async analyzeQuick(recording: IAcousticRecording): Promise<IAcousticObservation> {
    const result = await this.analyze(recording);
    return toAcousticObservation(result);
  }

  /**
   * Batch analyze multiple recordings
   *
   * @param recordings - Array of recordings to analyze
   * @returns Array of analysis results
   */
  async analyzeBatch(
    recordings: IAcousticRecording[]
  ): Promise<IAcousticAnalysisResult[]> {
    const results: IAcousticAnalysisResult[] = [];

    // Process sequentially to manage memory (audio data is large)
    for (const recording of recordings) {
      try {
        const result = await this.analyze(recording);
        results.push(result);
      } catch (error) {
        // Log error but continue with other recordings
        console.error(
          `Failed to analyze recording ${recording.recordingId}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Analyze multiple zones and aggregate results
   *
   * @param recordings - Recordings from different zones
   * @returns Aggregated analysis with zone breakdown
   */
  async analyzeMultiZone(
    recordings: IAcousticRecording[]
  ): Promise<IMultiZoneAcousticResult> {
    const zoneResults = await this.analyzeBatch(recordings);

    // Group by zone
    const byZone = new Map<ScalpZone, IAcousticAnalysisResult>();
    for (const result of zoneResults) {
      byZone.set(result.zone, result);
    }

    // Calculate aggregated metrics
    const aggregated = this.aggregateResults(zoneResults);

    return {
      zoneResults: byZone,
      aggregated,
      analyzedAt: new Date(),
      totalZones: zoneResults.length,
    };
  }

  // ==========================================================================
  // SIMILARITY SEARCH
  // ==========================================================================

  /**
   * Find similar acoustic signatures in database
   *
   * @param embedding - Audio embedding to search
   * @returns Similar cases
   */
  async findSimilar(embedding: IAudioEmbedding): Promise<IAcousticSimilarCase[]> {
    if (!this.vectorDb || !this.vectorDb.isConnected()) {
      return [];
    }

    return this.vectorDb.search(
      embedding,
      this.config.similaritySearch.topK,
      this.config.similaritySearch.minSimilarity
    );
  }

  /**
   * Add analyzed case to database for future similarity search
   *
   * @param analysis - Analysis result to store
   * @param metadata - Case metadata
   */
  async addToDatabase(
    analysis: IAcousticAnalysisResult,
    metadata: IAcousticCaseMetadata
  ): Promise<void> {
    if (!this.vectorDb) {
      throw new AcousticError(
        AcousticErrorCode.INFERENCE_FAILED,
        'Vector database not configured'
      );
    }

    await this.vectorDb.addCase(analysis.analysisId, analysis.embedding, metadata);
  }

  // ==========================================================================
  // CONVERSION METHODS
  // ==========================================================================

  /**
   * Convert full analysis to simplified POMDP observation
   *
   * @param analysis - Full analysis result
   * @returns Simplified observation for POMDP
   */
  toObservation(analysis: IAcousticAnalysisResult): IAcousticObservation {
    return toAcousticObservation(analysis);
  }

  /**
   * Compare analysis to reference norms
   *
   * @param analysis - Analysis result
   * @returns Deviation from healthy norms
   */
  compareToNorms(
    analysis: IAcousticAnalysisResult
  ): IAcousticNormComparison {
    const healthyNorms = ACOUSTIC_NORMS.healthy;

    const porosityDeviation =
      (analysis.porosity.score - healthyNorms.porosity.mean) /
      healthyNorms.porosity.std;

    const hydrationDeviation =
      (healthyNorms.hydration.mean - analysis.hydration.score) /
      healthyNorms.hydration.std;

    const dampingDeviation =
      (analysis.structure.dampingCoefficient - healthyNorms.dampingCoefficient.mean) /
      healthyNorms.dampingCoefficient.std;

    // Overall health score (0-1, higher is healthier)
    const healthScore = Math.max(
      0,
      1 - (Math.abs(porosityDeviation) + Math.abs(hydrationDeviation) + Math.abs(dampingDeviation)) / 6
    );

    return {
      porosityDeviation,
      hydrationDeviation,
      dampingDeviation,
      healthScore,
      classification: this.classifyHealthScore(healthScore),
    };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get current configuration
   */
  getConfig(): IAcousticConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   *
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<IAcousticConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Switch to edge-optimized configuration
   */
  useEdgeConfig(): void {
    this.config = { ...EDGE_ACOUSTIC_CONFIG };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleanup resources and dispose backends
   */
  async dispose(): Promise<void> {
    if (this.featureExtractor) {
      await this.featureExtractor.dispose();
    }
    if (this.hairAnalysisBackend) {
      await this.hairAnalysisBackend.dispose();
    }
    this.isInitialized = false;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Validate recording before analysis
   */
  private validateRecording(recording: IAcousticRecording): void {
    if (!recording.signals || recording.signals.size === 0) {
      throw new AcousticError(
        AcousticErrorCode.INVALID_SIGNAL,
        'Recording contains no signals'
      );
    }

    if (recording.totalDuration < this.config.thresholds.minRecordingDuration) {
      throw new AcousticError(
        AcousticErrorCode.RECORDING_TOO_SHORT,
        `Recording too short: ${recording.totalDuration}s, minimum ${this.config.thresholds.minRecordingDuration}s`
      );
    }

    if (recording.totalDuration > this.config.thresholds.maxRecordingDuration) {
      throw new AcousticError(
        AcousticErrorCode.RECORDING_TOO_LONG,
        `Recording too long: ${recording.totalDuration}s, maximum ${this.config.thresholds.maxRecordingDuration}s`
      );
    }
  }

  /**
   * Get primary signal from recording
   */
  private getPrimarySignal(recording: IAcousticRecording): IAudioSignal {
    // Try to get primary channel, fall back to first available
    const primary = recording.signals.get('primary');
    if (primary) return primary;

    const contact = recording.signals.get('contact');
    if (contact) return contact;

    // Get first available signal
    const firstSignal = recording.signals.values().next().value;
    if (!firstSignal) {
      throw new AcousticError(
        AcousticErrorCode.INVALID_SIGNAL,
        'No valid signal found in recording'
      );
    }
    return firstSignal;
  }

  /**
   * Get reference signal for noise cancellation
   */
  private getReferenceSignal(recording: IAcousticRecording): IAudioSignal | null {
    return recording.signals.get('ambient') || null;
  }

  /**
   * Assess recording quality
   */
  private async assessQuality(
    signal: IAudioSignal,
    reference: IAudioSignal | null,
    environment: IAcousticEnvironment
  ): Promise<IAcousticQualityFlags> {
    const warnings: string[] = [];

    // Calculate SNR
    const snr = this.preprocessor!.calculateSnr(signal, reference || undefined);
    const snrAcceptable = snr >= this.config.thresholds.minSnrDb;
    if (!snrAcceptable) {
      warnings.push(`Low SNR: ${snr.toFixed(1)} dB (minimum: ${this.config.thresholds.minSnrDb} dB)`);
    }

    // Check ambient noise
    const ambientNoiseAcceptable =
      environment.ambientNoiseDb <= this.config.thresholds.maxAmbientNoiseDb;
    if (!ambientNoiseAcceptable) {
      warnings.push(
        `High ambient noise: ${environment.ambientNoiseDb} dB (maximum: ${this.config.thresholds.maxAmbientNoiseDb} dB)`
      );
    }

    // Check contact quality
    const contactQualityGood = environment.qualityScore >= 0.7;
    if (!contactQualityGood) {
      warnings.push(`Poor contact quality: ${environment.qualityScore.toFixed(2)}`);
    }

    // Detect motion artifacts
    const motionArtifactsDetected = this.preprocessor!.detectMotionArtifacts(signal);
    if (motionArtifactsDetected) {
      warnings.push('Motion artifacts detected');
    }

    // Calculate overall quality
    const factors = [
      snrAcceptable ? 1 : 0.5,
      ambientNoiseAcceptable ? 1 : 0.7,
      contactQualityGood ? 1 : 0.6,
      motionArtifactsDetected ? 0.7 : 1,
    ];
    const overallQuality =
      factors.reduce((a, b) => a * b, 1) * environment.qualityScore;

    return {
      snrAcceptable,
      contactQualityGood,
      motionArtifactsDetected,
      ambientNoiseAcceptable,
      overallQuality,
      warnings,
    };
  }

  /**
   * Perform spectral analysis on signal
   */
  private async performSpectralAnalysis(
    signal: IAudioSignal
  ): Promise<ITimeFrequencyAnalysis> {
    // Compute mel spectrogram
    const melSpectrogram = await this.spectralBackend!.computeMelSpectrogram(
      signal,
      this.config.spectral
    );

    // Extract frame-wise spectral features
    const spectralFeatures =
      await this.spectralBackend!.extractSpectralFeatures(melSpectrogram);

    // Compute global features
    const globalFeatures =
      this.spectralBackend!.computeGlobalFeatures(spectralFeatures);

    return {
      melSpectrogram,
      spectralFeatures,
      globalFeatures,
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate overall confidence from component confidences
   */
  private calculateOverallConfidence(...confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0 && c <= 1);
    if (validConfidences.length === 0) return 0;

    // Weighted geometric mean (emphasizes low values)
    const product = validConfidences.reduce((acc, c) => acc * c, 1);
    return Math.pow(product, 1 / validConfidences.length);
  }

  /**
   * Aggregate results from multiple zones
   */
  private aggregateResults(
    results: IAcousticAnalysisResult[]
  ): IAggregatedAcousticMetrics {
    if (results.length === 0) {
      throw new AcousticError(
        AcousticErrorCode.INVALID_SIGNAL,
        'No results to aggregate'
      );
    }

    // Calculate weighted averages based on confidence
    let totalWeight = 0;
    let porositySum = 0;
    let hydrationSum = 0;
    let damageSum = 0;

    for (const result of results) {
      const weight = result.overallConfidence;
      totalWeight += weight;
      porositySum += result.porosity.score * weight;
      hydrationSum += result.hydration.score * weight;
      damageSum += result.structure.damageScore * weight;
    }

    // Determine dominant structure class
    const structureCounts = new Map<string, number>();
    for (const result of results) {
      const cls = result.structure.structureClass;
      structureCounts.set(cls, (structureCounts.get(cls) || 0) + 1);
    }
    let dominantStructure = 'healthy';
    let maxCount = 0;
    for (const [cls, count] of structureCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantStructure = cls;
      }
    }

    // Average confidence
    const avgConfidence =
      results.reduce((sum, r) => sum + r.overallConfidence, 0) / results.length;

    return {
      avgPorosity: porositySum / totalWeight,
      avgHydration: hydrationSum / totalWeight,
      avgDamage: damageSum / totalWeight,
      dominantStructure: dominantStructure as
        | 'healthy'
        | 'weathered'
        | 'chemically_damaged'
        | 'mechanically_damaged'
        | 'severely_damaged',
      overallConfidence: avgConfidence,
      zonesAnalyzed: results.length,
    };
  }

  /**
   * Get model versions from backends
   */
  private getModelVersions(): IAcousticAnalysisResult['modelVersions'] {
    const modelInfo = this.featureExtractor?.getModelInfo();
    return {
      featureExtractor: modelInfo?.version || 'unknown',
      porosityHead: 'v1.0.0',
      hydrationHead: 'v1.0.0',
      structureHead: 'v1.0.0',
    };
  }

  /**
   * Classify health score into category
   */
  private classifyHealthScore(
    score: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `acoustic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Multi-zone analysis result
 */
export interface IMultiZoneAcousticResult {
  /** Results by zone */
  zoneResults: Map<ScalpZone, IAcousticAnalysisResult>;
  /** Aggregated metrics */
  aggregated: IAggregatedAcousticMetrics;
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Number of zones analyzed */
  totalZones: number;
}

/**
 * Aggregated metrics from multiple zones
 */
export interface IAggregatedAcousticMetrics {
  /** Weighted average porosity */
  avgPorosity: number;
  /** Weighted average hydration */
  avgHydration: number;
  /** Weighted average damage score */
  avgDamage: number;
  /** Most common structure class */
  dominantStructure:
    | 'healthy'
    | 'weathered'
    | 'chemically_damaged'
    | 'mechanically_damaged'
    | 'severely_damaged';
  /** Average confidence */
  overallConfidence: number;
  /** Number of zones */
  zonesAnalyzed: number;
}

/**
 * Comparison to healthy norms
 */
export interface IAcousticNormComparison {
  /** Standard deviations from healthy porosity */
  porosityDeviation: number;
  /** Standard deviations from healthy hydration */
  hydrationDeviation: number;
  /** Standard deviations from healthy damping */
  dampingDeviation: number;
  /** Overall health score (0-1) */
  healthScore: number;
  /** Health classification */
  classification: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create AcousticAnalyzer with default configuration
 */
export function createAcousticAnalyzer(
  config?: Partial<IAcousticConfig>
): AcousticAnalyzer {
  return new AcousticAnalyzer(config);
}

/**
 * Create AcousticAnalyzer with edge-optimized configuration
 */
export function createEdgeAcousticAnalyzer(): AcousticAnalyzer {
  return new AcousticAnalyzer(EDGE_ACOUSTIC_CONFIG);
}
