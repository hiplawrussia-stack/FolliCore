/**
 * FolliCore - Predictive Trichology Platform
 *
 * Predictive trichology platform for hair health management.
 * Uses POMDP (Partially Observable Markov Decision Process) approach
 * with Thompson Sampling for optimal treatment selection.
 *
 * Architecture:
 * - Trichology: Domain models, states, safety rules
 * - Vision: DINOv2 + SAM-based image analysis
 * - Integration: End-to-end pipeline orchestration
 *
 * @packageDocumentation
 */

// Export trichology domain
export * from './trichology';

// Export vision module
export * from './vision';

// Export integration layer
export * from './integration';
