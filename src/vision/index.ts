/**
 * FolliCore Vision Module
 *
 * Computer Vision pipeline for trichoscopy image analysis.
 *
 * Architecture: DINOv2 (foundation) + SAM (segmentation) + Task heads
 *
 * @module vision
 */

// Types
export * from './VisionTypes';

// Core analyzer
export {
  TrichoscopyAnalyzer,
  createMockAnalyzer,
  type IFeatureExtractor,
  type ISegmentationModel,
  type IMorphometryHead,
  type IDensityHead,
  type ICycleHead,
  type IVectorDatabase,
  type IExplainabilityModule,
} from './TrichoscopyAnalyzer';

// Morphometry extraction
export {
  MorphometryExtractor,
  createMorphometryExtractor,
} from './MorphometryExtractor';

// POMDP integration
export {
  VisionBeliefAdapter,
  createVisionBeliefAdapter,
  type IVisionAdapterConfig,
  type IStateInference,
  DEFAULT_ADAPTER_CONFIG,
} from './VisionBeliefAdapter';
