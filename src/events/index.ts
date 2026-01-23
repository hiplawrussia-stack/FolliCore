/**
 * FolliCore Events Module
 *
 * Event-Driven Architecture for Trichology AI Engine
 *
 * Features:
 * - Type-safe EventBus with pipeline behaviors
 * - HIPAA-compliant Event Store (6 years retention)
 * - GDPR-ready crypto-shredding support
 * - Safety-critical event handling
 * - MediatR-inspired middleware pattern
 *
 * Architecture Patterns:
 * - Event Sourcing (append-only, immutable)
 * - CQRS (Command Query Responsibility Segregation)
 * - Observer Pattern (event distribution)
 * - Mediator Pattern (decoupling)
 * - Pipeline Pattern (middleware)
 *
 * Research Foundation (2025-2026):
 * - Healthcare EDA (Philips, Epic Systems patterns)
 * - Event Sourcing (Oskar Dudycz, Event-Driven.io)
 * - DDD Domain Events (Khalil Stemmler, Microsoft)
 * - HIPAA 45 C.F.R. § 164.312(b) audit controls
 * - GDPR Article 30, EHDS 2025/327
 *
 * @module events
 */

// ============================================================================
// INTERFACES
// ============================================================================

export type {
  // Core event types
  IDomainEvent,
  IEventMetadata,
  AggregateType,
  EventHandler,
  IEventSubscription,
  IEventBus,
  ISubscriptionOptions,
  IRetryConfig,

  // Event Store
  IEventStoreConfig,
  IStoredEvent,
  IEventQueryOptions,
  IAggregateSnapshot,
  IEventStore,

  // Pipeline
  IPipelineContext,
  IPipelineBehavior,

  // Handlers
  IEventHandlerRegistration,
  IEventHandlerResult,
  IEventDispatchResult,

  // Audit
  IAuditLogEntry,
  IAuditLogQueryOptions,
  IAuditLogger,

  // Configuration
  IEventBusConfig,
} from './IEvents';

export {
  createEventMetadata,
  createPipelineContext,
  DEFAULT_EVENT_BUS_CONFIG,
  DEFAULT_EVENT_STORE_CONFIG,
} from './IEvents';

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

export {
  // Event types constant
  EventTypes,
  type EventType,

  // Factory
  createDomainEvent,

  // Patient events
  type IPatientInitializedPayload,
  type IPatientInitializedEvent,
  createPatientInitializedEvent,

  // Analysis session events
  type IAnalysisSessionStartedPayload,
  type IAnalysisSessionStartedEvent,
  type IAnalysisSessionCompletedPayload,
  type IAnalysisSessionCompletedEvent,

  // Observation events
  type IFollicleObservationPayload,
  type IFollicleObservationRecordedEvent,
  type IAcousticObservationPayload,
  type IAcousticObservationRecordedEvent,

  // Belief state events
  type IBeliefStateUpdatedPayload,
  type IBeliefStateUpdatedEvent,
  type IBeliefStateSignificantChangePayload,
  type IBeliefStateSignificantChangeEvent,

  // Treatment events
  type ITreatmentRecommendedPayload,
  type ITreatmentRecommendedEvent,
  type ITreatmentContraindicatedPayload,
  type ITreatmentContraindicatedEvent,
  type ITreatmentOutcomePayload,
  type ITreatmentOutcomeRecordedEvent,

  // Thompson Sampling events
  type IThompsonSamplingPayload,
  type IThompsonSamplingPerformedEvent,
  type IThompsonArmUpdatedPayload,
  type IThompsonArmUpdatedEvent,

  // Trajectory events
  type ITrajectoryPredictedPayload,
  type ITrajectoryPredictedEvent,
  type ITrajectoryDeviationPayload,
  type ITrajectoryDeviationDetectedEvent,

  // Safety events
  type ISafetyRuleTriggeredPayload,
  type ISafetyRuleTriggeredEvent,
  type IContraindicationDetectedPayload,
  type IContraindicationDetectedEvent,

  // Type guards
  isBeliefStateUpdatedEvent,
  isTreatmentRecommendedEvent,
  isSafetyCriticalEvent,
  isObservationEvent,
} from './DomainEvents';

// ============================================================================
// EVENT BUS
// ============================================================================

export {
  FolliCoreEventBus,
  createEventBus,
  createInitializedEventBus,
} from './EventBus';

// ============================================================================
// EVENT STORE
// ============================================================================

export {
  InMemoryEventStore,
  InMemoryAuditLogger,
  createInMemoryEventStore,
  createInMemoryAuditLogger,
} from './EventStore';

// ============================================================================
// PIPELINE BEHAVIORS
// ============================================================================

export {
  // Behaviors
  LoggingBehavior,
  ValidationBehavior,
  MetricsBehavior,
  AuditBehavior,
  SafetyCriticalBehavior,
  RetryBehavior,
  ThrottlingBehavior,

  // Types
  type EventValidator,
  type IMetricsCollector,

  // Factories
  createDefaultBehaviors,
  createSafetyAwareBehaviors,
} from './behaviors';

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export {
  // Base
  BaseEventHandler,

  // Handlers
  BeliefStateEventHandler,
  TreatmentRecommendationHandler,
  ContraindicationEventHandler,
  ThompsonSamplingHandler,

  // Registry
  EventHandlerRegistry,

  // Callback interfaces
  type IBeliefStateChangeCallback,
  type ITreatmentRecommendationCallback,
  type IContraindicationAlertCallback,
  type IThompsonLearningCallback,

  // Factories
  createDefaultHandlerRegistry,
  createTrichologyHandlerRegistry,
} from './handlers';

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

import { createEventBus } from './EventBus';
import type { FolliCoreEventBus } from './EventBus';
import { InMemoryEventStore, InMemoryAuditLogger } from './EventStore';
import { createDefaultBehaviors, createSafetyAwareBehaviors } from './behaviors';
import {
  EventHandlerRegistry,
  ContraindicationEventHandler,
  type IContraindicationAlertCallback,
} from './handlers';
import type { IEventBusConfig, IEventStoreConfig, IDomainEvent } from './IEvents';
import type { ITreatmentContraindicatedEvent } from './DomainEvents';

/**
 * Configuration for creating a complete event system
 */
export interface IEventSystemConfig {
  /** Event bus configuration */
  eventBusConfig?: Partial<IEventBusConfig>;

  /** Event store configuration */
  eventStoreConfig?: Partial<IEventStoreConfig>;

  /** Enable persistence (default: true) */
  enablePersistence?: boolean;

  /** Enable audit logging (default: true) */
  enableAuditLog?: boolean;

  /** Contraindication callback (required for safety) */
  contraindicationCallback?: IContraindicationAlertCallback;

  /** Custom logger (optional) */
  logger?: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
}

/**
 * Complete event system with all components
 */
export interface IEventSystem {
  /** Event bus for publishing/subscribing */
  eventBus: FolliCoreEventBus;

  /** Event store for persistence */
  eventStore: InMemoryEventStore;

  /** Audit logger for HIPAA compliance */
  auditLogger: InMemoryAuditLogger;

  /** Handler registry */
  handlerRegistry: EventHandlerRegistry;

  /** Shutdown function */
  shutdown: () => void;
}

/**
 * Create complete event system for FolliCore
 *
 * Convenience factory that sets up:
 * - EventBus with pipeline behaviors
 * - In-memory EventStore (PostgreSQL-ready)
 * - HIPAA-compliant AuditLogger
 * - Handler registry with safety-critical handlers
 *
 * @example
 * ```typescript
 * const eventSystem = createEventSystem({
 *   contraindicationCallback: {
 *     alert: async (event) => { ... },
 *     log: async (event) => { ... },
 *     blockTreatment: async (event) => { ... },
 *   },
 * });
 *
 * // Subscribe to events
 * eventSystem.eventBus.subscribe('BELIEF_STATE_UPDATED', async (event) => {
 *   console.log('Belief updated:', event);
 * });
 *
 * // Publish event
 * await eventSystem.eventBus.publish(beliefStateUpdatedEvent);
 *
 * // Shutdown
 * eventSystem.shutdown();
 * ```
 */
export function createEventSystem(
  config: IEventSystemConfig = {}
): IEventSystem {
  // Extract config with defaults for optional properties
  const eventBusConfig = config.eventBusConfig ?? {};
  const eventStoreConfig = config.eventStoreConfig ?? {};
  const enablePersistence = config.enablePersistence ?? true;
  const enableAuditLog = config.enableAuditLog ?? true;
  const contraindicationCallback = config.contraindicationCallback;

  // Create event store
  const eventStore = new InMemoryEventStore(eventStoreConfig);

  // Create audit logger
  const auditLogger = new InMemoryAuditLogger(
    eventStoreConfig.retentionDays ?? 2190
  );

  // Create behaviors
  const behaviors = contraindicationCallback
    ? createSafetyAwareBehaviors(
        async (event: IDomainEvent) => {
          // Fire safety alert for contraindication events
          if (
            event.eventType === 'TREATMENT_CONTRAINDICATED' ||
            event.eventType === 'CONTRAINDICATION_DETECTED'
          ) {
            await contraindicationCallback.alert(
              event as ITreatmentContraindicatedEvent
            );
          }
        },
        enableAuditLog ? auditLogger : undefined
      )
    : createDefaultBehaviors(enableAuditLog ? auditLogger : undefined);

  // Create event bus
  const eventBus = createEventBus({
    ...eventBusConfig,
    enablePersistence,
    enableAuditLog,
    behaviors,
  });

  // Initialize event bus
  eventBus.initialize(
    enablePersistence ? eventStore : undefined,
    enableAuditLog ? auditLogger : undefined
  );

  // Create handler registry
  const handlerRegistry = new EventHandlerRegistry();

  // Register contraindication handler if callback provided
  if (contraindicationCallback) {
    handlerRegistry.register(
      new ContraindicationEventHandler(contraindicationCallback)
    );
    handlerRegistry.registerWithEventBus(eventBus);
  }

  // Shutdown function
  const shutdown = (): void => {
    eventBus.clearAll();
    handlerRegistry.clear();
  };

  return {
    eventBus,
    eventStore,
    auditLogger,
    handlerRegistry,
    shutdown,
  };
}

/**
 * Create minimal event system (no persistence, no audit)
 *
 * Useful for testing or simple use cases
 */
export function createMinimalEventSystem(): {
  eventBus: FolliCoreEventBus;
  shutdown: () => void;
} {
  const eventBus = createEventBus({
    enablePersistence: false,
    enableAuditLog: false,
    behaviors: [],
  });

  return {
    eventBus,
    shutdown: () => {
      eventBus.clearAll();
    },
  };
}
