/**
 * FolliCore Acoustic-Engine Integration
 *
 * High-level integration layer that connects:
 * - AcousticAnalyzer (Acoustic module)
 * - FolliCoreEngine (POMDP + Thompson Sampling)
 *
 * Provides end-to-end pipeline: Recording → Analysis → Belief Update → Recommendation
 *
 * @module integration
 */

import {
  type AcousticAnalyzer,
  type IAcousticAnalyzerComponents,
  createAcousticAnalyzer,
  createEdgeAcousticAnalyzer,
  type IMultiZoneAcousticResult,
  type IAcousticNormComparison,
} from '../acoustic/AcousticAnalyzer';

import {
  type IAcousticRecording,
  type IAcousticAnalysisResult,
  type IAcousticObservation,
  type IAcousticConfig,
  type IAcousticSimilarCase,
  toAcousticObservation,
} from '../acoustic/AcousticTypes';

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
  type TrichologyAction,
} from '../trichology/domain/TrichologyStates';

import { type ScalpZone } from '../vision/VisionTypes';

/**
 * Configuration for the acoustic-engine integration
 */
export interface IAcousticIntegrationConfig {
  /** Acoustic module config */
  acoustic?: Partial<IAcousticConfig>;
  /** Engine config */
  engine?: Partial<IFolliCoreConfig>;
  /** Auto-update belief after analysis */
  autoUpdateBelief: boolean;
  /** Include norm comparison in results */
  includeNormComparison: boolean;
  /** Use edge-optimized acoustic config */
  useEdgeConfig: boolean;
}

/**
 * Default acoustic integration config
 */
export const DEFAULT_ACOUSTIC_INTEGRATION_CONFIG: IAcousticIntegrationConfig = {
  autoUpdateBelief: true,
  includeNormComparison: true,
  useEdgeConfig: false,
};

/**
 * Complete acoustic pipeline result
 */
export interface IAcousticPipelineResult {
  /** Patient identifier */
  patientId: string;
  /** Acoustic analysis result */
  analysis: IAcousticAnalysisResult;
  /** Converted observation for POMDP */
  observation: IAcousticObservation;
  /** Norm comparison (optional) */
  normComparison?: IAcousticNormComparison;
  /** Updated belief state */
  beliefState?: ITrichologyBeliefState;
  /** Treatment recommendation */
  recommendation?: ITreatmentRecommendation;
  /** Processing metadata */
  metadata: {
    totalProcessingTimeMs: number;
    acousticTimeMs: number;
    engineTimeMs: number;
    analysisTimestamp: Date;
  };
}

/**
 * Multi-zone acoustic pipeline result
 */
export interface IMultiZoneAcousticPipelineResult {
  /** Individual results per zone */
  zoneResults: Map<ScalpZone, IAcousticPipelineResult>;
  /** Multi-zone aggregated analysis */
  multiZoneAnalysis: IMultiZoneAcousticResult;
  /** Aggregated belief state */
  aggregatedBelief?: ITrichologyBeliefState;
  /** Final recommendation based on all zones */
  finalRecommendation?: ITreatmentRecommendation;
  /** Summary statistics */
  summary: {
    zonesAnalyzed: number;
    successfulAnalyses: number;
    averageConfidence: number;
    avgPorosity: number;
    avgHydration: number;
    dominantStructure: string;
  };
}

/**
 * Combined observation from both vision and acoustic
 */
export interface ICombinedObservation {
  /** Vision-based follicle observation */
  vision?: IFollicleObservation;
  /** Acoustic-based observation */
  acoustic?: IAcousticObservation;
  /** Fusion confidence */
  fusionConfidence: number;
  /** Zone */
  zone: ScalpZone;
}

/**
 * AcousticEngineIntegration - Main acoustic integration class
 *
 * Orchestrates the complete acoustic analysis pipeline from
 * recording input to treatment recommendation.
 */
export class AcousticEngineIntegration {
  private config: IAcousticIntegrationConfig;
  private analyzer: AcousticAnalyzer;
  private engine: FolliCoreEngine;
  private initialized = false;

  constructor(config: Partial<IAcousticIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_ACOUSTIC_INTEGRATION_CONFIG, ...config };

    // Create analyzer based on config
    if (this.config.useEdgeConfig) {
      this.analyzer = createEdgeAcousticAnalyzer();
    } else {
      this.analyzer = createAcousticAnalyzer(config.acoustic);
    }

    this.engine = new FolliCoreEngine(config.engine);
  }

  /**
   * Initialize the integration with ML backends
   */
  async initialize(components: IAcousticAnalyzerComponents): Promise<void> {
    await this.analyzer.initialize(components);
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
   * Run complete acoustic pipeline: Recording → Recommendation
   *
   * This is the main entry point for single-recording analysis.
   *
   * @param patientId - Unique patient identifier
   * @param recording - Acoustic recording to analyze
   * @param context - Patient context for personalization
   * @param visionObservation - Optional vision observation for multimodal fusion
   */
  async runPipeline(
    patientId: string,
    recording: IAcousticRecording,
    context: IPatientContext,
    visionObservation?: IFollicleObservation
  ): Promise<IAcousticPipelineResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // Step 1: Acoustic Analysis
    const acousticStart = Date.now();
    const analysis = await this.analyzer.analyze(recording);
    const acousticTime = Date.now() - acousticStart;

    // Step 2: Convert to observation
    const observation = toAcousticObservation(analysis);

    // Step 3: Norm comparison (optional)
    let normComparison: IAcousticNormComparison | undefined;
    if (this.config.includeNormComparison) {
      normComparison = this.analyzer.compareToNorms(analysis);
    }

    // Step 4: Update belief (optional)
    let beliefState: ITrichologyBeliefState | undefined;
    if (this.config.autoUpdateBelief && visionObservation) {
      // If we have vision observation, use multimodal update
      beliefState = this.engine.updateBelief(
        patientId,
        visionObservation,
        observation,
        context
      );
    } else if (this.config.autoUpdateBelief) {
      // Create synthetic vision observation from acoustic
      const syntheticVision = this.createSyntheticVisionObservation(
        observation,
        recording.zone,
        context
      );
      beliefState = this.engine.updateBelief(
        patientId,
        syntheticVision,
        observation,
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
      normComparison,
      beliefState,
      recommendation,
      metadata: {
        totalProcessingTimeMs: totalTime,
        acousticTimeMs: acousticTime,
        engineTimeMs: engineTime,
        analysisTimestamp: new Date(),
      },
    };
  }

  /**
   * Run multi-zone acoustic pipeline
   *
   * Analyzes recordings from multiple scalp zones and aggregates results.
   *
   * @param patientId - Unique patient identifier
   * @param recordings - Array of recordings from different zones
   * @param context - Patient context
   */
  async runMultiZonePipeline(
    patientId: string,
    recordings: IAcousticRecording[],
    context: IPatientContext
  ): Promise<IMultiZoneAcousticPipelineResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    // First, get multi-zone analysis from analyzer
    const multiZoneAnalysis = await this.analyzer.analyzeMultiZone(recordings);

    // Process each zone result
    const zoneResults = new Map<ScalpZone, IAcousticPipelineResult>();
    let totalConfidence = 0;
    let successCount = 0;

    for (const [zone, analysis] of multiZoneAnalysis.zoneResults) {
      const observation = toAcousticObservation(analysis);
      const normComparison = this.config.includeNormComparison
        ? this.analyzer.compareToNorms(analysis)
        : undefined;

      // Create synthetic vision observation for belief update
      const syntheticVision = this.createSyntheticVisionObservation(
        observation,
        zone,
        context
      );

      // Update belief cumulatively
      const beliefState = this.engine.updateBelief(
        patientId,
        syntheticVision,
        observation,
        context
      );

      zoneResults.set(zone, {
        patientId,
        analysis,
        observation,
        normComparison,
        beliefState,
        recommendation: undefined, // Defer to final
        metadata: {
          totalProcessingTimeMs: analysis.processingTimeMs,
          acousticTimeMs: analysis.processingTimeMs,
          engineTimeMs: 0,
          analysisTimestamp: analysis.analyzedAt,
        },
      });

      totalConfidence += analysis.overallConfidence;
      successCount++;
    }

    // Get aggregated belief and final recommendation
    const aggregatedBelief = this.engine.getBeliefState(patientId);
    const finalRecommendation = aggregatedBelief
      ? this.engine.getRecommendation(patientId, context)
      : undefined;

    return {
      zoneResults,
      multiZoneAnalysis,
      aggregatedBelief,
      finalRecommendation,
      summary: {
        zonesAnalyzed: multiZoneAnalysis.totalZones,
        successfulAnalyses: successCount,
        averageConfidence: successCount > 0 ? totalConfidence / successCount : 0,
        avgPorosity: multiZoneAnalysis.aggregated.avgPorosity,
        avgHydration: multiZoneAnalysis.aggregated.avgHydration,
        dominantStructure: multiZoneAnalysis.aggregated.dominantStructure,
      },
    };
  }

  /**
   * Run analysis only (without belief update)
   *
   * Useful for preview or comparison purposes.
   */
  async analyzeOnly(
    recording: IAcousticRecording
  ): Promise<{
    analysis: IAcousticAnalysisResult;
    observation: IAcousticObservation;
    normComparison: IAcousticNormComparison;
  }> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const analysis = await this.analyzer.analyze(recording);
    const observation = toAcousticObservation(analysis);
    const normComparison = this.analyzer.compareToNorms(analysis);

    return {
      analysis,
      observation,
      normComparison,
    };
  }

  /**
   * Update belief with combined vision and acoustic observations
   *
   * This is the key multimodal fusion method.
   */
  updateBeliefMultimodal(
    patientId: string,
    visionObservation: IFollicleObservation,
    acousticObservation: IAcousticObservation,
    context: IPatientContext
  ): ITrichologyBeliefState {
    return this.engine.updateBelief(
      patientId,
      visionObservation,
      acousticObservation,
      context
    );
  }

  /**
   * Update belief with acoustic observation only
   *
   * Creates synthetic vision observation for compatibility.
   */
  updateBeliefAcousticOnly(
    patientId: string,
    acousticObservation: IAcousticObservation,
    zone: ScalpZone,
    context: IPatientContext
  ): ITrichologyBeliefState {
    const syntheticVision = this.createSyntheticVisionObservation(
      acousticObservation,
      zone,
      context
    );
    return this.engine.updateBelief(
      patientId,
      syntheticVision,
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
    action: TrichologyAction,
    outcome: 'positive' | 'neutral' | 'negative'
  ): void {
    this.engine.updateOutcome(patientId, action, outcome);
  }

  /**
   * Get current belief state
   */
  getBeliefState(patientId: string): ITrichologyBeliefState | undefined {
    return this.engine.getBeliefState(patientId);
  }

  /**
   * Find similar cases in acoustic database
   */
  async findSimilarCases(analysis: IAcousticAnalysisResult): Promise<IAcousticSimilarCase[]> {
    return this.analyzer.findSimilar(analysis.embedding);
  }

  /**
   * Add analysis to database for future similarity search
   */
  async addToDatabase(
    analysis: IAcousticAnalysisResult,
    metadata: {
      condition: string;
      porosityLevel: string;
      hydrationLevel: string;
      treatment?: string;
      outcome?: 'positive' | 'neutral' | 'negative';
    }
  ): Promise<void> {
    await this.analyzer.addToDatabase(analysis, metadata);
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
    analyzer: AcousticAnalyzer;
    engine: FolliCoreEngine;
  } {
    return {
      analyzer: this.analyzer,
      engine: this.engine,
    };
  }

  /**
   * Create synthetic vision observation from acoustic data
   *
   * Used when only acoustic data is available but engine expects
   * vision observation for belief updates.
   */
  private createSyntheticVisionObservation(
    acousticObs: IAcousticObservation,
    zone: ScalpZone,
    context: IPatientContext
  ): IFollicleObservation {
    // Map acoustic structure class to follicle metrics
    const structureMapping = {
      healthy: { bulbFactor: 1.0, shaftFactor: 1.0, anagenRatio: 0.85, vellusRatio: 0.1 },
      weathered: { bulbFactor: 0.92, shaftFactor: 0.94, anagenRatio: 0.75, vellusRatio: 0.2 },
      damaged: { bulbFactor: 0.85, shaftFactor: 0.88, anagenRatio: 0.6, vellusRatio: 0.35 },
    };

    const mapping = structureMapping[acousticObs.structureClass];

    // Get age-appropriate norms
    const baseNorms = this.getBaseNorms(zone, context);

    // Adjust based on hydration and porosity
    const hydrationFactor = 0.95 + (acousticObs.hydration * 0.1); // 0.95-1.05
    const porosityFactor = 1.0 - (acousticObs.porosity * 0.1);    // 0.9-1.0

    const adjustedBulbWidth = baseNorms.bulbWidth * mapping.bulbFactor *
      hydrationFactor * porosityFactor;
    const adjustedShaftThickness = baseNorms.shaftThickness * mapping.shaftFactor *
      hydrationFactor * porosityFactor;

    // Map zone type
    const mappedZone = this.mapZone(zone);

    return {
      bulbWidth: adjustedBulbWidth,
      shaftThickness: adjustedShaftThickness,
      density: this.estimateDensityFromAcoustic(acousticObs),
      follicularUnits: Math.round(this.estimateDensityFromAcoustic(acousticObs) / 2.2),
      anagenTelogenRatio: mapping.anagenRatio * (acousticObs.hydration * 0.3 + 0.7),
      vellusTerminalRatio: mapping.vellusRatio * (1 + acousticObs.porosity * 0.5),
      zone: mappedZone,
      confidence: acousticObs.confidence * 0.8, // Reduced confidence for synthetic
    };
  }

  /**
   * Get base norms for zone and context
   */
  private getBaseNorms(
    zone: ScalpZone,
    context: IPatientContext
  ): { bulbWidth: number; shaftThickness: number } {
    // Simplified age mapping
    const ageGroup = context.age <= 35 ? '21-35' :
                     context.age <= 59 ? '36-59' :
                     context.age <= 74 ? '61-74' : '75-86';

    // Map ScalpZone to PGMU zone
    const pgmuZone = ['temporal', 'frontal'].includes(zone) ? 'temporal' : 'parietal';

    const norms: Record<string, Record<string, Record<string, { bulbWidth: number; shaftThickness: number }>>> = {
      male: {
        parietal: {
          '21-35': { bulbWidth: 74.6, shaftThickness: 33.8 },
          '36-59': { bulbWidth: 73.2, shaftThickness: 32.8 },
          '61-74': { bulbWidth: 72.0, shaftThickness: 32.0 },
          '75-86': { bulbWidth: 71.2, shaftThickness: 31.8 },
        },
        temporal: {
          '21-35': { bulbWidth: 72.0, shaftThickness: 32.0 },
          '36-59': { bulbWidth: 68.0, shaftThickness: 30.0 },
          '61-74': { bulbWidth: 65.0, shaftThickness: 28.5 },
          '75-86': { bulbWidth: 64.0, shaftThickness: 28.0 },
        },
      },
      female: {
        parietal: {
          '21-35': { bulbWidth: 70.0, shaftThickness: 30.0 },
          '36-59': { bulbWidth: 68.5, shaftThickness: 29.0 },
          '61-74': { bulbWidth: 67.0, shaftThickness: 28.0 },
          '75-86': { bulbWidth: 66.5, shaftThickness: 27.5 },
        },
        temporal: {
          '21-35': { bulbWidth: 68.0, shaftThickness: 28.5 },
          '36-59': { bulbWidth: 66.0, shaftThickness: 27.5 },
          '61-74': { bulbWidth: 65.0, shaftThickness: 27.0 },
          '75-86': { bulbWidth: 64.5, shaftThickness: 26.5 },
        },
      },
    };

    return norms[context.gender][pgmuZone][ageGroup];
  }

  /**
   * Map ScalpZone to IFollicleObservation zone type
   */
  private mapZone(zone: ScalpZone): 'temporal' | 'parietal' | 'occipital' | 'frontal' {
    const mapping: Record<ScalpZone, 'temporal' | 'parietal' | 'occipital' | 'frontal'> = {
      temporal: 'temporal',
      parietal: 'parietal',
      vertex: 'parietal',
      occipital: 'occipital',
      frontal: 'frontal',
    };
    return mapping[zone] || 'parietal';
  }

  /**
   * Estimate density from acoustic observation
   */
  private estimateDensityFromAcoustic(obs: IAcousticObservation): number {
    // Base density adjusted by structure class
    const baseDensity = {
      healthy: 180,
      weathered: 150,
      damaged: 120,
    };

    const base = baseDensity[obs.structureClass];

    // Adjust by hydration (higher hydration = healthier = more density)
    const hydrationAdjustment = (obs.hydration - 0.5) * 40; // -20 to +20

    // Adjust by porosity (lower porosity = healthier = more density)
    const porosityAdjustment = (0.5 - obs.porosity) * 30; // -15 to +15

    return Math.max(50, Math.min(250, base + hydrationAdjustment + porosityAdjustment));
  }
}

/**
 * Factory function for acoustic integration setup
 */
export function createAcousticEngineIntegration(
  config?: Partial<IAcousticIntegrationConfig>
): AcousticEngineIntegration {
  return new AcousticEngineIntegration(config);
}

/**
 * Factory for edge-optimized acoustic integration
 */
export function createEdgeAcousticIntegration(
  config?: Partial<IAcousticIntegrationConfig>
): AcousticEngineIntegration {
  return new AcousticEngineIntegration({
    ...config,
    useEdgeConfig: true,
  });
}
