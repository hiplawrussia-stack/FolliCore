/**
 * FolliCore Vision Module - VisionBeliefAdapter
 *
 * Bridges Vision module output to FolliCoreEngine's POMDP input.
 * Converts ITrichoscopyAnalysis → IFollicleObservation.
 *
 * This is the critical integration point between CV and decision engine.
 */

import { ITrichoscopyAnalysis, ISimilarCase } from './VisionTypes';
import {
  IFollicleObservation,
  IPatientContext,
  FollicleState,
  PGMU_NORMS,
  getAgeGroup,
} from '../trichology/domain/TrichologyStates';

/**
 * Adapter configuration
 */
export interface IVisionAdapterConfig {
  /** Minimum confidence to produce observation */
  minConfidence: number;
  /** Weight for similar cases in state inference */
  similarCaseWeight: number;
  /** Enable PGMU normalization */
  normalizeByPGMU: boolean;
}

/**
 * Default adapter configuration
 */
export const DEFAULT_ADAPTER_CONFIG: IVisionAdapterConfig = {
  minConfidence: 0.5,
  similarCaseWeight: 0.3,
  normalizeByPGMU: true,
};

/**
 * State inference result from vision analysis
 */
export interface IStateInference {
  /** Most likely state */
  primaryState: FollicleState;
  /** Probability distribution over states */
  stateDistribution: Map<FollicleState, number>;
  /** Inference confidence */
  confidence: number;
  /** Contributing factors */
  factors: string[];
}

/**
 * VisionBeliefAdapter - Vision to POMDP bridge
 *
 * Converts rich vision analysis into the observation format
 * expected by FolliCoreEngine for belief state updates.
 */
export class VisionBeliefAdapter {
  private config: IVisionAdapterConfig;

  constructor(config: Partial<IVisionAdapterConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTER_CONFIG, ...config };
  }

  /**
   * Convert vision analysis to follicle observation
   *
   * This is the main integration method called after image analysis.
   *
   * @param analysis - Complete trichoscopy analysis from Vision module
   * @param context - Patient context for normalization
   * @returns Observation ready for FolliCoreEngine.updateBelief()
   */
  toObservation(
    analysis: ITrichoscopyAnalysis,
    context: IPatientContext
  ): IFollicleObservation | null {
    // Check minimum confidence
    if (analysis.overallConfidence < this.config.minConfidence) {
      return null;
    }

    // Extract and normalize morphometry
    let bulbWidth = analysis.morphometry.bulbWidth;
    let shaftThickness = analysis.morphometry.shaftThickness;

    // Optionally normalize against PGMU age/gender norms
    if (this.config.normalizeByPGMU) {
      const normalized = this.normalizeToPGMU(
        bulbWidth,
        shaftThickness,
        analysis.zone as 'temporal' | 'parietal',
        context
      );
      bulbWidth = normalized.bulbWidth;
      shaftThickness = normalized.shaftThickness;
    }

    // Map zone to valid observation zone type
    const zone = this.mapZone(analysis.zone);

    // Calculate combined confidence
    const confidence = this.calculateCombinedConfidence(analysis);

    return {
      bulbWidth,
      shaftThickness,
      density: analysis.density.density,
      follicularUnits: analysis.density.follicularUnits,
      anagenTelogenRatio: analysis.cycleAnalysis.anagenTelogenRatio,
      vellusTerminalRatio: analysis.cycleAnalysis.vellusTerminalRatio,
      zone,
      confidence,
    };
  }

  /**
   * Infer likely follicle state from vision analysis
   *
   * This provides an initial state estimate that can inform
   * the POMDP's belief initialization or provide explanatory context.
   *
   * @param analysis - Complete trichoscopy analysis
   * @param context - Patient context
   * @returns State inference with distribution and explanation
   */
  inferState(
    analysis: ITrichoscopyAnalysis,
    context: IPatientContext
  ): IStateInference {
    const factors: string[] = [];
    const stateScores = new Map<FollicleState, number>();

    // Initialize all states with small probability
    Object.values(FollicleState).forEach(state => {
      stateScores.set(state as FollicleState, 0.01);
    });

    // Factor 1: Vellus/Terminal ratio (miniaturization indicator)
    const vtRatio = analysis.cycleAnalysis.vellusTerminalRatio;
    if (vtRatio < 0.15) {
      this.addScore(stateScores, FollicleState.HEALTHY_ANAGEN, 0.3);
      factors.push('Low V/T ratio indicates healthy terminal hairs');
    } else if (vtRatio < 0.3) {
      this.addScore(stateScores, FollicleState.EARLY_MINIATURIZATION, 0.25);
      factors.push('Elevated V/T ratio suggests early miniaturization');
    } else if (vtRatio < 0.5) {
      this.addScore(stateScores, FollicleState.ADVANCED_MINIATURIZATION, 0.3);
      factors.push('High V/T ratio indicates advanced miniaturization');
    } else {
      this.addScore(stateScores, FollicleState.TERMINAL, 0.25);
      factors.push('Very high V/T ratio suggests terminal state');
    }

    // Factor 2: Anagen/Telogen ratio (shedding indicator)
    const atRatio = analysis.cycleAnalysis.anagenTelogenRatio;
    if (atRatio > 0.8) {
      this.addScore(stateScores, FollicleState.HEALTHY_ANAGEN, 0.2);
      factors.push('Good anagen ratio indicates healthy growth');
    } else if (atRatio > 0.6) {
      this.addScore(stateScores, FollicleState.HEALTHY_CATAGEN, 0.15);
      this.addScore(stateScores, FollicleState.HEALTHY_TELOGEN, 0.15);
    } else if (atRatio > 0.4) {
      this.addScore(stateScores, FollicleState.STRESS_INDUCED, 0.25);
      factors.push('Reduced anagen ratio suggests telogen effluvium');
    } else {
      this.addScore(stateScores, FollicleState.STRESS_INDUCED, 0.35);
      factors.push('Low anagen ratio indicates significant shedding');
    }

    // Factor 3: Bulb width vs age-expected (aging indicator)
    const ageGroup = getAgeGroup(context.age);
    const expectedNorms = PGMU_NORMS[context.gender]?.parietal?.[ageGroup];

    if (expectedNorms) {
      const bulbDelta = analysis.morphometry.bulbWidth - expectedNorms.bulbWidth;

      if (bulbDelta > 2) {
        this.addScore(stateScores, FollicleState.HEALTHY_ANAGEN, 0.15);
        factors.push('Bulb width above age norm');
      } else if (bulbDelta > -2) {
        // Within normal range
        this.addScore(stateScores, FollicleState.HEALTHY_ANAGEN, 0.1);
      } else if (bulbDelta > -5) {
        this.addScore(stateScores, FollicleState.EARLY_MINIATURIZATION, 0.15);
        factors.push('Bulb width slightly below age norm');
      } else {
        this.addScore(stateScores, FollicleState.SENILE_ALOPECIA, 0.2);
        factors.push('Bulb width significantly below age norm');
      }
    }

    // Factor 4: Density
    if (analysis.density.density > 200) {
      this.addScore(stateScores, FollicleState.HEALTHY_ANAGEN, 0.1);
    } else if (analysis.density.density > 150) {
      // Normal range
    } else if (analysis.density.density > 100) {
      this.addScore(stateScores, FollicleState.EARLY_MINIATURIZATION, 0.1);
      factors.push('Reduced hair density');
    } else {
      this.addScore(stateScores, FollicleState.ADVANCED_MINIATURIZATION, 0.15);
      factors.push('Low hair density');
    }

    // Factor 5: Similar cases (if available)
    if (analysis.similarCases && analysis.similarCases.length > 0) {
      this.incorporateSimilarCases(stateScores, analysis.similarCases, factors);
    }

    // Normalize to probability distribution
    const stateDistribution = this.normalizeScores(stateScores);

    // Find primary state
    let primaryState = FollicleState.HEALTHY_ANAGEN;
    let maxProb = 0;
    stateDistribution.forEach((prob, state) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryState = state;
      }
    });

    return {
      primaryState,
      stateDistribution,
      confidence: maxProb * analysis.overallConfidence,
      factors,
    };
  }

  /**
   * Batch convert multiple analyses
   */
  toObservations(
    analyses: ITrichoscopyAnalysis[],
    context: IPatientContext
  ): IFollicleObservation[] {
    return analyses
      .map(a => this.toObservation(a, context))
      .filter((o): o is IFollicleObservation => o !== null);
  }

  /**
   * Calculate biological age delta from vision analysis
   *
   * Positive delta = accelerated aging
   * Negative delta = youthful follicles
   */
  calculateAgeDelta(
    analysis: ITrichoscopyAnalysis,
    context: IPatientContext
  ): number {
    const ageGroup = getAgeGroup(context.age);
    const zone = analysis.zone === 'temporal' || analysis.zone === 'parietal'
      ? analysis.zone
      : 'parietal';

    const expectedNorms = PGMU_NORMS[context.gender]?.[zone]?.[ageGroup];
    if (!expectedNorms) {
      return 0;
    }

    // Calculate age delta based on bulb width deviation
    // Each 1μm deviation ≈ 2 years (from PGMU research)
    const bulbDelta = expectedNorms.bulbWidth - analysis.morphometry.bulbWidth;
    const estimatedAgeDelta = bulbDelta * 2;

    return Math.round(estimatedAgeDelta * 10) / 10;
  }

  /**
   * Get progression risk from vision analysis
   *
   * @returns Risk score 0-1 for condition worsening
   */
  calculateProgressionRisk(
    analysis: ITrichoscopyAnalysis,
    context: IPatientContext
  ): number {
    let risk = 0;

    // V/T ratio contribution (0-0.3)
    risk += Math.min(analysis.cycleAnalysis.vellusTerminalRatio * 0.6, 0.3);

    // A/T ratio contribution (0-0.2)
    risk += (1 - analysis.cycleAnalysis.anagenTelogenRatio) * 0.2;

    // Density contribution (0-0.2)
    const normalizedDensity = Math.min(analysis.density.density / 200, 1);
    risk += (1 - normalizedDensity) * 0.2;

    // Age contribution (0-0.15)
    if (context.age < 30) risk += 0.05;
    else if (context.age < 50) risk += 0.1;
    else risk += 0.15;

    // Genetic risk (0-0.15)
    if (context.geneticRisk) {
      risk += context.geneticRisk * 0.15;
    }

    return Math.min(risk, 1);
  }

  /**
   * Get recovery potential from vision analysis
   *
   * @returns Potential score 0-1 for improvement
   */
  calculateRecoveryPotential(
    analysis: ITrichoscopyAnalysis,
    context: IPatientContext
  ): number {
    let potential = 0.5;  // Base potential

    // Dormant follicles increase potential
    // (indicated by empty follicular units)
    const emptyFURatio = 1 - (analysis.density.totalHairCount /
      Math.max(analysis.density.follicularUnits * 2.5, 1));
    potential += Math.max(emptyFURatio * 0.2, 0);

    // Young age increases potential
    if (context.age < 30) potential += 0.15;
    else if (context.age < 40) potential += 0.1;
    else if (context.age < 50) potential += 0.05;

    // Good anagen ratio increases potential
    potential += analysis.cycleAnalysis.anagenTelogenRatio * 0.15;

    // Low miniaturization increases potential
    potential += (1 - analysis.cycleAnalysis.vellusTerminalRatio) * 0.15;

    return Math.min(potential, 1);
  }

  // Private helper methods

  private normalizeToPGMU(
    bulbWidth: number,
    shaftThickness: number,
    zone: 'temporal' | 'parietal',
    context: IPatientContext
  ): { bulbWidth: number; shaftThickness: number } {
    // Get expected norms for age/gender/zone
    const ageGroup = getAgeGroup(context.age);
    const norms = PGMU_NORMS[context.gender]?.[zone]?.[ageGroup];

    if (!norms) {
      return { bulbWidth, shaftThickness };
    }

    // Normalize to percentage of expected
    // Then convert back to absolute with young adult baseline
    const baseline = PGMU_NORMS[context.gender]?.[zone]?.['21-35'];
    if (!baseline) {
      return { bulbWidth, shaftThickness };
    }

    const bulbRatio = bulbWidth / norms.bulbWidth;
    const shaftRatio = shaftThickness / norms.shaftThickness;

    return {
      bulbWidth: baseline.bulbWidth * bulbRatio,
      shaftThickness: baseline.shaftThickness * shaftRatio,
    };
  }

  private mapZone(zone: string): 'temporal' | 'parietal' | 'occipital' | 'frontal' {
    const validZones = ['temporal', 'parietal', 'occipital', 'frontal'];
    if (validZones.includes(zone)) {
      return zone as 'temporal' | 'parietal' | 'occipital' | 'frontal';
    }
    return 'parietal';  // Default
  }

  private calculateCombinedConfidence(analysis: ITrichoscopyAnalysis): number {
    // Weighted combination of component confidences
    const weights = {
      overall: 0.3,
      morphometry: 0.25,
      density: 0.2,
      cycle: 0.25,
    };

    return (
      analysis.overallConfidence * weights.overall +
      analysis.morphometry.confidence * weights.morphometry +
      analysis.density.confidence * weights.density +
      analysis.cycleAnalysis.confidence * weights.cycle
    );
  }

  private addScore(
    scores: Map<FollicleState, number>,
    state: FollicleState,
    score: number
  ): void {
    const current = scores.get(state) || 0;
    scores.set(state, current + score);
  }

  private incorporateSimilarCases(
    scores: Map<FollicleState, number>,
    similarCases: ISimilarCase[],
    factors: string[]
  ): void {
    // Weight similar cases by similarity score
    const totalSimilarity = similarCases.reduce((sum, c) => sum + c.similarity, 0);
    if (totalSimilarity === 0) return;

    const diagnosisCounts = new Map<string, number>();
    similarCases.forEach(c => {
      const weight = c.similarity / totalSimilarity;
      const current = diagnosisCounts.get(c.diagnosis) || 0;
      diagnosisCounts.set(c.diagnosis, current + weight);
    });

    // Map diagnoses to states and add weighted scores
    diagnosisCounts.forEach((weight, diagnosis) => {
      const state = this.mapDiagnosisToState(diagnosis);
      if (state) {
        this.addScore(scores, state, weight * this.config.similarCaseWeight);
      }
    });

    factors.push(`Similar cases suggest: ${Array.from(diagnosisCounts.keys()).slice(0, 2).join(', ')}`);
  }

  private mapDiagnosisToState(diagnosis: string): FollicleState | null {
    const mapping: Record<string, FollicleState> = {
      'healthy': FollicleState.HEALTHY_ANAGEN,
      'early_aga': FollicleState.EARLY_MINIATURIZATION,
      'advanced_aga': FollicleState.ADVANCED_MINIATURIZATION,
      'telogen_effluvium': FollicleState.STRESS_INDUCED,
      'inflammation': FollicleState.INFLAMMATION,
      'senile': FollicleState.SENILE_ALOPECIA,
      'dormant': FollicleState.DORMANT,
      'terminal': FollicleState.TERMINAL,
    };

    const lowerDiagnosis = diagnosis.toLowerCase();
    for (const [key, state] of Object.entries(mapping)) {
      if (lowerDiagnosis.includes(key)) {
        return state;
      }
    }
    return null;
  }

  private normalizeScores(scores: Map<FollicleState, number>): Map<FollicleState, number> {
    const total = Array.from(scores.values()).reduce((sum, s) => sum + s, 0);
    if (total === 0) return scores;

    const normalized = new Map<FollicleState, number>();
    scores.forEach((score, state) => {
      normalized.set(state, score / total);
    });
    return normalized;
  }
}

/**
 * Factory function
 */
export function createVisionBeliefAdapter(
  config?: Partial<IVisionAdapterConfig>
): VisionBeliefAdapter {
  return new VisionBeliefAdapter(config);
}
