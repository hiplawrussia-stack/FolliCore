/**
 * FolliCore gRPC Module
 *
 * Provides TypeScript↔Python ML API bridge using gRPC.
 *
 * This module REPLACES mock implementations (Math.random()) with real ML inference,
 * addressing CLAUDE.md §2.1 (Truthfulness) violation.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    TypeScript (FolliCore)                    │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
 * │  │ VisionBelief    │  │ AcousticAnalyzer│  │ Multimodal  │ │
 * │  │ Adapter         │  │                 │  │ Integration │ │
 * │  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
 * │           │                    │                   │        │
 * │  ┌────────┴────────────────────┴───────────────────┴──────┐ │
 * │  │              GrpcFeatureExtractor / GrpcAcousticClient │ │
 * │  └────────────────────────┬───────────────────────────────┘ │
 * │                           │ gRPC (port 50051)               │
 * └───────────────────────────┼─────────────────────────────────┘
 *                             │
 * ┌───────────────────────────┼─────────────────────────────────┐
 * │                           ▼                                  │
 * │  ┌────────────────────────────────────────────────────────┐ │
 * │  │              Python ML API (FastAPI + gRPC)            │ │
 * │  │  ┌───────────────┐  ┌───────────────┐  ┌────────────┐ │ │
 * │  │  │ DINOv2        │  │ OpenBEATs     │  │ MedSAM2    │ │ │
 * │  │  │ (Vision)      │  │ (Acoustic)    │  │ (Segment)  │ │ │
 * │  │  └───────────────┘  └───────────────┘  └────────────┘ │ │
 * │  └────────────────────────────────────────────────────────┘ │
 * │                      Python (ML Pipeline)                    │
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * IEC 62304 Note:
 *   This is infrastructure code (Class B) that supports Class C safety features.
 *   All requests include request_id for traceability.
 *
 * References:
 * - gRPC Node.js: https://grpc.io/docs/languages/node/basics/
 * - Proto3: https://protobuf.dev/programming-guides/proto3/
 */

// Base client
export {
  GrpcClient,
  ConnectionState,
  getGlobalGrpcClient,
  resetGlobalGrpcClient,
  type GrpcClientEvent,
  type GrpcClientEventHandler,
} from './GrpcClient';

// Vision feature extractor
export {
  GrpcFeatureExtractor,
  createMockFeatureExtractor,
  type IFeatureExtractor,
  type GrpcFeatureExtractorConfig,
} from './GrpcFeatureExtractor';

// Acoustic client
export {
  GrpcAcousticClient,
  createMockAcousticClient,
  type GrpcAcousticClientConfig,
} from './GrpcAcousticClient';

// Types
export * from './types';
