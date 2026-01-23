/**
 * FolliCore Event Handlers
 *
 * Trichology-specific domain event handlers.
 *
 * Architecture Patterns:
 * - Observer Pattern for event handling
 * - Strategy Pattern for handler selection
 * - DDD Event Handlers
 *
 * @module events/handlers
 */

import type {
  IDomainEvent,
  IEventBus,
  IEventHandlerRegistration,
  EventHandler,
} from '../IEvents';
import type {
  IBeliefStateUpdatedEvent,
  ITreatmentRecommendedEvent,
  ITreatmentContraindicatedEvent,
  IThompsonArmUpdatedEvent,
  IBeliefStateSignificantChangePayload,
} from '../DomainEvents';
import { EventTypes } from '../DomainEvents';

// ============================================================================
// BASE EVENT HANDLER
// ============================================================================

/**
 * Base class for event handlers
 *
 * Provides common functionality:
 * - Registration info
 * - Error handling
 * - Logging
 */
export abstract class BaseEventHandler {
  abstract readonly name: string;
  abstract readonly eventTypes: string[];
  abstract readonly priority: number;
  readonly async: boolean = false;

  /**
   * Handle event
   * @param event - Domain event to handle
   */
  abstract handle(event: IDomainEvent): Promise<void>;

  /**
   * Get registration info
   */
  getRegistration(): IEventHandlerRegistration {
    return {
      name: this.name,
      eventTypes: this.eventTypes,
      priority: this.priority,
      async: this.async,
    };
  }

  /**
   * Check if this handler handles the event type
   */
  handles(eventType: string): boolean {
    return (
      this.eventTypes.includes(eventType) || this.eventTypes.includes('*')
    );
  }

  /**
   * Register with event bus
   */
  register(eventBus: IEventBus): void {
    for (const eventType of this.eventTypes) {
      eventBus.subscribe(
        eventType,
        this.handle.bind(this) as EventHandler
      );
    }
  }
}

// ============================================================================
// BELIEF STATE HANDLER
// ============================================================================

/**
 * Belief state change callback
 */
export interface IBeliefStateChangeCallback {
  /** Called when belief state is updated */
  onBeliefUpdated(event: IBeliefStateUpdatedEvent): Promise<void>;

  /** Called when significant change detected */
  onSignificantChange(
    event: IDomainEvent<IBeliefStateSignificantChangePayload>
  ): Promise<void>;
}

/**
 * Belief State Event Handler
 *
 * Handles belief state updates for monitoring progression:
 * - Tracks state changes
 * - Detects significant changes
 * - Triggers alerts for deterioration
 *
 * Priority: 10
 */
export class BeliefStateEventHandler extends BaseEventHandler {
  readonly name = 'BeliefStateEventHandler';
  readonly eventTypes = [
    EventTypes.BELIEF_STATE_UPDATED,
    EventTypes.BELIEF_STATE_SIGNIFICANT_CHANGE,
  ];
  readonly priority = 10;
  readonly async = true; // Can run async for non-critical processing

  private readonly callback: IBeliefStateChangeCallback;
  private readonly significantChangeThreshold: number;

  constructor(
    callback: IBeliefStateChangeCallback,
    significantChangeThreshold = 0.15
  ) {
    super();
    this.callback = callback;
    this.significantChangeThreshold = significantChangeThreshold;
  }

  async handle(event: IDomainEvent): Promise<void> {
    if (event.eventType === EventTypes.BELIEF_STATE_UPDATED) {
      const beliefEvent = event as IBeliefStateUpdatedEvent;
      await this.callback.onBeliefUpdated(beliefEvent);

      // Check for significant change
      const { changes } = beliefEvent.payload;
      const maxDelta = Math.max(...changes.map((c) => Math.abs(c.delta)));

      if (maxDelta >= this.significantChangeThreshold) {
        await this.callback.onSignificantChange(
          beliefEvent as unknown as IDomainEvent<IBeliefStateSignificantChangePayload>
        );
      }
    }
  }
}

// ============================================================================
// TREATMENT RECOMMENDATION HANDLER
// ============================================================================

/**
 * Treatment recommendation callback
 */
export interface ITreatmentRecommendationCallback {
  /** Log recommendation for audit */
  logRecommendation(event: ITreatmentRecommendedEvent): Promise<void>;

  /** Notify clinician of recommendation */
  notifyClinician(event: ITreatmentRecommendedEvent): Promise<void>;
}

/**
 * Treatment Recommendation Event Handler
 *
 * Handles treatment recommendations:
 * - Logs for compliance
 * - Notifies clinicians
 *
 * Priority: 5 (high priority for recommendations)
 */
export class TreatmentRecommendationHandler extends BaseEventHandler {
  readonly name = 'TreatmentRecommendationHandler';
  readonly eventTypes = [EventTypes.TREATMENT_RECOMMENDED];
  readonly priority = 5;

  private readonly callback: ITreatmentRecommendationCallback;

  constructor(callback: ITreatmentRecommendationCallback) {
    super();
    this.callback = callback;
  }

  async handle(event: IDomainEvent): Promise<void> {
    const treatmentEvent = event as ITreatmentRecommendedEvent;
    // Always log for compliance
    await this.callback.logRecommendation(treatmentEvent);

    // Notify clinician
    await this.callback.notifyClinician(treatmentEvent);
  }
}

// ============================================================================
// CONTRAINDICATION HANDLER (SAFETY-CRITICAL)
// ============================================================================

/**
 * Contraindication alert callback
 *
 * SAFETY-CRITICAL per CLAUDE.md Rule 1
 */
export interface IContraindicationAlertCallback {
  /** Alert about contraindication */
  alert(event: ITreatmentContraindicatedEvent): Promise<void>;

  /** Log for compliance */
  log(event: ITreatmentContraindicatedEvent): Promise<void>;

  /** Block treatment */
  blockTreatment(event: ITreatmentContraindicatedEvent): Promise<void>;
}

/**
 * Contraindication Event Handler
 *
 * SAFETY-CRITICAL: Handles treatment contraindications.
 * Per CLAUDE.md Rule 1: "Contraindications are absolute barriers"
 *
 * Priority: 1 (highest - safety critical)
 */
export class ContraindicationEventHandler extends BaseEventHandler {
  readonly name = 'ContraindicationEventHandler';
  readonly eventTypes = [
    EventTypes.TREATMENT_CONTRAINDICATED,
    EventTypes.CONTRAINDICATION_DETECTED,
  ];
  readonly priority = 1;
  readonly async = false; // Must be synchronous for immediate response

  private readonly callback: IContraindicationAlertCallback;

  constructor(callback: IContraindicationAlertCallback) {
    super();
    this.callback = callback;
  }

  async handle(event: IDomainEvent): Promise<void> {
    const contraindicationEvent = event as ITreatmentContraindicatedEvent;
    // Always log for compliance
    await this.callback.log(contraindicationEvent);

    // Block treatment immediately
    await this.callback.blockTreatment(contraindicationEvent);

    // Alert clinician
    await this.callback.alert(contraindicationEvent);
  }
}

// ============================================================================
// THOMPSON SAMPLING HANDLER
// ============================================================================

/**
 * Thompson sampling learning callback
 */
export interface IThompsonLearningCallback {
  /** Update model based on outcome */
  updateModel(event: IThompsonArmUpdatedEvent): Promise<void>;

  /** Log for analysis */
  logUpdate(event: IThompsonArmUpdatedEvent): Promise<void>;
}

/**
 * Thompson Sampling Event Handler
 *
 * Processes Thompson Sampling updates for learning:
 * - Updates bandit arms
 * - Logs for analysis
 *
 * Priority: 20
 */
export class ThompsonSamplingHandler extends BaseEventHandler {
  readonly name = 'ThompsonSamplingHandler';
  readonly eventTypes = [
    EventTypes.THOMPSON_SAMPLING_PERFORMED,
    EventTypes.THOMPSON_ARM_UPDATED,
  ];
  readonly priority = 20;
  readonly async = true;

  private readonly callback: IThompsonLearningCallback;

  constructor(callback: IThompsonLearningCallback) {
    super();
    this.callback = callback;
  }

  async handle(event: IDomainEvent): Promise<void> {
    const thompsonEvent = event as IThompsonArmUpdatedEvent;
    // Log for analysis
    await this.callback.logUpdate(thompsonEvent);

    // Update model
    await this.callback.updateModel(thompsonEvent);
  }
}

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

/**
 * Event Handler Registry
 *
 * Manages registration and lookup of event handlers
 */
export class EventHandlerRegistry {
  private readonly handlers: Map<string, BaseEventHandler[]>;
  private readonly handlersByName: Map<string, BaseEventHandler>;

  constructor() {
    this.handlers = new Map();
    this.handlersByName = new Map();
  }

  /**
   * Register handler
   */
  register(handler: BaseEventHandler): void {
    // Store by name
    this.handlersByName.set(handler.name, handler);

    // Store by event types
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType) ?? [];
      existing.push(handler);
      existing.sort((a, b) => a.priority - b.priority);
      this.handlers.set(eventType, existing);
    }
  }

  /**
   * Unregister handler
   */
  unregister(handlerName: string): void {
    const handler = this.handlersByName.get(handlerName);
    if (!handler) {
      return;
    }

    this.handlersByName.delete(handlerName);

    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType);
      if (existing) {
        const index = existing.findIndex((h) => h.name === handlerName);
        if (index !== -1) {
          existing.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get handlers for event type
   */
  getHandlers(eventType: string): BaseEventHandler[] {
    const specific = this.handlers.get(eventType) ?? [];
    const wildcard = this.handlers.get('*') ?? [];
    return [...specific, ...wildcard].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get handler by name
   */
  getHandler(name: string): BaseEventHandler | undefined {
    return this.handlersByName.get(name);
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): BaseEventHandler[] {
    return Array.from(this.handlersByName.values());
  }

  /**
   * Register all handlers with event bus
   */
  registerWithEventBus(eventBus: IEventBus): void {
    for (const handler of this.handlersByName.values()) {
      handler.register(eventBus);
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.handlersByName.clear();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default event handler registry
 */
export function createDefaultHandlerRegistry(): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();
  // Note: Actual callbacks would be provided by the application
  return registry;
}

/**
 * Create trichology-focused handler registry
 */
export function createTrichologyHandlerRegistry(
  contraindicationCallback: IContraindicationAlertCallback,
  beliefStateCallback?: IBeliefStateChangeCallback,
  treatmentCallback?: ITreatmentRecommendationCallback
): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();

  // Always register contraindication handler (safety-critical)
  registry.register(new ContraindicationEventHandler(contraindicationCallback));

  // Optional handlers
  if (beliefStateCallback) {
    registry.register(new BeliefStateEventHandler(beliefStateCallback));
  }

  if (treatmentCallback) {
    registry.register(new TreatmentRecommendationHandler(treatmentCallback));
  }

  return registry;
}
