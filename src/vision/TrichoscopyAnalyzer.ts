/**
 * FolliCore Vision Module - TrichoscopyAnalyzer
 *
 * Main orchestrator for trichoscopy image analysis.
 * Architecture: DINOv2 (foundation) + Task-specific heads
 *
 * @see research/VISION_MODULE_ADVANCED_RESEARCH.md
 */

import {
  ITrichoscopyImage,
  ITrichoscopyAnalysis,
  IImageEmbedding,
  IMorphometryResult,
  IDensityResult,
  ICycleAnalysis,
  ISegmentationResult,
  IAttentionMap,
  ISimilarCase,
  IVisionConfig,
  DEFAULT_VISION_CONFIG,
  VisionError,
  VisionErrorCode,
  ScalpZone,
} from './VisionTypes';

/**
 * Feature extractor interface (DINOv2)
 * Abstracts the actual ML backend (Python/ONNX/TensorRT)
 */
export interface IFeatureExtractor {
  /** Extract features from image */
  extract(image: ITrichoscopyImage): Promise<IImageEmbedding>;
  /** Check if model is loaded */
  isLoaded(): boolean;
  /** Load model */
  load(): Promise<void>;
  /** Unload model */
  unload(): Promise<void>;
}

/**
 * Segmentation model interface (SAM/MedSAM)
 */
export interface ISegmentationModel {
  /** Segment image */
  segment(image: ITrichoscopyImage, embedding?: IImageEmbedding): Promise<ISegmentationResult>;
  /** Interactive segmentation with point prompt */
  segmentWithPoints(
    image: ITrichoscopyImage,
    points: Array<{ x: number; y: number; label: 'foreground' | 'background' }>
  ): Promise<ISegmentationResult>;
  isLoaded(): boolean;
  load(): Promise<void>;
  unload(): Promise<void>;
}

/**
 * Morphometry head interface
 */
export interface IMorphometryHead {
  /** Extract morphometric measurements from embedding + segmentation */
  extract(
    embedding: IImageEmbedding,
    segmentation: ISegmentationResult,
    calibration: { pixelsPerMicrometer: number }
  ): Promise<IMorphometryResult>;
  isLoaded(): boolean;
  load(): Promise<void>;
}

/**
 * Density analysis head interface
 */
export interface IDensityHead {
  /** Analyze hair density from segmentation */
  analyze(
    segmentation: ISegmentationResult,
    calibration: { pixelsPerMicrometer: number }
  ): Promise<IDensityResult>;
}

/**
 * Cycle classification head interface
 */
export interface ICycleHead {
  /** Classify hair cycle phases */
  classify(
    embedding: IImageEmbedding,
    segmentation: ISegmentationResult
  ): Promise<ICycleAnalysis>;
  isLoaded(): boolean;
  load(): Promise<void>;
}

/**
 * Vector database interface for similarity search
 */
export interface IVectorDatabase {
  /** Search for similar cases */
  search(embedding: IImageEmbedding, topK: number, minSimilarity: number): Promise<ISimilarCase[]>;
  /** Add case to database */
  addCase(caseId: string, embedding: IImageEmbedding, metadata: Record<string, unknown>): Promise<void>;
  /** Check connection */
  isConnected(): boolean;
}

/**
 * Explainability module interface
 */
export interface IExplainabilityModule {
  /** Generate attention heatmap */
  generateHeatmap(
    image: ITrichoscopyImage,
    embedding: IImageEmbedding,
    method: 'grad-cam' | 'vit-cx' | 'attention-rollout'
  ): Promise<IAttentionMap>;
}

/**
 * TrichoscopyAnalyzer - Main analysis orchestrator
 *
 * Coordinates all vision components to produce comprehensive analysis
 * that can be fed into FolliCoreEngine's POMDP.
 */
export class TrichoscopyAnalyzer {
  private config: IVisionConfig;
  private featureExtractor: IFeatureExtractor | null = null;
  private segmentationModel: ISegmentationModel | null = null;
  private morphometryHead: IMorphometryHead | null = null;
  private densityHead: IDensityHead | null = null;
  private cycleHead: ICycleHead | null = null;
  private vectorDb: IVectorDatabase | null = null;
  private explainability: IExplainabilityModule | null = null;
  private isInitialized = false;

  constructor(config: Partial<IVisionConfig> = {}) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  /**
   * Initialize analyzer with ML backends
   */
  async initialize(components: {
    featureExtractor: IFeatureExtractor;
    segmentationModel: ISegmentationModel;
    morphometryHead: IMorphometryHead;
    densityHead: IDensityHead;
    cycleHead: ICycleHead;
    vectorDb?: IVectorDatabase;
    explainability?: IExplainabilityModule;
  }): Promise<void> {
    this.featureExtractor = components.featureExtractor;
    this.segmentationModel = components.segmentationModel;
    this.morphometryHead = components.morphometryHead;
    this.densityHead = components.densityHead;
    this.cycleHead = components.cycleHead;
    this.vectorDb = components.vectorDb || null;
    this.explainability = components.explainability || null;

    // Load all models
    await Promise.all([
      this.featureExtractor.load(),
      this.segmentationModel.load(),
      this.morphometryHead.load(),
      this.cycleHead.load(),
    ]);

    this.isInitialized = true;
  }

  /**
   * Analyze a trichoscopy image
   *
   * @param image - Trichoscopy image to analyze
   * @returns Complete analysis result
   */
  async analyze(image: ITrichoscopyImage): Promise<ITrichoscopyAnalysis> {
    if (!this.isInitialized) {
      throw new VisionError(
        VisionErrorCode.MODEL_NOT_LOADED,
        'Analyzer not initialized. Call initialize() first.'
      );
    }

    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();

    // Validate image
    this.validateImage(image);

    // Step 1: Extract features (DINOv2)
    const embedding = await this.featureExtractor!.extract(image);

    // Step 2: Segment image (SAM/MedSAM)
    const segmentation = await this.segmentationModel!.segment(image, embedding);

    // Step 3: Extract morphometry
    const morphometry = await this.morphometryHead!.extract(
      embedding,
      segmentation,
      this.config.morphometry.calibration
    );

    // Step 4: Analyze density
    const density = await this.densityHead!.analyze(
      segmentation,
      this.config.morphometry.calibration
    );

    // Step 5: Classify hair cycle phases
    const cycleAnalysis = await this.cycleHead!.classify(embedding, segmentation);

    // Step 6: Optional - Find similar cases
    let similarCases: ISimilarCase[] | undefined;
    if (this.config.similaritySearch.enabled && this.vectorDb?.isConnected()) {
      similarCases = await this.vectorDb.search(
        embedding,
        this.config.similaritySearch.topK,
        this.config.similaritySearch.minSimilarity
      );
    }

    // Step 7: Optional - Generate attention map
    let attentionMap: IAttentionMap | undefined;
    if (this.config.explainability.enabled && this.explainability) {
      attentionMap = await this.explainability.generateHeatmap(
        image,
        embedding,
        this.config.explainability.method
      );
    }

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      morphometry.confidence,
      density.confidence,
      cycleAnalysis.confidence,
      segmentation.confidence
    );

    const processingTimeMs = Date.now() - startTime;

    return {
      analysisId,
      imageId: this.generateImageId(image),
      zone: image.zone,
      analyzedAt: new Date(),
      embedding,
      morphometry,
      density,
      cycleAnalysis,
      segmentation,
      attentionMap,
      similarCases,
      overallConfidence,
      processingTimeMs,
      modelVersions: {
        featureExtractor: this.config.featureExtractor.model,
        morphometryHead: 'v1.0.0',
        segmentationModel: this.config.segmentation.model,
      },
    };
  }

  /**
   * Batch analyze multiple images
   */
  async analyzeBatch(images: ITrichoscopyImage[]): Promise<ITrichoscopyAnalysis[]> {
    const results: ITrichoscopyAnalysis[] = [];

    // Process in batches for memory efficiency
    const batchSize = this.config.performance.batchSize;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(img => this.analyze(img))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Interactive segmentation with user-provided points
   */
  async interactiveSegment(
    image: ITrichoscopyImage,
    points: Array<{ x: number; y: number; label: 'foreground' | 'background' }>
  ): Promise<ISegmentationResult> {
    if (!this.segmentationModel) {
      throw new VisionError(
        VisionErrorCode.MODEL_NOT_LOADED,
        'Segmentation model not loaded'
      );
    }
    return this.segmentationModel.segmentWithPoints(image, points);
  }

  /**
   * Add analyzed case to vector database for future similarity search
   */
  async addToDatabase(
    analysis: ITrichoscopyAnalysis,
    metadata: {
      diagnosis: string;
      treatment?: string;
      outcome?: 'positive' | 'neutral' | 'negative';
    }
  ): Promise<void> {
    if (!this.vectorDb) {
      throw new VisionError(
        VisionErrorCode.VECTOR_DB_ERROR,
        'Vector database not configured'
      );
    }
    await this.vectorDb.addCase(analysis.analysisId, analysis.embedding, metadata);
  }

  /**
   * Get current configuration
   */
  getConfig(): IVisionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<IVisionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if analyzer is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.featureExtractor) await this.featureExtractor.unload();
    if (this.segmentationModel) await this.segmentationModel.unload();
    this.isInitialized = false;
  }

  // Private helper methods

  private validateImage(image: ITrichoscopyImage): void {
    if (!image.data) {
      throw new VisionError(
        VisionErrorCode.IMAGE_LOAD_FAILED,
        'Image data is empty'
      );
    }

    if (!['png', 'jpeg', 'tiff'].includes(image.format)) {
      throw new VisionError(
        VisionErrorCode.INVALID_IMAGE_FORMAT,
        `Unsupported image format: ${image.format}`
      );
    }

    if (image.width < 224 || image.height < 224) {
      throw new VisionError(
        VisionErrorCode.INVALID_IMAGE_FORMAT,
        `Image too small. Minimum 224x224, got ${image.width}x${image.height}`
      );
    }
  }

  private calculateOverallConfidence(...confidences: number[]): number {
    // Weighted geometric mean
    const validConfidences = confidences.filter(c => c > 0);
    if (validConfidences.length === 0) return 0;

    const product = validConfidences.reduce((acc, c) => acc * c, 1);
    return Math.pow(product, 1 / validConfidences.length);
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateImageId(image: ITrichoscopyImage): string {
    const hash = this.simpleHash(
      `${image.zone}_${image.capturedAt.getTime()}_${image.width}x${image.height}`
    );
    return `img_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Factory function for creating analyzer with mock backends (for testing)
 */
export function createMockAnalyzer(config?: Partial<IVisionConfig>): TrichoscopyAnalyzer {
  return new TrichoscopyAnalyzer(config);
}
