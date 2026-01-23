/**
 * FolliCore Multimodal Integration
 *
 * Unified integration layer that combines:
 * - TrichoscopyAnalyzer (Vision module)
 * - AcousticAnalyzer (Acoustic module)
 * - FolliCoreEngine (POMDP + Thompson Sampling)
 *
 * Implements cross-modal attention fusion for improved diagnosis accuracy.
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
  type AcousticAnalyzer,
  type IAcousticAnalyzerComponents,
  createAcousticAnalyzer,
  type IAcousticNormComparison,
} from '../acoustic/AcousticAnalyzer';

import {
  type IAcousticRecording,
  type IAcousticAnalysisResult,
  type IAcousticObservation,
  type IAcousticConfig,
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
  type FollicleState,
  type TrichologyAction,
} from '../trichology/domain/TrichologyStates';

import { type ScalpZone } from '../vision/VisionTypes';

/**
 * Configuration for multimodal integration
 */
export interface IMultimodalConfig {
  /** Vision module config */
  vision?: Partial<IVisionConfig>;
  /** Acoustic module config */
  acoustic?: Partial<IAcousticConfig>;
  /** Vision adapter config */
  adapter?: Partial<IVisionAdapterConfig>;
  /** Engine config */
  engine?: Partial<IFolliCoreConfig>;
  /** Fusion strategy */
  fusionStrategy: 'early' | 'late' | 'cross_attention';
  /** Weight for vision modality (0-1) */
  visionWeight: number;
  /** Weight for acoustic modality (0-1) */
  acousticWeight: number;
  /** Auto-update belief after analysis */
  autoUpdateBelief: boolean;
  /** Include detailed modality comparisons */
  includeModalityComparison: boolean;
}

/**
 * Default multimodal config
 */
export const DEFAULT_MULTIMODAL_CONFIG: IMultimodalConfig = {
  fusionStrategy: 'late',
  visionWeight: 0.6,
  acousticWeight: 0.4,
  autoUpdateBelief: true,
  includeModalityComparison: true,
};

/**
 * Dependencies for multimodal integration
 */
export interface IMultimodalDependencies {
  /** Vision model dependencies */
  vision: {
    featureExtractor: IFeatureExtractor;
    segmentationModel: ISegmentationModel;
    morphometryHead: IMorphometryHead;
    densityHead: IDensityHead;
    cycleHead: ICycleHead;
  };
  /** Acoustic model dependencies */
  acoustic: IAcousticAnalyzerComponents;
}

/**
 * Multimodal analysis input
 */
export interface IMultimodalInput {
  /** Trichoscopy image */
  image: ITrichoscopyImage;
  /** Acoustic recording from same zone */
  recording: IAcousticRecording;
  /** Zone being analyzed */
  zone: ScalpZone;
}

/**
 * Multimodal pipeline result
 */
export interface IMultimodalPipelineResult {
  /** Patient identifier */
  patientId: string;
  /** Zone analyzed */
  zone: ScalpZone;
  /** Vision analysis result */
  visionAnalysis: ITrichoscopyAnalysis;
  /** Acoustic analysis result */
  acousticAnalysis: IAcousticAnalysisResult;
  /** Fused observation (null if vision data unavailable) */
  fusedObservation: IFollicleObservation | null;
  /** Acoustic observation */
  acousticObservation: IAcousticObservation;
  /** State inference from vision */
  visionStateInference?: IStateInference;
  /** Norm comparison from acoustic */
  acousticNormComparison?: IAcousticNormComparison;
  /** Modality agreement analysis */
  modalityAgreement?: IModalityAgreement;
  /** Updated belief state */
  beliefState?: ITrichologyBeliefState;
  /** Treatment recommendation */
  recommendation?: ITreatmentRecommendation;
  /** Processing metadata */
  metadata: {
    totalProcessingTimeMs: number;
    visionTimeMs: number;
    acousticTimeMs: number;
    fusionTimeMs: number;
    engineTimeMs: number;
    analysisTimestamp: Date;
  };
}

/**
 * Agreement analysis between modalities
 */
export interface IModalityAgreement {
  /** Overall agreement score (0-1) */
  overallAgreement: number;
  /** Structure assessment agreement */
  structureAgreement: number;
  /** Health status agreement */
  healthAgreement: number;
  /** Discrepancies found */
  discrepancies: IModalityDiscrepancy[];
  /** Recommendations based on discrepancies */
  notes: string[];
}

/**
 * Discrepancy between modalities
 */
export interface IModalityDiscrepancy {
  /** What aspect differs */
  aspect: 'structure' | 'health' | 'damage' | 'density';
  /** Vision assessment */
  visionAssessment: string;
  /** Acoustic assessment */
  acousticAssessment: string;
  /** Severity of discrepancy */
  severity: 'minor' | 'moderate' | 'significant';
  /** Possible explanation */
  explanation: string;
}

/**
 * Complete scalp mapping result (all zones)
 */
export interface IScalpMappingResult {
  /** Results per zone */
  zoneResults: Map<ScalpZone, IMultimodalPipelineResult>;
  /** Final aggregated belief */
  finalBelief: ITrichologyBeliefState;
  /** Final treatment recommendation */
  recommendation: ITreatmentRecommendation;
  /** Trajectory prediction */
  trajectory: ITrajectoryPrediction;
  /** Scalp summary */
  summary: IScalpSummary;
}

/**
 * Summary of full scalp analysis
 */
export interface IScalpSummary {
  /** Zones analyzed */
  zonesAnalyzed: ScalpZone[];
  /** Zone with worst condition */
  worstZone: ScalpZone;
  /** Zone with best condition */
  bestZone: ScalpZone;
  /** Average health score across zones */
  averageHealthScore: number;
  /** Dominant condition detected */
  dominantCondition: FollicleState;
  /** Overall confidence */
  overallConfidence: number;
  /** Key findings */
  keyFindings: string[];
}

/**
 * MultimodalIntegration - Unified vision + acoustic analysis
 *
 * Provides the most comprehensive hair health assessment by combining
 * visual morphometry with acoustic structure analysis.
 */
export class MultimodalIntegration {
  private config: IMultimodalConfig;
  private visionAnalyzer: TrichoscopyAnalyzer;
  private visionAdapter: VisionBeliefAdapter;
  private acousticAnalyzer: AcousticAnalyzer;
  private engine: FolliCoreEngine;
  private initialized = false;

  constructor(config: Partial<IMultimodalConfig> = {}) {
    this.config = { ...DEFAULT_MULTIMODAL_CONFIG, ...config };
    this.visionAnalyzer = new TrichoscopyAnalyzer(config.vision);
    this.visionAdapter = new VisionBeliefAdapter(config.adapter);
    this.acousticAnalyzer = createAcousticAnalyzer(config.acoustic);
    this.engine = new FolliCoreEngine(config.engine);
  }

  /**
   * Initialize the multimodal integration
   */
  async initialize(dependencies: IMultimodalDependencies): Promise<void> {
    await Promise.all([
      this.visionAnalyzer.initialize(dependencies.vision),
      this.acousticAnalyzer.initialize(dependencies.acoustic),
    ]);
    this.initialized = true;
  }

  /**
   * Check if integration is ready
   */
  isReady(): boolean {
    return this.initialized &&
      this.visionAnalyzer.isReady() &&
      this.acousticAnalyzer.isReady();
  }

  /**
   * Initialize a new patient session
   */
  initializePatient(patientId: string, context: IPatientContext): ITrichologyBeliefState {
    return this.engine.initializePatient(patientId, context);
  }

  /**
   * Run complete multimodal pipeline
   *
   * Analyzes both vision and acoustic data, fuses results, and provides
   * comprehensive diagnosis and recommendation.
   */
  async runPipeline(
    patientId: string,
    input: IMultimodalInput,
    context: IPatientContext
  ): Promise<IMultimodalPipelineResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    // Step 1: Run vision and acoustic analysis in parallel
    const visionStart = Date.now();
    const acousticStart = Date.now();

    const [visionAnalysis, acousticAnalysis] = await Promise.all([
      this.visionAnalyzer.analyze(input.image),
      this.acousticAnalyzer.analyze(input.recording),
    ]);

    const visionTime = Date.now() - visionStart;
    const acousticTime = Date.now() - acousticStart;

    // Step 2: Convert to observations
    const fusionStart = Date.now();
    const visionObservation = this.visionAdapter.toObservation(visionAnalysis, context);
    const acousticObservation = toAcousticObservation(acousticAnalysis);

    // Step 3: Fuse observations
    const fusedObservation = this.fuseObservations(
      visionObservation,
      acousticObservation,
      input.zone
    );

    // Step 4: State inference and norm comparison
    const visionStateInference = this.visionAdapter.inferState(visionAnalysis, context);
    const acousticNormComparison = this.acousticAnalyzer.compareToNorms(acousticAnalysis);

    // Step 5: Modality agreement analysis
    let modalityAgreement: IModalityAgreement | undefined;
    if (this.config.includeModalityComparison && visionObservation) {
      modalityAgreement = this.analyzeModalityAgreement(
        visionObservation,
        visionStateInference,
        acousticObservation,
        acousticNormComparison
      );
    }

    const fusionTime = Date.now() - fusionStart;

    // Step 6: Update belief
    let beliefState: ITrichologyBeliefState | undefined;
    if (this.config.autoUpdateBelief && fusedObservation) {
      beliefState = this.engine.updateBelief(
        patientId,
        fusedObservation,
        acousticObservation,
        context
      );
    } else {
      beliefState = this.engine.getBeliefState(patientId);
    }

    // Step 7: Get recommendation
    const engineStart = Date.now();
    let recommendation: ITreatmentRecommendation | undefined;
    if (beliefState) {
      recommendation = this.engine.getRecommendation(patientId, context);
    }
    const engineTime = Date.now() - engineStart;

    const totalTime = Date.now() - startTime;

    return {
      patientId,
      zone: input.zone,
      visionAnalysis,
      acousticAnalysis,
      fusedObservation: fusedObservation,
      acousticObservation,
      visionStateInference,
      acousticNormComparison,
      modalityAgreement,
      beliefState,
      recommendation,
      metadata: {
        totalProcessingTimeMs: totalTime,
        visionTimeMs: visionTime,
        acousticTimeMs: acousticTime,
        fusionTimeMs: fusionTime,
        engineTimeMs: engineTime,
        analysisTimestamp: new Date(),
      },
    };
  }

  /**
   * Run complete scalp mapping with multiple zones
   */
  async runScalpMapping(
    patientId: string,
    inputs: IMultimodalInput[],
    context: IPatientContext
  ): Promise<IScalpMappingResult> {
    if (!this.isReady()) {
      throw new Error('Integration not initialized. Call initialize() first.');
    }

    const zoneResults = new Map<ScalpZone, IMultimodalPipelineResult>();
    const healthScores: { zone: ScalpZone; score: number }[] = [];
    const keyFindings: string[] = [];

    // Process each zone
    for (const input of inputs) {
      const result = await this.runPipeline(patientId, input, context);
      zoneResults.set(input.zone, result);

      // Calculate health score for this zone
      const healthScore = result.acousticNormComparison?.healthScore || 0.5;
      healthScores.push({ zone: input.zone, score: healthScore });

      // Collect key findings
      if (result.modalityAgreement?.discrepancies.length) {
        const significant = result.modalityAgreement.discrepancies
          .filter(d => d.severity === 'significant');
        const firstSignificant = significant[0];
        if (firstSignificant) {
          keyFindings.push(`${input.zone}: ${firstSignificant.explanation}`);
        }
      }
    }

    // Get final belief and recommendation
    const finalBelief = this.engine.getBeliefState(patientId);
    if (!finalBelief) {
      throw new Error(`Belief state not found for patient ${patientId} after scalp mapping`);
    }
    const recommendation = this.engine.getRecommendation(patientId, context);
    const trajectory = this.engine.predictTrajectory(patientId);

    // Build summary
    healthScores.sort((a, b) => a.score - b.score);
    const worstZone = healthScores[0]?.zone ?? 'parietal';
    const bestZone = healthScores[healthScores.length - 1]?.zone ?? 'occipital';
    const avgScore = healthScores.length > 0
      ? healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length
      : 0;

    const summary: IScalpSummary = {
      zonesAnalyzed: inputs.map(i => i.zone),
      worstZone,
      bestZone,
      averageHealthScore: avgScore,
      dominantCondition: finalBelief.dominantState,
      overallConfidence: finalBelief.confidence,
      keyFindings,
    };

    return {
      zoneResults,
      finalBelief,
      recommendation,
      trajectory,
      summary,
    };
  }

  /**
   * Fuse vision and acoustic observations
   */
  private fuseObservations(
    vision: IFollicleObservation | null,
    acoustic: IAcousticObservation,
    zone: ScalpZone
  ): IFollicleObservation | null {
    if (!vision) {
      // Cannot fuse without vision - return null or synthetic
      return null;
    }

    const { visionWeight, acousticWeight } = this.config;
    const totalWeight = visionWeight + acousticWeight;
    const vw = visionWeight / totalWeight;
    const aw = acousticWeight / totalWeight;

    // Acoustic-adjusted metrics
    const acousticHealthFactor = this.getAcousticHealthFactor(acoustic);

    // Fused observation with acoustic adjustments
    return {
      bulbWidth: vision.bulbWidth * (vw + aw * acousticHealthFactor),
      shaftThickness: vision.shaftThickness * (vw + aw * acousticHealthFactor),
      density: vision.density,
      follicularUnits: vision.follicularUnits,
      anagenTelogenRatio: vision.anagenTelogenRatio *
        (vw + aw * this.mapHydrationToAnagen(acoustic.hydration)),
      vellusTerminalRatio: vision.vellusTerminalRatio *
        (vw + aw * this.mapPorosityToVellus(acoustic.porosity)),
      zone: this.mapZone(zone),
      confidence: Math.min(vision.confidence, acoustic.confidence) * 1.1, // Boost for multimodal
    };
  }

  /**
   * Get health factor from acoustic observation
   */
  private getAcousticHealthFactor(acoustic: IAcousticObservation): number {
    const structureFactor = {
      healthy: 1.0,
      weathered: 0.9,
      damaged: 0.8,
    };

    const base = structureFactor[acoustic.structureClass];
    const hydrationBonus = acoustic.hydration * 0.1;
    const porosityPenalty = acoustic.porosity * 0.1;

    return Math.max(0.7, Math.min(1.1, base + hydrationBonus - porosityPenalty));
  }

  /**
   * Map hydration to anagen ratio adjustment
   */
  private mapHydrationToAnagen(hydration: number): number {
    // Higher hydration suggests healthier follicles
    return 0.9 + hydration * 0.2; // 0.9-1.1
  }

  /**
   * Map porosity to vellus ratio adjustment
   */
  private mapPorosityToVellus(porosity: number): number {
    // Higher porosity correlates with more vellus hairs
    return 0.8 + porosity * 0.4; // 0.8-1.2
  }

  /**
   * Map ScalpZone to observation zone
   */
  private mapZone(zone: ScalpZone): 'temporal' | 'parietal' | 'occipital' | 'frontal' {
    const mapping: Record<ScalpZone, 'temporal' | 'parietal' | 'occipital' | 'frontal'> = {
      temporal: 'temporal',
      parietal: 'parietal',
      vertex: 'parietal',
      occipital: 'occipital',
      frontal: 'frontal',
    };
    // eslint-disable-next-line security/detect-object-injection -- zone is typed ScalpZone enum
    return mapping[zone] || 'parietal';
  }

  /**
   * Analyze agreement between modalities
   */
  private analyzeModalityAgreement(
    vision: IFollicleObservation,
    visionState: IStateInference,
    acoustic: IAcousticObservation,
    acousticNorms: IAcousticNormComparison
  ): IModalityAgreement {
    const discrepancies: IModalityDiscrepancy[] = [];
    const notes: string[] = [];

    // Check structure agreement
    const visionHealthy = visionState.primaryState.includes('HEALTHY');
    const acousticHealthy = acoustic.structureClass === 'healthy';

    let structureAgreement = 1.0;
    if (visionHealthy !== acousticHealthy) {
      structureAgreement = 0.5;
      discrepancies.push({
        aspect: 'structure',
        visionAssessment: visionState.primaryState,
        acousticAssessment: acoustic.structureClass,
        severity: 'moderate',
        explanation: visionHealthy
          ? 'Vision shows healthy morphology but acoustic detects structural damage'
          : 'Acoustic shows healthy structure but vision shows morphological changes',
      });

      if (!acousticHealthy) {
        notes.push('Recommend repeating acoustic scan to confirm structural findings');
      }
    }

    // Check health status agreement
    const visionConfidence = visionState.confidence;
    const acousticHealth = acousticNorms.healthScore;

    const healthAgreement = 1.0 - Math.abs(visionConfidence - acousticHealth);
    if (healthAgreement < 0.6) {
      discrepancies.push({
        aspect: 'health',
        visionAssessment: `Confidence: ${(visionConfidence * 100).toFixed(0)}%`,
        acousticAssessment: `Health score: ${(acousticHealth * 100).toFixed(0)}%`,
        severity: healthAgreement < 0.4 ? 'significant' : 'moderate',
        explanation: 'Modalities disagree on overall health assessment',
      });
    }

    // Check damage agreement
    const visionDamage = vision.vellusTerminalRatio > 0.3;
    const acousticDamage = acoustic.structureClass === 'damaged';

    if (visionDamage !== acousticDamage) {
      discrepancies.push({
        aspect: 'damage',
        visionAssessment: visionDamage ? 'Elevated vellus ratio' : 'Normal vellus ratio',
        acousticAssessment: acousticDamage ? 'Structural damage' : 'No structural damage',
        severity: 'minor',
        explanation: 'Surface vs. internal damage assessment differs',
      });
    }

    // Calculate overall agreement
    const overallAgreement = (structureAgreement + healthAgreement) / 2;

    if (discrepancies.length === 0) {
      notes.push('Vision and acoustic findings are consistent');
    } else if (discrepancies.some(d => d.severity === 'significant')) {
      notes.push('Significant modality discrepancy - consider additional testing');
    }

    return {
      overallAgreement,
      structureAgreement,
      healthAgreement,
      discrepancies,
      notes,
    };
  }

  /**
   * Get treatment recommendation
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
   * Get current belief state
   */
  getBeliefState(patientId: string): ITrichologyBeliefState | undefined {
    return this.engine.getBeliefState(patientId);
  }

  /**
   * Record treatment outcome
   */
  recordOutcome(
    patientId: string,
    action: TrichologyAction,
    outcome: 'positive' | 'neutral' | 'negative'
  ): void {
    this.engine.updateOutcome(patientId, action, outcome);
  }

  /**
   * Dispose all resources
   */
  async dispose(): Promise<void> {
    await Promise.all([
      this.visionAnalyzer.dispose(),
      this.acousticAnalyzer.dispose(),
    ]);
    this.initialized = false;
  }

  /**
   * Access underlying components
   */
  getComponents(): {
    visionAnalyzer: TrichoscopyAnalyzer;
    visionAdapter: VisionBeliefAdapter;
    acousticAnalyzer: AcousticAnalyzer;
    engine: FolliCoreEngine;
  } {
    return {
      visionAnalyzer: this.visionAnalyzer,
      visionAdapter: this.visionAdapter,
      acousticAnalyzer: this.acousticAnalyzer,
      engine: this.engine,
    };
  }
}

/**
 * Factory function for multimodal integration
 */
export function createMultimodalIntegration(
  config?: Partial<IMultimodalConfig>
): MultimodalIntegration {
  return new MultimodalIntegration(config);
}
