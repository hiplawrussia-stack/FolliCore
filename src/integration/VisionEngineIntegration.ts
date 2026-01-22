/**
 * FolliCore Vision-Engine Integration
 *
 * High-level integration layer that connects:
 * - TrichoscopyAnalyzer (Vision module)
 * - VisionBeliefAdapter (Vision → POMDP bridge)
 * - FolliCoreEngine (POMDP + Thompson Sampling)
 *
 * Provides end-to-end pipeline: Image → Analysis → Belief Update → Recommendation
 *
 * @module integration
 */

import {
  TrichoscopyAnalyzer,
  VisionBeliefAdapter,
  type ITrichoscopyAnalysis,
  type ITrichoscopyImage,
  type IVisionAdapterConfig,
  type IStateInference,
  type IFeatureExtractor,
  type ISegmentationModel,
  type IMorphometryHead,
  type IDensityHead,
  type ICycleHead,
  type IVisionConfig,
} from '../vision';

import {
  FolliCoreEngine,
  type IFolliCoreConfig,
  type ITreatmentRecommendation,
  type ITrajectoryPrediction,
} from '../trichology/FolliCoreEngine';

import {
  type IPatientContext,
  type IFollicleObservation,
  type ITrichologyBeliefState,
  type IAcousticObservation,
} from '../trichology/domain/TrichologyStates';

/**
 * Configuration for the integrated pipeline
 */
export interface IIntegrationConfig {
  /** Vision module config */
  vision?: Partial<IVisionConfig>;
  /** Vision-to-POMDP adapter config */
  adapter?: Partial<IVisionAdapterConfig>;
  /** Engine config */
  engine?: Partial<IFolliCoreConfig>;
  /** Auto-update belief after analysis */
  autoUpdateBelief: boolean;
  /** Include state inference in results */
  includeStateInference: boolean;
}

/**
 * Default integration config
 */
export const DEFAULT_INTEGRATION_CONFIG: IIntegrationConfig = {
  autoUpdateBelief: true,
  includeStateInference: true,
};

/**
 * Complete pipeline result
 */
export interface IPipelineResult {
  /** Patient identifier */
  patientId: string;
  /** Vision analysis result */
  analysis: ITrichoscopyAnalysis;
  /** Converted observation */
  observation: IFollicleObservation | null;
  /** State inference (optional) */
  stateInference?: IStateInference;
  /** Updated belief state */
  beliefState?: ITrichologyBeliefState;
  /** Treatment recommendation */
  recommendation?: ITreatmentRecommendation;
  /** Processing metadata */
  metadata: {
    totalProcessingTimeMs: number;
    visionTimeMs: number;
    engineTimeMs: number;
    analysisTimestamp: Date;
  };
}

/**
 * Batch pipeline result
 */
export interface IBatchPipelineResult {
  /** Individual results per image */
  results: IPipelineResult[];
  /** Aggregated belief state */
  aggregatedBelief?: ITrichologyBeliefState;
  /** Final recommendation based on all images */
  finalRecommendation?: ITreatmentRecommendation;
  /** Summary statistics */
  summary: {
    imagesProcessed: number;
    successfulAnalyses: number;
    averageConfidence: number;
    zonesAnalyzed: string[];
  };
}

/**
 * Dependencies for the integration layer
 */
export interface IIntegrationDependencies {
  featureExtractor: IFeatureExtractor;
  segmentationModel: ISegmentationModel;
  morphometryHead: IMorphometryHead;
  densityHead: IDensityHead;
  cycleHead: ICycleHead;
}

/**
 * VisionEngineIntegration - Main integration class
 *
 * Orchestrates the complete trichology analysis pipeline from
 * image input to treatment recommendation.
 */
export class VisionEngineIntegration {
  private config: IIntegrationConfig;
  private analyzer: TrichoscopyAnalyzer;
  private adapter: VisionBeliefAdapter;
  private engine: FolliCoreEngine;
  private initialized = false;

  constructor(config: Partial<IIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
    this.analyzer = new TrichoscopyAnalyzer(config.vision);
    this.adapter = new VisionBeliefAdapter(config.adapter);
    this.engine = new FolliCoreEngine(config.engine);
  }

  /**
   * Initialize the integration with ML backends
   */
  async initialize(dependencies: IIntegrationDependencies): Promise<void> {
    await this.analyzer.initialize(dependencies);
    this.initialized = true;
  }

  /**
   * Check if integration is ready
   */
  isReady(): boolean {
    return this.initialized && this.analyzer.isReady();
  }

  /**
   * Initialize a new patient session
   */
  initializePatient(patientId: string, context: IPatientContext): ITrichologyBeliefState {
    return this.engine.initializePatient(patientId, context);
  }

  /**
   * Run complete pipeline: Image → Recommendation
   *
   * This is the main entry point for single-image analysis.
   *
   * @param patientId - Unique patient identifier
   * @param image - Trichoscopy image to analyze
   * @param context - Patient context for personalization
   * @param acousticObservation - Optional acoustic scan data
   */
  async runPipeline(
    patientId: string,
    image: ITrichoscopyImage,
    context: IPatientContext,
    acousticObservation?: IAcousticObservation
  ): Promise<IPipelineResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // Step 1: Vision Analysis
    const visionStart = Date.now();
    const analysis = await this.analyzer.analyze(image);
    const visionTime = Date.now() - visionStart;

    // Step 2: Convert to observation
    const observation = this.adapter.toObservation(analysis, context);

    // Step 3: State inference (optional)
    let stateInference: IStateInference | undefined;
    if (this.config.includeStateInference) {
      stateInference = this.adapter.inferState(analysis, context);
    }

    // Step 4: Update belief (optional)
    let beliefState: ITrichologyBeliefState | undefined;
    if (this.config.autoUpdateBelief && observation) {
      beliefState = this.engine.updateBelief(
        patientId,
        observation,
        acousticObservation,
        context
      );
    } else {
      beliefState = this.engine.getBeliefState(patientId);
    }

    // Step 5: Get recommendation
    const engineStart = Date.now();
    let recommendation: ITreatmentRecommendation | undefined;
    if (beliefState) {
      recommendation = this.engine.getRecommendation(patientId, context);
    }
    const engineTime = Date.now() - engineStart;

    const totalTime = Date.now() - startTime;

    return {
      patientId,
      analysis,
      observation,
      stateInference,
      beliefState,
      recommendation,
      metadata: {
        totalProcessingTimeMs: totalTime,
        visionTimeMs: visionTime,
        engineTimeMs: engineTime,
        analysisTimestamp: new Date(),
      },
    };
  }

  /**
   * Run batch pipeline for multiple images
   *
   * Useful for comprehensive scalp mapping with images from multiple zones.
   *
   * @param patientId - Unique patient identifier
   * @param images - Array of trichoscopy images
   * @param context - Patient context
   */
  async runBatchPipeline(
    patientId: string,
    images: ITrichoscopyImage[],
    context: IPatientContext
  ): Promise<IBatchPipelineResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const results: IPipelineResult[] = [];
    const zonesAnalyzed = new Set<string>();
    let totalConfidence = 0;

    // Process each image sequentially (belief updates are cumulative)
    for (const image of images) {
      try {
        const result = await this.runPipeline(patientId, image, context);
        results.push(result);
        zonesAnalyzed.add(image.zone);
        totalConfidence += result.analysis.overallConfidence;
      } catch (error) {
        // Continue with remaining images
        console.warn(`Failed to process image for zone ${image.zone}:`, error);
      }
    }

    // Get aggregated state and final recommendation
    const aggregatedBelief = this.engine.getBeliefState(patientId);
    const finalRecommendation = aggregatedBelief
      ? this.engine.getRecommendation(patientId, context)
      : undefined;

    return {
      results,
      aggregatedBelief,
      finalRecommendation,
      summary: {
        imagesProcessed: images.length,
        successfulAnalyses: results.length,
        averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
        zonesAnalyzed: Array.from(zonesAnalyzed),
      },
    };
  }

  /**
   * Run analysis only (without belief update)
   *
   * Useful for preview or comparison purposes.
   */
  async analyzeOnly(
    image: ITrichoscopyImage,
    context: IPatientContext
  ): Promise<{
    analysis: ITrichoscopyAnalysis;
    observation: IFollicleObservation | null;
    stateInference: IStateInference;
    ageDelta: number;
    progressionRisk: number;
    recoveryPotential: number;
  }> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const analysis = await this.analyzer.analyze(image);
    const observation = this.adapter.toObservation(analysis, context);
    const stateInference = this.adapter.inferState(analysis, context);
    const ageDelta = this.adapter.calculateAgeDelta(analysis, context);
    const progressionRisk = this.adapter.calculateProgressionRisk(analysis, context);
    const recoveryPotential = this.adapter.calculateRecoveryPotential(analysis, context);

    return {
      analysis,
      observation,
      stateInference,
      ageDelta,
      progressionRisk,
      recoveryPotential,
    };
  }

  /**
   * Manual belief update with pre-computed observation
   *
   * Useful when observation comes from external source.
   */
  updateBeliefManual(
    patientId: string,
    observation: IFollicleObservation,
    context: IPatientContext,
    acousticObservation?: IAcousticObservation
  ): ITrichologyBeliefState {
    return this.engine.updateBelief(
      patientId,
      observation,
      acousticObservation,
      context
    );
  }

  /**
   * Get treatment recommendation for existing belief state
   */
  getRecommendation(patientId: string, context: IPatientContext): ITreatmentRecommendation {
    return this.engine.getRecommendation(patientId, context);
  }

  /**
   * Get trajectory prediction
   */
  predictTrajectory(patientId: string, horizonMonths?: number): ITrajectoryPrediction {
    return this.engine.predictTrajectory(patientId, horizonMonths);
  }

  /**
   * Record treatment outcome for learning
   */
  recordOutcome(
    patientId: string,
    action: string,
    outcome: 'positive' | 'neutral' | 'negative'
  ): void {
    this.engine.updateOutcome(patientId, action as any, outcome);
  }

  /**
   * Get current belief state
   */
  getBeliefState(patientId: string): ITrichologyBeliefState | undefined {
    return this.engine.getBeliefState(patientId);
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    await this.analyzer.dispose();
    this.initialized = false;
  }

  /**
   * Access underlying components (for advanced use)
   */
  getComponents(): {
    analyzer: TrichoscopyAnalyzer;
    adapter: VisionBeliefAdapter;
    engine: FolliCoreEngine;
  } {
    return {
      analyzer: this.analyzer,
      adapter: this.adapter,
      engine: this.engine,
    };
  }
}

/**
 * Factory function for quick integration setup
 */
export function createVisionEngineIntegration(
  config?: Partial<IIntegrationConfig>
): VisionEngineIntegration {
  return new VisionEngineIntegration(config);
}

/**
 * Factory with mock backends for testing
 */
export function createMockIntegration(
  config?: Partial<IIntegrationConfig>
): VisionEngineIntegration {
  const integration = new VisionEngineIntegration(config);
  // Initialize will need to be called with mock dependencies
  return integration;
}
