/**
 * FolliCore Integration Module
 *
 * High-level integration layer connecting Vision and Engine modules.
 *
 * @module integration
 */

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
