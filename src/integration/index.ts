/**
 * FolliCore Integration Module
 *
 * High-level integration layers connecting Vision, Acoustic, and Engine modules.
 *
 * Integration layers:
 * - VisionEngineIntegration: Vision-only pipeline
 * - AcousticEngineIntegration: Acoustic-only pipeline
 * - MultimodalIntegration: Combined vision + acoustic with cross-modal fusion
 *
 * @module integration
 */

// Vision-Engine Integration
export {
  VisionEngineIntegration,
  createVisionEngineIntegration,
  createMockIntegration,
  type IIntegrationConfig,
  type IIntegrationDependencies,
  type IPipelineResult,
  type IBatchPipelineResult,
  DEFAULT_INTEGRATION_CONFIG,
} from './VisionEngineIntegration';

// Acoustic-Engine Integration
export {
  AcousticEngineIntegration,
  createAcousticEngineIntegration,
  createEdgeAcousticIntegration,
  type IAcousticIntegrationConfig,
  type IAcousticPipelineResult,
  type IMultiZoneAcousticPipelineResult,
  type ICombinedObservation,
  DEFAULT_ACOUSTIC_INTEGRATION_CONFIG,
} from './AcousticEngineIntegration';

// Multimodal Integration (Vision + Acoustic)
export {
  MultimodalIntegration,
  createMultimodalIntegration,
  type IMultimodalConfig,
  type IMultimodalDependencies,
  type IMultimodalInput,
  type IMultimodalPipelineResult,
  type IModalityAgreement,
  type IModalityDiscrepancy,
  type IScalpMappingResult,
  type IScalpSummary,
  DEFAULT_MULTIMODAL_CONFIG,
} from './MultimodalIntegration';
