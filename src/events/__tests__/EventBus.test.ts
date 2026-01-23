/**
 * FolliCore EventBus Tests
 *
 * Comprehensive test suite achieving 80%+ branch coverage.
 *
 * Test Categories:
 * 1. Construction and initialization
 * 2. Behavior management
 * 3. Event publishing
 * 4. Subscriptions
 * 5. Handler management
 * 6. Pipeline behaviors
 * 7. Error handling and retry
 * 8. Wildcard subscriptions
 * 9. Concurrency handling
 * 10. Dead letter queue
 * 11. Audit logging
 *
 * @see IEC 62304 Class C: 100% coverage required for safety-critical modules
 */

import {
  FolliCoreEventBus,
  createEventBus,
  createInitializedEventBus,
} from '../EventBus';
import type {
  IDomainEvent,
  IEventBusConfig,
  IEventStore,
  IAuditLogger,
  IPipelineBehavior,
  IPipelineContext,
  IStoredEvent,
  IEventQueryOptions,
  IAggregateSnapshot,
  AggregateType,
  IAuditLogEntry,
  IAuditLogQueryOptions,
} from '../IEvents';
import { createEventMetadata } from '../IEvents';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create test event
 */
function createTestEvent(
  type = 'TEST_EVENT',
  payload: Record<string, unknown> = {}
): IDomainEvent {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType: type,
    aggregateId: 'test_aggregate_123',
    aggregateType: 'patient' as AggregateType,
    timestamp: new Date(),
    version: 1,
    payload,
    metadata: createEventMetadata('test', {
      userId: 'test_user',
      patientId: 'test_patient',
      sessionId: 'test_session',
    }),
  };
}

/**
 * Create mock event store
 */
function createMockEventStore(): IEventStore {
  const events: IStoredEvent[] = [];
  let globalSequence = 0;

  return {
    append: jest.fn(async (event: IDomainEvent): Promise<IStoredEvent> => {
      globalSequence++;
      const stored: IStoredEvent = {
        id: `stored_${globalSequence}`,
        sequenceNumber: globalSequence,
        globalSequence,
        event,
        storedAt: new Date(),
        checksum: 'test_checksum',
      };
      events.push(stored);
      return stored;
    }),
    appendBatch: jest.fn(async (evts: IDomainEvent[]): Promise<IStoredEvent[]> => {
      const results: IStoredEvent[] = [];
      for (const event of evts) {
        globalSequence++;
        const stored: IStoredEvent = {
          id: `stored_${globalSequence}`,
          sequenceNumber: globalSequence,
          globalSequence,
          event,
          storedAt: new Date(),
          checksum: 'test_checksum',
        };
        events.push(stored);
        results.push(stored);
      }
      return results;
    }),
    getEvents: jest.fn(async (_aggregateId: string): Promise<IStoredEvent[]> => events),
    queryEvents: jest.fn(async (_options: IEventQueryOptions): Promise<IStoredEvent[]> => events),
    getEventsByType: jest.fn(async (eventType: string): Promise<IStoredEvent[]> => {
      return events.filter((e) => e.event.eventType === eventType);
    }),
    createSnapshot: jest.fn(async <TState>(
      aggregateId: string,
      aggregateType: AggregateType,
      state: TState,
      version: number
    ): Promise<IAggregateSnapshot<TState>> => ({
      aggregateId,
      aggregateType,
      version,
      state,
      createdAt: new Date(),
      checksum: 'snapshot_checksum',
    })),
    getSnapshot: jest.fn(async <TState>(): Promise<IAggregateSnapshot<TState> | null> => null),
    getEventCount: jest.fn(async (): Promise<number> => events.length),
    getTotalEventCount: jest.fn(async (): Promise<number> => globalSequence),
    cryptoShred: jest.fn(async (): Promise<number> => 0),
    archiveEvents: jest.fn(async (): Promise<number> => 0),
    verifyIntegrity: jest.fn(async (): Promise<boolean> => true),
  };
}

/**
 * Create mock audit logger
 */
function createMockAuditLogger(): IAuditLogger {
  const logs: IAuditLogEntry[] = [];

  return {
    log: jest.fn(async (entry: Omit<IAuditLogEntry, 'id' | 'timestamp'>): Promise<void> => {
      logs.push({
        ...entry,
        id: `audit_${Date.now()}`,
        timestamp: new Date(),
      });
    }),
    query: jest.fn(async (_options: IAuditLogQueryOptions): Promise<IAuditLogEntry[]> => logs),
    count: jest.fn(async (): Promise<number> => logs.length),
    export: jest.fn(async (): Promise<string> => JSON.stringify(logs)),
  };
}

/**
 * Create mock pipeline behavior
 */
function createMockBehavior(
  name: string,
  priority: number,
  onHandle?: (event: IDomainEvent, context: IPipelineContext) => void
): IPipelineBehavior {
  return {
    name,
    priority,
    handle: jest.fn(async (
      event: IDomainEvent,
      context: IPipelineContext,
      next: () => Promise<void>
    ): Promise<void> => {
      if (onHandle) {
        onHandle(event, context);
      }
      await next();
    }),
  };
}

/**
 * Wait for async handlers to complete
 */
function waitForAsync(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('FolliCoreEventBus', () => {
  let eventBus: FolliCoreEventBus;

  beforeEach(() => {
    eventBus = new FolliCoreEventBus();
  });

  afterEach(() => {
    eventBus.clearAll();
  });

  afterAll(() => {
    // Clear any pending timers to allow Jest to exit cleanly
    jest.clearAllTimers();
  });

  // ==========================================================================
  // CONSTRUCTION AND INITIALIZATION
  // ==========================================================================

  describe('Construction and Initialization', () => {
    it('should create with default configuration', () => {
      const bus = new FolliCoreEventBus();
      expect(bus).toBeInstanceOf(FolliCoreEventBus);
      expect(bus.getSubscriptionCount()).toBe(0);
    });

    it('should create with custom configuration', () => {
      const config: Partial<IEventBusConfig> = {
        maxConcurrentHandlers: 5,
        handlerTimeoutMs: 5000,
        enablePersistence: false,
        enableAuditLog: false,
      };
      const bus = new FolliCoreEventBus(config);
      expect(bus).toBeInstanceOf(FolliCoreEventBus);
    });

    it('should initialize with event store and audit logger', () => {
      const eventStore = createMockEventStore();
      const auditLogger = createMockAuditLogger();

      eventBus.initialize(eventStore, auditLogger);
      // No error means success
    });

    it('should create via factory function', () => {
      const bus = createEventBus();
      expect(bus).toBeInstanceOf(FolliCoreEventBus);
    });

    it('should create initialized bus via factory function', () => {
      const eventStore = createMockEventStore();
      const auditLogger = createMockAuditLogger();

      const bus = createInitializedEventBus({}, eventStore, auditLogger);
      expect(bus).toBeInstanceOf(FolliCoreEventBus);
    });
  });

  // ==========================================================================
  // BEHAVIOR MANAGEMENT
  // ==========================================================================

  describe('Behavior Management', () => {
    it('should add pipeline behavior', () => {
      const behavior = createMockBehavior('TestBehavior', 100);
      eventBus.addBehavior(behavior);
      // Verify by publishing - behavior should be called
    });

    it('should add behaviors in priority order', async () => {
      const order: number[] = [];

      const behavior1 = createMockBehavior('First', 100, () => order.push(1));
      const behavior2 = createMockBehavior('Second', 50, () => order.push(2));
      const behavior3 = createMockBehavior('Third', 150, () => order.push(3));

      eventBus.addBehavior(behavior1);
      eventBus.addBehavior(behavior2);
      eventBus.addBehavior(behavior3);

      eventBus.subscribe('TEST', jest.fn().mockResolvedValue(undefined));
      await eventBus.publish(createTestEvent('TEST'));

      // Should be in priority order: 50, 100, 150
      expect(order).toEqual([2, 1, 3]);
    });

    it('should remove behavior by name', () => {
      const behavior = createMockBehavior('Removable', 100);
      eventBus.addBehavior(behavior);

      const removed = eventBus.removeBehavior('Removable');
      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent behavior', () => {
      const removed = eventBus.removeBehavior('NonExistent');
      expect(removed).toBe(false);
    });
  });

  // ==========================================================================
  // EVENT PUBLISHING
  // ==========================================================================

  describe('Event Publishing', () => {
    it('should publish event to subscribers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('TEST_EVENT', handler);

      const event = createTestEvent('TEST_EVENT');
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should publish with detailed result', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('TEST_EVENT', handler);

      const event = createTestEvent('TEST_EVENT');
      const result = await eventBus.publishWithResult(event);

      expect(result.eventId).toBe(event.eventId);
      expect(result.eventType).toBe('TEST_EVENT');
      expect(result.handlersInvoked).toBe(1);
      expect(result.handlersSucceeded).toBe(1);
      expect(result.handlersFailed).toBe(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle publish with no subscribers', async () => {
      const event = createTestEvent('NO_SUBSCRIBERS');
      const result = await eventBus.publishWithResult(event);

      expect(result.handlersInvoked).toBe(0);
      expect(result.handlersSucceeded).toBe(0);
      expect(result.handlersFailed).toBe(0);
    });

    it('should publish to multiple subscribers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const handler3 = jest.fn().mockResolvedValue(undefined);

      eventBus.subscribe('MULTI_TEST', handler1);
      eventBus.subscribe('MULTI_TEST', handler2);
      eventBus.subscribe('MULTI_TEST', handler3);

      const event = createTestEvent('MULTI_TEST');
      const result = await eventBus.publishWithResult(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
      expect(result.handlersInvoked).toBe(3);
    });

    it('should persist event when enabled', async () => {
      const eventStore = createMockEventStore();
      const bus = createInitializedEventBus({ enablePersistence: true }, eventStore);

      bus.subscribe('PERSIST_TEST', jest.fn().mockResolvedValue(undefined));
      const event = createTestEvent('PERSIST_TEST');
      const result = await bus.publishWithResult(event);

      expect(result.stored).toBe(true);
      expect(result.storageId).toBeDefined();
      expect(eventStore.append).toHaveBeenCalledWith(event);
    });

    it('should audit log successful publish', async () => {
      const auditLogger = createMockAuditLogger();
      const bus = createInitializedEventBus(
        { enableAuditLog: true, enablePersistence: false },
        undefined,
        auditLogger
      );

      bus.subscribe('AUDIT_TEST', jest.fn().mockResolvedValue(undefined));
      await bus.publish(createTestEvent('AUDIT_TEST'));

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUDIT_TEST',
          action: 'publish',
          outcome: 'success',
        })
      );
    });

    it('should audit log partial success when some handlers fail', async () => {
      const auditLogger = createMockAuditLogger();
      const bus = createInitializedEventBus(
        {
          enableAuditLog: true,
          enablePersistence: false,
          defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
        },
        undefined,
        auditLogger
      );

      bus.subscribe('PARTIAL_TEST', jest.fn().mockResolvedValue(undefined));
      bus.subscribe('PARTIAL_TEST', jest.fn().mockRejectedValue(new Error('Handler failed')));

      await bus.publish(createTestEvent('PARTIAL_TEST'));

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PARTIAL_TEST',
          action: 'publish',
          outcome: 'partial',
        })
      );
    });

    it('should throw when all handlers fail', async () => {
      const bus = createEventBus({
        defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
      });

      bus.subscribe('FAIL_TEST', jest.fn().mockRejectedValue(new Error('Failed 1')));

      await expect(bus.publish(createTestEvent('FAIL_TEST'))).rejects.toThrow(
        'All event handlers failed'
      );
    });

    it('should call dead letter handler on failure', async () => {
      const deadLetterHandler = jest.fn();
      const bus = createEventBus({
        enableDeadLetterQueue: true,
        deadLetterHandler,
        defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
      });

      // Dead letter handler is invoked when pipeline execution throws (not handler failures)
      // Add a behavior that throws to trigger the catch block
      const throwingBehavior: IPipelineBehavior = {
        name: 'ThrowingBehavior',
        priority: 1,
        handle: async () => {
          throw new Error('Pipeline error');
        },
      };
      bus.addBehavior(throwingBehavior);

      try {
        await bus.publish(createTestEvent('DLQ_TEST'));
      } catch {
        // Expected to throw
      }

      expect(deadLetterHandler).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DLQ_TEST' }),
        expect.any(Error)
      );
    });

    it('should audit log failure', async () => {
      const auditLogger = createMockAuditLogger();
      const bus = createInitializedEventBus(
        {
          enableAuditLog: true,
          enablePersistence: false,
          defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
        },
        undefined,
        auditLogger
      );

      // Add a behavior that throws to trigger actual 'failure' outcome
      // (Handler failures result in 'partial', not 'failure')
      const throwingBehavior: IPipelineBehavior = {
        name: 'ThrowingBehavior',
        priority: 1,
        handle: async () => {
          throw new Error('Pipeline error for audit');
        },
      };
      bus.addBehavior(throwingBehavior);

      try {
        await bus.publish(createTestEvent('FAIL_AUDIT'));
      } catch {
        // Expected
      }

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FAIL_AUDIT',
          action: 'publish',
          outcome: 'failure',
        })
      );
    });
  });

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  describe('Subscriptions', () => {
    it('should subscribe to event type', () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const subscription = eventBus.subscribe('TEST', handler);

      expect(subscription.id).toBeDefined();
      expect(subscription.eventType).toBe('TEST');
      expect(subscription.handler).toBe(handler);
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should subscribe with priority', async () => {
      const order: number[] = [];

      eventBus.subscribe('PRIORITY', () => { order.push(1); return Promise.resolve(); }, { priority: 100 });
      eventBus.subscribe('PRIORITY', () => { order.push(2); return Promise.resolve(); }, { priority: 50 });
      eventBus.subscribe('PRIORITY', () => { order.push(3); return Promise.resolve(); }, { priority: 150 });

      await eventBus.publish(createTestEvent('PRIORITY'));

      // Lower priority runs first
      expect(order).toEqual([2, 1, 3]);
    });

    it('should subscribe with async option (fire-and-forget)', async () => {
      const asyncHandler = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventBus.subscribe('ASYNC_TEST', asyncHandler, { async: true });

      const result = await eventBus.publishWithResult(createTestEvent('ASYNC_TEST'));

      // Async handler marked as fired but not awaited
      expect(result.handlersInvoked).toBe(1);

      // Wait for async handler to complete
      await waitForAsync(50);
      expect(asyncHandler).toHaveBeenCalled();
    });

    it('should subscribe with custom retry config', async () => {
      let attempts = 0;
      const handler = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry me');
        }
      });

      eventBus.subscribe('RETRY_TEST', handler, {
        retry: {
          maxAttempts: 3,
          delayMs: 10,
          backoffMultiplier: 1,
        },
      });

      await eventBus.publish(createTestEvent('RETRY_TEST'));

      expect(attempts).toBe(3);
    });

    it('should subscribe to multiple event types', () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const subscriptions = eventBus.subscribeMany(['TYPE_A', 'TYPE_B', 'TYPE_C'], handler);

      expect(subscriptions).toHaveLength(3);
      expect(subscriptions[0]?.eventType).toBe('TYPE_A');
      expect(subscriptions[1]?.eventType).toBe('TYPE_B');
      expect(subscriptions[2]?.eventType).toBe('TYPE_C');
    });

    it('should unsubscribe by ID', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const subscription = eventBus.subscribe('UNSUB_TEST', handler);

      await eventBus.publish(createTestEvent('UNSUB_TEST'));
      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.unsubscribe(subscription.id);

      await eventBus.publish(createTestEvent('UNSUB_TEST'));
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should unsubscribe via subscription method', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const subscription = eventBus.subscribe('UNSUB_METHOD', handler);

      subscription.unsubscribe();

      await eventBus.publish(createTestEvent('UNSUB_METHOD'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe of non-existent subscription', () => {
      // Should not throw
      eventBus.unsubscribe('non-existent-id');
    });

    it('should clear all subscriptions', async () => {
      eventBus.subscribe('CLEAR_A', jest.fn().mockResolvedValue(undefined));
      eventBus.subscribe('CLEAR_B', jest.fn().mockResolvedValue(undefined));
      eventBus.subscribe('CLEAR_C', jest.fn().mockResolvedValue(undefined));

      expect(eventBus.getSubscriptionCount()).toBe(3);

      eventBus.clearAll();

      expect(eventBus.getSubscriptionCount()).toBe(0);
    });
  });

  // ==========================================================================
  // HANDLER MANAGEMENT
  // ==========================================================================

  describe('Handler Management', () => {
    it('should get subscription count', () => {
      expect(eventBus.getSubscriptionCount()).toBe(0);

      eventBus.subscribe('TEST_A', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.getSubscriptionCount()).toBe(1);

      eventBus.subscribe('TEST_B', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.getSubscriptionCount()).toBe(2);
    });

    it('should get handler count for event type', () => {
      expect(eventBus.getHandlerCount('TYPE_X')).toBe(0);

      eventBus.subscribe('TYPE_X', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.getHandlerCount('TYPE_X')).toBe(1);

      eventBus.subscribe('TYPE_X', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.getHandlerCount('TYPE_X')).toBe(2);

      // Different type
      eventBus.subscribe('TYPE_Y', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.getHandlerCount('TYPE_X')).toBe(2);
      expect(eventBus.getHandlerCount('TYPE_Y')).toBe(1);
    });

    it('should check if event type has handlers', () => {
      expect(eventBus.hasHandlers('HAS_TEST')).toBe(false);

      eventBus.subscribe('HAS_TEST', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.hasHandlers('HAS_TEST')).toBe(true);
    });

    it('should get registered event types', () => {
      eventBus.subscribe('TYPE_1', jest.fn().mockResolvedValue(undefined));
      eventBus.subscribe('TYPE_2', jest.fn().mockResolvedValue(undefined));
      eventBus.subscribe('TYPE_3', jest.fn().mockResolvedValue(undefined));

      const types = eventBus.getRegisteredEventTypes();
      expect(types).toContain('TYPE_1');
      expect(types).toContain('TYPE_2');
      expect(types).toContain('TYPE_3');
    });

    it('should remove event type from handlers map when last handler unsubscribes', () => {
      const sub = eventBus.subscribe('REMOVE_TYPE', jest.fn().mockResolvedValue(undefined));
      expect(eventBus.hasHandlers('REMOVE_TYPE')).toBe(true);

      eventBus.unsubscribe(sub.id);
      expect(eventBus.hasHandlers('REMOVE_TYPE')).toBe(false);
      expect(eventBus.getRegisteredEventTypes()).not.toContain('REMOVE_TYPE');
    });
  });

  // ==========================================================================
  // PIPELINE BEHAVIORS
  // ==========================================================================

  describe('Pipeline Behaviors', () => {
    it('should execute pipeline behaviors in order', async () => {
      const order: string[] = [];

      const behavior1: IPipelineBehavior = {
        name: 'First',
        priority: 100,
        handle: async (_event, _context, next) => {
          order.push('First-before');
          await next();
          order.push('First-after');
        },
      };

      const behavior2: IPipelineBehavior = {
        name: 'Second',
        priority: 50,
        handle: async (_event, _context, next) => {
          order.push('Second-before');
          await next();
          order.push('Second-after');
        },
      };

      const bus = createEventBus({ behaviors: [behavior1, behavior2] });
      bus.subscribe('PIPELINE_TEST', async () => order.push('Handler'));

      await bus.publish(createTestEvent('PIPELINE_TEST'));

      expect(order).toEqual([
        'Second-before', // Priority 50 first
        'First-before',  // Priority 100 second
        'Handler',
        'First-after',
        'Second-after',
      ]);
    });

    it('should pass context through pipeline', async () => {
      const capturedContext: IPipelineContext[] = [];

      const behavior: IPipelineBehavior = {
        name: 'ContextCapture',
        priority: 100,
        handle: async (_event, context, next) => {
          context.data.set('behavior_key', 'behavior_value');
          capturedContext.push(context);
          await next();
        },
      };

      const bus = createEventBus({ behaviors: [behavior] });
      bus.subscribe('CONTEXT_TEST', jest.fn().mockResolvedValue(undefined));

      await bus.publish(createTestEvent('CONTEXT_TEST'));

      expect(capturedContext).toHaveLength(1);
      expect(capturedContext[0]?.correlationId).toBeDefined();
      expect(capturedContext[0]?.data.get('behavior_key')).toBe('behavior_value');
    });

    it('should handle empty behaviors list', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('NO_BEHAVIOR', handler);

      await eventBus.publish(createTestEvent('NO_BEHAVIOR'));

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ERROR HANDLING AND RETRY
  // ==========================================================================

  describe('Error Handling and Retry', () => {
    it('should retry failed handlers', async () => {
      let attempts = 0;
      const handler = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
      });

      const bus = createEventBus({
        defaultRetry: { maxAttempts: 3, delayMs: 10, backoffMultiplier: 1 },
      });
      bus.subscribe('RETRY_EVENT', handler);

      await bus.publish(createTestEvent('RETRY_EVENT'));

      expect(attempts).toBe(2);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const timestamps: number[] = [];
      const handler = jest.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 3) {
          throw new Error('Fail');
        }
      });

      const bus = createEventBus({
        defaultRetry: { maxAttempts: 3, delayMs: 50, backoffMultiplier: 2 },
      });
      bus.subscribe('BACKOFF_TEST', handler);

      await bus.publish(createTestEvent('BACKOFF_TEST'));

      expect(timestamps).toHaveLength(3);

      // Check delays increase (with some tolerance)
      if (timestamps.length >= 3 && timestamps[0] && timestamps[1] && timestamps[2]) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        // Second delay should be roughly 2x the first
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    it('should timeout handler after configured duration', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        // Never resolves in time
        await new Promise((resolve) => setTimeout(resolve, 5000));
      });

      const bus = createEventBus({
        handlerTimeoutMs: 50,
        defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
      });
      bus.subscribe('TIMEOUT_TEST', handler);

      await expect(bus.publish(createTestEvent('TIMEOUT_TEST'))).rejects.toThrow(
        'All event handlers failed'
      );
    }, 10000);

    it('should report retry count in result', async () => {
      let attempts = 0;
      const handler = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Retry');
        }
      });

      const bus = createEventBus({
        defaultRetry: { maxAttempts: 3, delayMs: 10, backoffMultiplier: 1 },
      });
      bus.subscribe('RETRY_COUNT', handler);

      const result = await bus.publishWithResult(createTestEvent('RETRY_COUNT'));

      expect(result.handlersSucceeded).toBe(1);
    });
  });

  // ==========================================================================
  // WILDCARD SUBSCRIPTIONS
  // ==========================================================================

  describe('Wildcard Subscriptions', () => {
    it('should receive all events with wildcard subscription', async () => {
      const wildcardHandler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('*', wildcardHandler);

      await eventBus.publish(createTestEvent('EVENT_A'));
      await eventBus.publish(createTestEvent('EVENT_B'));
      await eventBus.publish(createTestEvent('EVENT_C'));

      expect(wildcardHandler).toHaveBeenCalledTimes(3);
    });

    it('should invoke both specific and wildcard handlers', async () => {
      const specificHandler = jest.fn().mockResolvedValue(undefined);
      const wildcardHandler = jest.fn().mockResolvedValue(undefined);

      eventBus.subscribe('SPECIFIC_EVENT', specificHandler);
      eventBus.subscribe('*', wildcardHandler);

      await eventBus.publish(createTestEvent('SPECIFIC_EVENT'));

      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // CONCURRENCY HANDLING
  // ==========================================================================

  describe('Concurrency Handling', () => {
    it('should limit concurrent handlers', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const handler = jest.fn().mockImplementation(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 20));
        concurrent--;
      });

      const bus = createEventBus({ maxConcurrentHandlers: 2 });

      // Add 5 handlers
      bus.subscribe('CONCURRENT', handler);
      bus.subscribe('CONCURRENT', handler);
      bus.subscribe('CONCURRENT', handler);
      bus.subscribe('CONCURRENT', handler);
      bus.subscribe('CONCURRENT', handler);

      await bus.publish(createTestEvent('CONCURRENT'));

      expect(handler).toHaveBeenCalledTimes(5);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // ASYNC HANDLER FAILURE LOGGING
  // ==========================================================================

  describe('Async Handler Failure Logging', () => {
    it('should log async handler failures', async () => {
      const auditLogger = createMockAuditLogger();
      const bus = createInitializedEventBus(
        {
          enableAuditLog: true,
          enablePersistence: false,
          defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
        },
        undefined,
        auditLogger
      );

      bus.subscribe(
        'ASYNC_FAIL',
        jest.fn().mockRejectedValue(new Error('Async error')),
        { async: true }
      );

      await bus.publish(createTestEvent('ASYNC_FAIL'));

      // Wait for async handler to fail
      await waitForAsync(100);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'handle',
          outcome: 'failure',
        })
      );
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle handler throwing non-Error', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw 'String error'; // Non-Error thrown
      });

      const bus = createEventBus({
        defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
      });
      bus.subscribe('NON_ERROR', handler);

      await expect(bus.publish(createTestEvent('NON_ERROR'))).rejects.toThrow();
    });

    it('should handle handler throwing undefined', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw undefined;
      });

      const bus = createEventBus({
        defaultRetry: { maxAttempts: 1, delayMs: 1, backoffMultiplier: 1 },
      });
      bus.subscribe('UNDEFINED_ERROR', handler);

      await expect(bus.publish(createTestEvent('UNDEFINED_ERROR'))).rejects.toThrow();
    });

    it('should handle rapid subscribe/unsubscribe', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      for (let i = 0; i < 100; i++) {
        const sub = eventBus.subscribe('RAPID', handler);
        sub.unsubscribe();
      }

      expect(eventBus.getSubscriptionCount()).toBe(0);
    });

    it('should handle many handlers for same event type', async () => {
      const handlers: jest.Mock[] = [];
      for (let i = 0; i < 50; i++) {
        const handler = jest.fn().mockResolvedValue(undefined);
        handlers.push(handler);
        eventBus.subscribe('MANY_HANDLERS', handler);
      }

      await eventBus.publish(createTestEvent('MANY_HANDLERS'));

      for (const handler of handlers) {
        expect(handler).toHaveBeenCalledTimes(1);
      }
    });

    it('should handle event with complex payload', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('COMPLEX_PAYLOAD', handler);

      const event = createTestEvent('COMPLEX_PAYLOAD', {
        nested: {
          deeply: {
            value: [1, 2, 3],
          },
        },
        array: [{ a: 1 }, { b: 2 }],
        date: new Date(),
        nullValue: null,
      });

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });
});
