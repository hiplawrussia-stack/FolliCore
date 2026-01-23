/**
 * FolliCore Event Bus Implementation
 *
 * Type-safe, HIPAA-compliant Event Bus for trichology AI engine.
 *
 * Architecture Patterns:
 * - Observer Pattern for event distribution
 * - Mediator Pattern for decoupling
 * - Pipeline Pattern for middleware (MediatR-inspired)
 *
 * @module events
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type {
  IDomainEvent,
  IEventBus,
  IEventBusConfig,
  IEventStore,
  IEventSubscription,
  IEventDispatchResult,
  IEventHandlerResult,
  IPipelineBehavior,
  IPipelineContext,
  IAuditLogger,
  ISubscriptionOptions,
  EventHandler,
} from './IEvents';
import { DEFAULT_EVENT_BUS_CONFIG, createPipelineContext } from './IEvents';

// ============================================================================
// TYPE-SAFE EVENT EMITTER
// ============================================================================

/**
 * Typed EventEmitter for domain events
 */
class TypedEventEmitter extends EventEmitter {
  emitTyped(event: string, ...args: [IDomainEvent]): boolean {
    return super.emit(event, ...args);
  }

  onTyped(event: string, listener: (...args: [IDomainEvent]) => void): this {
    super.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  offTyped(event: string, listener: (...args: [IDomainEvent]) => void): this {
    super.off(event, listener as (...args: unknown[]) => void);
    return this;
  }
}

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

interface RegisteredHandler {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
  async: boolean;
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  createdAt: Date;
}

// ============================================================================
// EVENT BUS IMPLEMENTATION
// ============================================================================

/**
 * FolliCore Event Bus
 *
 * Features:
 * - Type-safe event handling
 * - Pipeline behaviors (middleware)
 * - Automatic persistence (optional)
 * - HIPAA-compliant audit logging
 * - Retry with exponential backoff
 * - Dead letter queue for failed events
 * - Concurrent handler execution
 */
export class FolliCoreEventBus implements IEventBus {
  private readonly emitter: TypedEventEmitter;
  private readonly handlers: Map<string, RegisteredHandler[]>;
  private readonly subscriptions: Map<string, RegisteredHandler>;
  private readonly behaviors: IPipelineBehavior[];
  private readonly config: IEventBusConfig;
  private eventStore?: IEventStore;
  private auditLogger?: IAuditLogger;

  constructor(config: Partial<IEventBusConfig> = {}) {
    this.emitter = new TypedEventEmitter();
    this.handlers = new Map<string, RegisteredHandler[]>();
    this.subscriptions = new Map<string, RegisteredHandler>();
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config };
    this.behaviors = [...this.config.behaviors].sort(
      (a, b) => a.priority - b.priority
    );

    // Set max listeners to avoid warnings with many handlers
    this.emitter.setMaxListeners(100);
  }

  /**
   * Initialize event bus with optional dependencies
   */
  initialize(
    eventStore?: IEventStore,
    auditLogger?: IAuditLogger
  ): void {
    this.eventStore = eventStore;
    this.auditLogger = auditLogger;
  }

  /**
   * Add pipeline behavior
   */
  addBehavior(behavior: IPipelineBehavior): void {
    this.behaviors.push(behavior);
    this.behaviors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove pipeline behavior by name
   */
  removeBehavior(name: string): boolean {
    const index = this.behaviors.findIndex((b) => b.name === name);
    if (index !== -1) {
      this.behaviors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Publish domain event
   */
  async publish(event: IDomainEvent): Promise<void> {
    const result = await this.publishWithResult(event);

    // Throw if all handlers failed
    if (result.handlersFailed > 0 && result.handlersSucceeded === 0) {
      const errors = result.handlerResults
        .filter((r) => !r.success && r.error)
        .map((r) => r.error?.message)
        .join('; ');
      throw new Error(`All event handlers failed: ${errors}`);
    }
  }

  /**
   * Publish event and return detailed result
   */
  async publishWithResult(event: IDomainEvent): Promise<IEventDispatchResult> {
    const startTime = Date.now();
    const correlationId = event.metadata.correlationId;
    const context = createPipelineContext(
      correlationId,
      event.metadata.userId,
      event.metadata.patientId,
      event.metadata.sessionId
    );

    const result: IEventDispatchResult = {
      eventId: event.eventId,
      eventType: event.eventType,
      handlersInvoked: 0,
      handlersSucceeded: 0,
      handlersFailed: 0,
      handlerResults: [],
      totalDurationMs: 0,
      stored: false,
    };

    try {
      // Execute pipeline behaviors
      await this.executePipeline(event, context, async () => {
        // Persist event if enabled
        if (this.config.enablePersistence && this.eventStore) {
          const stored = await this.eventStore.append(event);
          result.stored = true;
          result.storageId = stored.id;
        }

        // Dispatch to handlers
        const handlerResults = await this.dispatchToHandlers(event, context);
        result.handlerResults = handlerResults;
        result.handlersInvoked = handlerResults.length;
        result.handlersSucceeded = handlerResults.filter((r) => r.success).length;
        result.handlersFailed = handlerResults.filter(
          (r) => !r.success && !r.skipped
        ).length;
      });

      // Audit log success
      if (this.config.enableAuditLog && this.auditLogger) {
        await this.auditLogger.log({
          eventType: event.eventType,
          eventId: event.eventId,
          userId: event.metadata.userId,
          patientId: event.metadata.patientId,
          sessionId: event.metadata.sessionId,
          action: 'publish',
          resource: `event/${event.eventType}`,
          outcome: result.handlersFailed === 0 ? 'success' : 'partial',
          correlationId,
          details: {
            handlersInvoked: result.handlersInvoked,
            handlersSucceeded: result.handlersSucceeded,
            handlersFailed: result.handlersFailed,
          },
        });
      }
    } catch (error) {
      // Handle dead letter queue
      if (this.config.enableDeadLetterQueue && this.config.deadLetterHandler) {
        await this.config.deadLetterHandler(event, error as Error);
      }

      // Audit log failure
      if (this.config.enableAuditLog && this.auditLogger) {
        await this.auditLogger.log({
          eventType: event.eventType,
          eventId: event.eventId,
          userId: event.metadata.userId,
          patientId: event.metadata.patientId,
          sessionId: event.metadata.sessionId,
          action: 'publish',
          resource: `event/${event.eventType}`,
          outcome: 'failure',
          correlationId,
          details: {
            error: (error as Error).message,
          },
        });
      }

      throw error;
    }

    result.totalDurationMs = Date.now() - startTime;
    context.metrics.durationMs = result.totalDurationMs;
    context.metrics.handlerCount = result.handlersInvoked;

    return result;
  }

  /**
   * Subscribe to event type
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: ISubscriptionOptions
  ): IEventSubscription {
    const id = randomUUID();
    const registration: RegisteredHandler = {
      id,
      eventType,
      handler: handler as EventHandler,
      priority: options?.priority ?? 100,
      async: options?.async ?? false,
      retry: options?.retry ?? this.config.defaultRetry,
      createdAt: new Date(),
    };

    // Add to handlers map
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(registration);
    handlers.sort((a, b) => a.priority - b.priority);
    this.handlers.set(eventType, handlers);

    // Store subscription for lookup
    this.subscriptions.set(id, registration);

    // Create wrapper for EventEmitter
    const wrappedHandler = (_event: IDomainEvent) => {
      // Handler execution is managed by dispatchToHandlers
    };
    this.emitter.onTyped(eventType, wrappedHandler);

    const subscription: IEventSubscription = {
      id,
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => {
        this.unsubscribe(id);
      },
    };

    return subscription;
  }

  /**
   * Subscribe to multiple event types
   */
  subscribeMany(
    eventTypes: string[],
    handler: EventHandler,
    options?: ISubscriptionOptions
  ): IEventSubscription[] {
    return eventTypes.map((eventType) =>
      this.subscribe(eventType, handler, options)
    );
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    const registration = this.subscriptions.get(subscriptionId);
    if (!registration) {
      return;
    }

    // Remove from handlers map
    const handlers = this.handlers.get(registration.eventType);
    if (handlers) {
      const index = handlers.findIndex((h) => h.id === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.handlers.delete(registration.eventType);
      }
    }

    // Remove from subscriptions
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    this.handlers.clear();
    this.subscriptions.clear();
    this.emitter.removeAllListeners();
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get handler count for event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length ?? 0;
  }

  /**
   * Check if event type has handlers
   */
  hasHandlers(eventType: string): boolean {
    return this.getHandlerCount(eventType) > 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Execute pipeline behaviors
   */
  private async executePipeline(
    event: IDomainEvent,
    context: IPipelineContext,
    finalHandler: () => Promise<void>
  ): Promise<void> {
    if (this.behaviors.length === 0) {
      await finalHandler();
      return;
    }

    // Build pipeline chain
    let index = 0;
    const executeNext = async (): Promise<void> => {
      if (index < this.behaviors.length) {
        // eslint-disable-next-line security/detect-object-injection -- index is controlled numeric loop variable
        const behavior = this.behaviors[index];
        if (behavior) {
          index++;
          await behavior.handle(event, context, executeNext);
        }
      } else {
        await finalHandler();
      }
    };

    await executeNext();
  }

  /**
   * Dispatch event to all registered handlers
   */
  private async dispatchToHandlers(
    event: IDomainEvent,
    context: IPipelineContext
  ): Promise<IEventHandlerResult[]> {
    const handlers = this.handlers.get(event.eventType) ?? [];

    // Also get wildcard handlers
    const wildcardHandlers = this.handlers.get('*') ?? [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      return [];
    }

    // Separate sync and async handlers
    const syncHandlers = allHandlers.filter((h) => !h.async);
    const asyncHandlers = allHandlers.filter((h) => h.async);

    const results: IEventHandlerResult[] = [];

    // Execute sync handlers with concurrency limit
    const syncResults = await this.executeHandlersWithConcurrency(
      syncHandlers,
      event,
      context
    );
    results.push(...syncResults);

    // Fire async handlers (fire-and-forget, but still track)
    if (asyncHandlers.length > 0) {
      // Don't await, but handle errors
      this.executeHandlersWithConcurrency(asyncHandlers, event, context)
        .then((asyncResults) => {
          // Log async handler failures
          const failures = asyncResults.filter((r) => !r.success);
          if (failures.length > 0 && this.auditLogger) {
            for (const failure of failures) {
              this.auditLogger
                .log({
                  eventType: event.eventType,
                  eventId: event.eventId,
                  action: 'handle',
                  resource: `handler/${failure.handlerName}`,
                  outcome: 'failure',
                  correlationId: context.correlationId,
                  details: { error: failure.error?.message, async: true },
                })
                .catch(() => {
                  // Ignore audit log errors for async handlers
                });
            }
          }
        })
        .catch(() => {
          // Ignore errors from async handlers
        });

      // Mark async handlers as fired (not awaited)
      for (const handler of asyncHandlers) {
        results.push({
          handlerName: handler.id,
          success: true,
          durationMs: 0,
          skipped: false,
          skipReason: 'async-fired',
        });
      }
    }

    return results;
  }

  /**
   * Execute handlers with concurrency limit
   */
  private async executeHandlersWithConcurrency(
    handlers: RegisteredHandler[],
    event: IDomainEvent,
    context: IPipelineContext
  ): Promise<IEventHandlerResult[]> {
    const results: IEventHandlerResult[] = [];
    const executing: Promise<void>[] = [];

    for (const handler of handlers) {
      const promise = this.executeHandler(handler, event, context).then(
        (result) => {
          results.push(result);
        }
      );

      executing.push(promise);

      // Limit concurrency
      if (executing.length >= this.config.maxConcurrentHandlers) {
        await Promise.race(executing);
        // Remove first element - the promise is already handled by Promise.all below
        const completed = executing.shift();
        if (completed !== undefined) {
          // Ensure the promise is handled to avoid floating promise warning
          completed.catch(() => {
            // Errors are already handled in executeHandler
          });
        }
      }
    }

    // Wait for remaining handlers
    await Promise.all(executing);

    return results;
  }

  /**
   * Execute single handler with retry
   */
  private async executeHandler(
    registration: RegisteredHandler,
    event: IDomainEvent,
    context: IPipelineContext
  ): Promise<IEventHandlerResult> {
    const startTime = Date.now();
    const result: IEventHandlerResult = {
      handlerName: registration.id,
      success: false,
      durationMs: 0,
      skipped: false,
    };

    const retry = registration.retry ?? this.config.defaultRetry;
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < retry.maxAttempts) {
      try {
        // Execute with timeout
        await this.executeWithTimeout(
          registration.handler(event),
          this.config.handlerTimeoutMs
        );

        result.success = true;
        context.metrics.retryCount = attempt;
        break;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt < retry.maxAttempts) {
          // Wait with exponential backoff
          const delay =
            retry.delayMs * Math.pow(retry.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    if (!result.success) {
      result.error = lastError;
      context.metrics.retryCount = attempt;
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Handler timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId);
          if (error instanceof Error) {
            reject(error);
          } else if (typeof error === 'string') {
            reject(new Error(error));
          } else {
            reject(new Error('Unknown error occurred'));
          }
        });
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create FolliCore Event Bus instance
 */
export function createEventBus(
  config?: Partial<IEventBusConfig>
): FolliCoreEventBus {
  return new FolliCoreEventBus(config);
}

/**
 * Create and initialize Event Bus with dependencies
 */
export function createInitializedEventBus(
  config?: Partial<IEventBusConfig>,
  eventStore?: IEventStore,
  auditLogger?: IAuditLogger
): FolliCoreEventBus {
  const eventBus = new FolliCoreEventBus(config);
  eventBus.initialize(eventStore, auditLogger);
  return eventBus;
}
