/**
 * FolliCore EventStore Tests
 *
 * Comprehensive test suite for InMemoryEventStore and InMemoryAuditLogger.
 * Achieves 80%+ branch coverage for IEC 62304 compliance.
 *
 * Test Categories:
 * 1. Event Store - append, query, snapshots
 * 2. GDPR Compliance - crypto-shredding, retention
 * 3. Integrity Verification - checksums
 * 4. Audit Logger - logging, querying, export
 *
 * @see IEC 62304 Class B: Event Store is not safety-critical
 */

import {
  InMemoryEventStore,
  InMemoryAuditLogger,
  createInMemoryEventStore,
  createInMemoryAuditLogger,
} from '../EventStore';
import type {
  IDomainEvent,
  IEventQueryOptions,
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
  eventType: string,
  aggregateId = 'test-aggregate-1',
  overrides: Partial<IDomainEvent> = {}
): IDomainEvent {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
    eventType,
    aggregateId,
    aggregateType: 'TestAggregate',
    timestamp: new Date(),
    version: 1,
    payload: { data: 'test' },
    metadata: createEventMetadata('test', {
      userId: 'test_user',
      patientId: 'test_patient',
      sessionId: 'test_session',
    }),
    ...overrides,
  };
}

/**
 * Create multiple test events
 */
function createTestEvents(count: number, aggregateId?: string): IDomainEvent[] {
  return Array.from({ length: count }, (_, i) =>
    createTestEvent(`EVENT_TYPE_${i}`, aggregateId ?? `agg_${i}`)
  );
}

/**
 * Wait helper
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// IN-MEMORY EVENT STORE TESTS
// ============================================================================

describe('InMemoryEventStore', () => {
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
  });

  afterEach(() => {
    eventStore.clear();
  });

  // ==========================================================================
  // CONSTRUCTION
  // ==========================================================================

  describe('Construction', () => {
    it('should create with default configuration', () => {
      const store = new InMemoryEventStore();
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create with custom configuration', () => {
      const store = new InMemoryEventStore({
        enableEncryption: true,
        encryptionKeyId: 'test-key',
        maxEventsPerQuery: 500,
      });
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create via factory function', () => {
      const store = createInMemoryEventStore();
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create via factory with config', () => {
      const store = createInMemoryEventStore({ maxEventsPerQuery: 100 });
      expect(store).toBeInstanceOf(InMemoryEventStore);
    });
  });

  // ==========================================================================
  // APPEND EVENTS
  // ==========================================================================

  describe('Append Events', () => {
    it('should append single event', async () => {
      const event = createTestEvent('TEST_EVENT');
      const stored = await eventStore.append(event);

      expect(stored.id).toBeDefined();
      expect(stored.sequenceNumber).toBe(1);
      expect(stored.globalSequence).toBe(1);
      expect(stored.event).toBe(event);
      expect(stored.storedAt).toBeInstanceOf(Date);
      expect(stored.checksum).toBeDefined();
    });

    it('should increment sequence numbers', async () => {
      const aggregateId = 'agg-1';
      const e1 = createTestEvent('E1', aggregateId);
      const e2 = createTestEvent('E2', aggregateId);
      const e3 = createTestEvent('E3', aggregateId);

      const s1 = await eventStore.append(e1);
      const s2 = await eventStore.append(e2);
      const s3 = await eventStore.append(e3);

      expect(s1.sequenceNumber).toBe(1);
      expect(s2.sequenceNumber).toBe(2);
      expect(s3.sequenceNumber).toBe(3);

      expect(s1.globalSequence).toBe(1);
      expect(s2.globalSequence).toBe(2);
      expect(s3.globalSequence).toBe(3);
    });

    it('should append events to different aggregates', async () => {
      const e1 = createTestEvent('E1', 'agg-1');
      const e2 = createTestEvent('E2', 'agg-2');

      const s1 = await eventStore.append(e1);
      const s2 = await eventStore.append(e2);

      // Each aggregate has its own sequence
      expect(s1.sequenceNumber).toBe(1);
      expect(s2.sequenceNumber).toBe(1);

      // Global sequence is shared
      expect(s1.globalSequence).toBe(1);
      expect(s2.globalSequence).toBe(2);
    });

    it('should include encryption key ID when enabled', async () => {
      const store = new InMemoryEventStore({
        enableEncryption: true,
        encryptionKeyId: 'key-123',
      });

      const event = createTestEvent('ENCRYPTED_EVENT');
      const stored = await store.append(event);

      expect(stored.encryptionKeyId).toBe('key-123');
    });

    it('should not include encryption key ID when disabled', async () => {
      const store = new InMemoryEventStore({ enableEncryption: false });
      const event = createTestEvent('UNENCRYPTED_EVENT');
      const stored = await store.append(event);

      expect(stored.encryptionKeyId).toBeUndefined();
    });

    it('should reject append to crypto-shredded aggregate', async () => {
      const aggregateId = 'shred-test';
      await eventStore.append(createTestEvent('E1', aggregateId));
      await eventStore.cryptoShred(aggregateId);

      await expect(
        eventStore.append(createTestEvent('E2', aggregateId))
      ).rejects.toThrow('has been crypto-shredded');
    });
  });

  // ==========================================================================
  // APPEND BATCH
  // ==========================================================================

  describe('Append Batch', () => {
    it('should append multiple events atomically', async () => {
      const events = createTestEvents(3, 'batch-agg');
      const stored = await eventStore.appendBatch(events);

      expect(stored.length).toBe(3);
      expect(stored[0]?.sequenceNumber).toBe(1);
      expect(stored[1]?.sequenceNumber).toBe(2);
      expect(stored[2]?.sequenceNumber).toBe(3);
    });

    it('should handle events for multiple aggregates', async () => {
      const events = [
        createTestEvent('E1', 'agg-a'),
        createTestEvent('E2', 'agg-b'),
        createTestEvent('E3', 'agg-a'),
      ];

      const stored = await eventStore.appendBatch(events);

      expect(stored.length).toBe(3);
      // agg-a gets sequences 1, 2
      // agg-b gets sequence 1
    });

    it('should reject batch with crypto-shredded aggregate', async () => {
      await eventStore.append(createTestEvent('E1', 'shred-batch'));
      await eventStore.cryptoShred('shred-batch');

      await expect(
        eventStore.appendBatch([createTestEvent('E2', 'shred-batch')])
      ).rejects.toThrow('has been crypto-shredded');
    });
  });

  // ==========================================================================
  // GET EVENTS
  // ==========================================================================

  describe('Get Events', () => {
    it('should get all events for aggregate', async () => {
      const aggregateId = 'get-test';
      await eventStore.append(createTestEvent('E1', aggregateId));
      await eventStore.append(createTestEvent('E2', aggregateId));
      await eventStore.append(createTestEvent('E3', aggregateId));

      const events = await eventStore.getEvents(aggregateId);

      expect(events.length).toBe(3);
    });

    it('should get events from specific version', async () => {
      const aggregateId = 'version-test';
      await eventStore.append(createTestEvent('E1', aggregateId));
      await eventStore.append(createTestEvent('E2', aggregateId));
      await eventStore.append(createTestEvent('E3', aggregateId));

      const events = await eventStore.getEvents(aggregateId, 1);

      expect(events.length).toBe(2);
      expect(events[0]?.event.eventType).toBe('E2');
      expect(events[1]?.event.eventType).toBe('E3');
    });

    it('should return empty array for non-existent aggregate', async () => {
      const events = await eventStore.getEvents('non-existent');
      expect(events).toEqual([]);
    });

    it('should return empty array for crypto-shredded aggregate', async () => {
      const aggregateId = 'shred-get';
      await eventStore.append(createTestEvent('E1', aggregateId));
      await eventStore.cryptoShred(aggregateId);

      const events = await eventStore.getEvents(aggregateId);
      expect(events).toEqual([]);
    });

    it('should return copy of events (not reference)', async () => {
      const aggregateId = 'copy-test';
      await eventStore.append(createTestEvent('E1', aggregateId));

      const events1 = await eventStore.getEvents(aggregateId);
      const events2 = await eventStore.getEvents(aggregateId);

      expect(events1).not.toBe(events2);
    });
  });

  // ==========================================================================
  // QUERY EVENTS
  // ==========================================================================

  describe('Query Events', () => {
    beforeEach(async () => {
      // Setup test data
      await eventStore.append(
        createTestEvent('ORDER_CREATED', 'order-1', {
          aggregateType: 'Order',
          metadata: createEventMetadata('test', {
            userId: 'user-1',
            patientId: 'patient-1',
          }),
        })
      );
      await eventStore.append(
        createTestEvent('ORDER_SHIPPED', 'order-1', {
          aggregateType: 'Order',
          metadata: createEventMetadata('test', {
            userId: 'user-1',
            patientId: 'patient-1',
          }),
        })
      );
      await eventStore.append(
        createTestEvent('ITEM_ADDED', 'cart-1', {
          aggregateType: 'Cart',
          metadata: createEventMetadata('test', {
            userId: 'user-2',
            patientId: 'patient-2',
          }),
        })
      );
    });

    it('should query by aggregate ID', async () => {
      const events = await eventStore.queryEvents({ aggregateId: 'order-1' });
      expect(events.length).toBe(2);
    });

    it('should query by aggregate type', async () => {
      const events = await eventStore.queryEvents({ aggregateType: 'Order' });
      expect(events.length).toBe(2);
    });

    it('should query by event types', async () => {
      const events = await eventStore.queryEvents({
        eventTypes: ['ORDER_CREATED'],
      });
      expect(events.length).toBe(1);
    });

    it('should query by multiple event types', async () => {
      const events = await eventStore.queryEvents({
        eventTypes: ['ORDER_CREATED', 'ORDER_SHIPPED'],
      });
      expect(events.length).toBe(2);
    });

    it('should query by user ID', async () => {
      const events = await eventStore.queryEvents({ userId: 'user-1' });
      expect(events.length).toBe(2);
    });

    it('should query by patient ID', async () => {
      const events = await eventStore.queryEvents({ patientId: 'patient-2' });
      expect(events.length).toBe(1);
    });

    it('should query by timestamp range', async () => {
      const fromTimestamp = new Date(Date.now() - 1000);
      const toTimestamp = new Date(Date.now() + 1000);

      const events = await eventStore.queryEvents({
        fromTimestamp,
        toTimestamp,
      });

      expect(events.length).toBe(3);
    });

    it('should query from sequence number', async () => {
      const events = await eventStore.queryEvents({ fromSequence: 2 });
      expect(events.length).toBe(2);
    });

    it('should sort ascending by default', async () => {
      const events = await eventStore.queryEvents({});

      expect(events[0]?.globalSequence).toBe(1);
      expect(events[2]?.globalSequence).toBe(3);
    });

    it('should sort descending when specified', async () => {
      const events = await eventStore.queryEvents({ order: 'desc' });

      expect(events[0]?.globalSequence).toBe(3);
      expect(events[2]?.globalSequence).toBe(1);
    });

    it('should apply pagination offset', async () => {
      const events = await eventStore.queryEvents({ offset: 1 });
      expect(events.length).toBe(2);
      expect(events[0]?.globalSequence).toBe(2);
    });

    it('should apply pagination limit', async () => {
      const events = await eventStore.queryEvents({ limit: 2 });
      expect(events.length).toBe(2);
    });

    it('should respect max events per query config', async () => {
      const store = new InMemoryEventStore({ maxEventsPerQuery: 2 });
      await store.appendBatch(createTestEvents(5, 'limit-test'));

      const events = await store.queryEvents({});
      expect(events.length).toBe(2);
    });

    it('should not return events from crypto-shredded aggregates', async () => {
      await eventStore.cryptoShred('order-1');

      const events = await eventStore.queryEvents({});
      expect(events.length).toBe(1);
      expect(events[0]?.event.eventType).toBe('ITEM_ADDED');
    });

    it('should return empty for shredded aggregate query', async () => {
      await eventStore.cryptoShred('order-1');

      const events = await eventStore.queryEvents({ aggregateId: 'order-1' });
      expect(events.length).toBe(0);
    });
  });

  // ==========================================================================
  // GET EVENTS BY TYPE
  // ==========================================================================

  describe('Get Events By Type', () => {
    it('should get events by type', async () => {
      await eventStore.append(createTestEvent('TYPE_A', 'agg-1'));
      await eventStore.append(createTestEvent('TYPE_B', 'agg-2'));
      await eventStore.append(createTestEvent('TYPE_A', 'agg-3'));

      const events = await eventStore.getEventsByType('TYPE_A');

      expect(events.length).toBe(2);
    });

    it('should support additional query options', async () => {
      await eventStore.append(createTestEvent('TYPE_A', 'agg-1'));
      await eventStore.append(createTestEvent('TYPE_A', 'agg-2'));

      const events = await eventStore.getEventsByType('TYPE_A', { limit: 1 });

      expect(events.length).toBe(1);
    });
  });

  // ==========================================================================
  // SNAPSHOTS
  // ==========================================================================

  describe('Snapshots', () => {
    it('should create snapshot', async () => {
      interface TestState {
        count: number;
        name: string;
      }

      const state: TestState = { count: 5, name: 'test' };
      const snapshot = await eventStore.createSnapshot<TestState>(
        'snap-agg',
        'TestAggregate',
        state,
        10
      );

      expect(snapshot.aggregateId).toBe('snap-agg');
      expect(snapshot.aggregateType).toBe('TestAggregate');
      expect(snapshot.version).toBe(10);
      expect(snapshot.state).toEqual(state);
      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.checksum).toBeDefined();
    });

    it('should get snapshot', async () => {
      const state = { value: 42 };
      await eventStore.createSnapshot('snap-get', 'TestAggregate', state, 5);

      const snapshot = await eventStore.getSnapshot<{ value: number }>(
        'snap-get'
      );

      expect(snapshot?.state.value).toBe(42);
      expect(snapshot?.version).toBe(5);
    });

    it('should return null for non-existent snapshot', async () => {
      const snapshot = await eventStore.getSnapshot('non-existent');
      expect(snapshot).toBeNull();
    });

    it('should return null for crypto-shredded aggregate snapshot', async () => {
      await eventStore.createSnapshot(
        'snap-shred',
        'TestAggregate',
        { data: 'secret' },
        1
      );
      await eventStore.cryptoShred('snap-shred');

      const snapshot = await eventStore.getSnapshot('snap-shred');
      expect(snapshot).toBeNull();
    });

    it('should overwrite existing snapshot', async () => {
      await eventStore.createSnapshot('snap-over', 'TestAggregate', { v: 1 }, 1);
      await eventStore.createSnapshot('snap-over', 'TestAggregate', { v: 2 }, 2);

      const snapshot = await eventStore.getSnapshot<{ v: number }>('snap-over');
      expect(snapshot?.state.v).toBe(2);
      expect(snapshot?.version).toBe(2);
    });
  });

  // ==========================================================================
  // EVENT COUNTS
  // ==========================================================================

  describe('Event Counts', () => {
    it('should get event count for aggregate', async () => {
      await eventStore.append(createTestEvent('E1', 'count-agg'));
      await eventStore.append(createTestEvent('E2', 'count-agg'));

      const count = await eventStore.getEventCount('count-agg');
      expect(count).toBe(2);
    });

    it('should return 0 for non-existent aggregate', async () => {
      const count = await eventStore.getEventCount('non-existent');
      expect(count).toBe(0);
    });

    it('should return 0 for crypto-shredded aggregate', async () => {
      await eventStore.append(createTestEvent('E1', 'shred-count'));
      await eventStore.cryptoShred('shred-count');

      const count = await eventStore.getEventCount('shred-count');
      expect(count).toBe(0);
    });

    it('should get total event count', async () => {
      await eventStore.append(createTestEvent('E1', 'agg-1'));
      await eventStore.append(createTestEvent('E2', 'agg-2'));
      await eventStore.append(createTestEvent('E3', 'agg-1'));

      const total = await eventStore.getTotalEventCount();
      expect(total).toBe(3);
    });
  });

  // ==========================================================================
  // CRYPTO-SHREDDING (GDPR)
  // ==========================================================================

  describe('Crypto-Shredding (GDPR)', () => {
    it('should crypto-shred aggregate', async () => {
      await eventStore.append(createTestEvent('E1', 'gdpr-test'));
      await eventStore.append(createTestEvent('E2', 'gdpr-test'));

      const count = await eventStore.cryptoShred('gdpr-test');

      expect(count).toBe(2);
    });

    it('should delete snapshot on shred', async () => {
      await eventStore.createSnapshot(
        'shred-snap',
        'TestAggregate',
        { data: 'test' },
        1
      );
      await eventStore.cryptoShred('shred-snap');

      const snapshot = await eventStore.getSnapshot('shred-snap');
      expect(snapshot).toBeNull();
    });

    it('should return 0 for non-existent aggregate', async () => {
      const count = await eventStore.cryptoShred('non-existent');
      expect(count).toBe(0);
    });

    it('should prevent future appends to shredded aggregate', async () => {
      await eventStore.cryptoShred('prevent-append');

      await expect(
        eventStore.append(createTestEvent('E1', 'prevent-append'))
      ).rejects.toThrow('crypto-shredded');
    });

    it('should hide shredded aggregate in getAllAggregateIds', async () => {
      await eventStore.append(createTestEvent('E1', 'visible'));
      await eventStore.append(createTestEvent('E2', 'hidden'));
      await eventStore.cryptoShred('hidden');

      const ids = eventStore.getAllAggregateIds();
      expect(ids).toContain('visible');
      expect(ids).not.toContain('hidden');
    });
  });

  // ==========================================================================
  // ARCHIVE EVENTS
  // ==========================================================================

  describe('Archive Events', () => {
    it('should count events to archive', async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago

      // Create events with past storedAt (we need to manipulate for test)
      await eventStore.append(createTestEvent('E1', 'archive-test'));

      const futureDate = new Date(Date.now() + 86400000);
      const archivedCount = await eventStore.archiveEvents(futureDate);

      expect(archivedCount).toBe(1);
    });

    it('should not count events after cutoff', async () => {
      await eventStore.append(createTestEvent('E1', 'archive-test'));

      const pastDate = new Date(Date.now() - 86400000);
      const archivedCount = await eventStore.archiveEvents(pastDate);

      expect(archivedCount).toBe(0);
    });

    it('should skip shredded aggregates', async () => {
      await eventStore.append(createTestEvent('E1', 'archive-shred'));
      await eventStore.cryptoShred('archive-shred');

      const futureDate = new Date(Date.now() + 86400000);
      const archivedCount = await eventStore.archiveEvents(futureDate);

      expect(archivedCount).toBe(0);
    });
  });

  // ==========================================================================
  // INTEGRITY VERIFICATION
  // ==========================================================================

  describe('Integrity Verification', () => {
    it('should verify valid event integrity', async () => {
      const stored = await eventStore.append(createTestEvent('VERIFY_TEST'));

      const isValid = await eventStore.verifyIntegrity(stored.id);

      expect(isValid).toBe(true);
    });

    it('should return false for non-existent event', async () => {
      const isValid = await eventStore.verifyIntegrity('non-existent-id');

      expect(isValid).toBe(false);
    });
  });

  // ==========================================================================
  // ADDITIONAL METHODS
  // ==========================================================================

  describe('Additional Methods', () => {
    it('should get all aggregate IDs', async () => {
      await eventStore.append(createTestEvent('E1', 'agg-a'));
      await eventStore.append(createTestEvent('E2', 'agg-b'));
      await eventStore.append(createTestEvent('E3', 'agg-c'));

      const ids = eventStore.getAllAggregateIds();

      expect(ids).toContain('agg-a');
      expect(ids).toContain('agg-b');
      expect(ids).toContain('agg-c');
      expect(ids.length).toBe(3);
    });

    it('should get event by ID', async () => {
      const stored = await eventStore.append(createTestEvent('GET_BY_ID'));

      const event = eventStore.getEventById(stored.id);

      expect(event).toBe(stored);
    });

    it('should return null for non-existent event ID', () => {
      const event = eventStore.getEventById('non-existent');
      expect(event).toBeNull();
    });

    it('should clear all data', async () => {
      await eventStore.append(createTestEvent('E1', 'clear-test'));
      await eventStore.createSnapshot('clear-test', 'TestAggregate', {}, 1);
      await eventStore.cryptoShred('shred-clear');

      eventStore.clear();

      const stats = eventStore.getStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalAggregates).toBe(0);
      expect(stats.totalSnapshots).toBe(0);
      expect(stats.shreddedAggregates).toBe(0);
    });

    it('should get statistics', async () => {
      await eventStore.append(createTestEvent('E1', 'stats-1'));
      await eventStore.append(createTestEvent('E2', 'stats-2'));
      await eventStore.createSnapshot('stats-1', 'TestAggregate', {}, 1);
      await eventStore.cryptoShred('stats-2');

      const stats = eventStore.getStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.totalAggregates).toBe(2);
      expect(stats.totalSnapshots).toBe(1);
      expect(stats.shreddedAggregates).toBe(1);
    });
  });
});

// ============================================================================
// IN-MEMORY AUDIT LOGGER TESTS
// ============================================================================

describe('InMemoryAuditLogger', () => {
  let auditLogger: InMemoryAuditLogger;

  beforeEach(() => {
    auditLogger = new InMemoryAuditLogger();
  });

  afterEach(() => {
    auditLogger.clear();
  });

  // ==========================================================================
  // CONSTRUCTION
  // ==========================================================================

  describe('Construction', () => {
    it('should create with default retention', () => {
      const logger = new InMemoryAuditLogger();
      expect(logger).toBeInstanceOf(InMemoryAuditLogger);
    });

    it('should create with custom retention', () => {
      const logger = new InMemoryAuditLogger(365);
      expect(logger).toBeInstanceOf(InMemoryAuditLogger);
    });

    it('should create via factory function', () => {
      const logger = createInMemoryAuditLogger();
      expect(logger).toBeInstanceOf(InMemoryAuditLogger);
    });

    it('should create via factory with retention', () => {
      const logger = createInMemoryAuditLogger(30);
      expect(logger).toBeInstanceOf(InMemoryAuditLogger);
    });
  });

  // ==========================================================================
  // LOG ENTRIES
  // ==========================================================================

  describe('Log Entries', () => {
    it('should log audit entry', async () => {
      await auditLogger.log({
        eventType: 'TEST_EVENT',
        eventId: 'evt-1',
        userId: 'user-1',
        action: 'publish',
        resource: 'event/test',
        outcome: 'success',
      });

      expect(auditLogger.getEntryCount()).toBe(1);
    });

    it('should assign ID and timestamp automatically', async () => {
      await auditLogger.log({
        eventType: 'TEST_EVENT',
        eventId: 'evt-1',
        action: 'publish',
        resource: 'event/test',
        outcome: 'success',
      });

      const entries = await auditLogger.query({});
      expect(entries[0]?.id).toBeDefined();
      expect(entries[0]?.timestamp).toBeInstanceOf(Date);
    });

    it('should log multiple entries', async () => {
      await auditLogger.log({
        eventType: 'E1',
        eventId: 'evt-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'E2',
        eventId: 'evt-2',
        action: 'publish',
        resource: 'r2',
        outcome: 'failure',
      });

      expect(auditLogger.getEntryCount()).toBe(2);
    });

    it('should include all optional fields', async () => {
      await auditLogger.log({
        eventType: 'FULL_ENTRY',
        eventId: 'evt-full',
        userId: 'user-1',
        patientId: 'patient-1',
        sessionId: 'session-1',
        action: 'publish',
        resource: 'event/full',
        outcome: 'success',
        correlationId: 'corr-1',
        details: { extra: 'data' },
      });

      const entries = await auditLogger.query({});
      expect(entries[0]?.userId).toBe('user-1');
      expect(entries[0]?.patientId).toBe('patient-1');
      expect(entries[0]?.sessionId).toBe('session-1');
      expect(entries[0]?.correlationId).toBe('corr-1');
      expect(entries[0]?.details).toEqual({ extra: 'data' });
    });
  });

  // ==========================================================================
  // QUERY ENTRIES
  // ==========================================================================

  describe('Query Entries', () => {
    beforeEach(async () => {
      await auditLogger.log({
        eventType: 'ORDER_EVENT',
        eventId: 'evt-1',
        userId: 'user-1',
        patientId: 'patient-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'CART_EVENT',
        eventId: 'evt-2',
        userId: 'user-2',
        patientId: 'patient-2',
        action: 'subscribe',
        resource: 'r2',
        outcome: 'failure',
      });
      await auditLogger.log({
        eventType: 'ORDER_EVENT',
        eventId: 'evt-3',
        userId: 'user-1',
        patientId: 'patient-1',
        action: 'publish',
        resource: 'r3',
        outcome: 'success',
      });
    });

    it('should query all entries', async () => {
      const entries = await auditLogger.query({});
      expect(entries.length).toBe(3);
    });

    it('should query by user ID', async () => {
      const entries = await auditLogger.query({ userId: 'user-1' });
      expect(entries.length).toBe(2);
    });

    it('should query by patient ID', async () => {
      const entries = await auditLogger.query({ patientId: 'patient-2' });
      expect(entries.length).toBe(1);
    });

    it('should query by event type', async () => {
      const entries = await auditLogger.query({ eventType: 'ORDER_EVENT' });
      expect(entries.length).toBe(2);
    });

    it('should query by action', async () => {
      const entries = await auditLogger.query({ action: 'subscribe' });
      expect(entries.length).toBe(1);
    });

    it('should query by outcome', async () => {
      const entries = await auditLogger.query({ outcome: 'success' });
      expect(entries.length).toBe(2);
    });

    it('should query by timestamp range', async () => {
      const fromTimestamp = new Date(Date.now() - 1000);
      const toTimestamp = new Date(Date.now() + 1000);

      const entries = await auditLogger.query({ fromTimestamp, toTimestamp });
      expect(entries.length).toBe(3);
    });

    it('should sort by timestamp descending', async () => {
      // Create a fresh logger to control timestamps precisely
      const freshLogger = new InMemoryAuditLogger();

      // Add entries with delays to ensure different timestamps
      await freshLogger.log({
        eventType: 'E1',
        eventId: 'first',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });

      await wait(5); // Small delay to ensure different timestamp

      await freshLogger.log({
        eventType: 'E2',
        eventId: 'second',
        action: 'publish',
        resource: 'r2',
        outcome: 'success',
      });

      const entries = await freshLogger.query({});

      // Most recent first (descending order)
      expect(entries.length).toBe(2);
      expect(entries[0]?.eventId).toBe('second');
      expect(entries[1]?.eventId).toBe('first');
    });

    it('should apply pagination offset', async () => {
      const entries = await auditLogger.query({ offset: 1 });
      expect(entries.length).toBe(2);
    });

    it('should apply pagination limit', async () => {
      const entries = await auditLogger.query({ limit: 2 });
      expect(entries.length).toBe(2);
    });

    it('should combine multiple filters', async () => {
      const entries = await auditLogger.query({
        userId: 'user-1',
        outcome: 'success',
      });
      expect(entries.length).toBe(2);
    });
  });

  // ==========================================================================
  // COUNT ENTRIES
  // ==========================================================================

  describe('Count Entries', () => {
    beforeEach(async () => {
      await auditLogger.log({
        eventType: 'E1',
        eventId: 'evt-1',
        userId: 'user-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'E2',
        eventId: 'evt-2',
        userId: 'user-2',
        action: 'publish',
        resource: 'r2',
        outcome: 'failure',
      });
    });

    it('should count all entries without options', async () => {
      const count = await auditLogger.count();
      expect(count).toBe(2);
    });

    it('should count with filter options', async () => {
      const count = await auditLogger.count({ userId: 'user-1' });
      expect(count).toBe(1);
    });
  });

  // ==========================================================================
  // EXPORT ENTRIES
  // ==========================================================================

  describe('Export Entries', () => {
    it('should export as NDJSON', async () => {
      await auditLogger.log({
        eventType: 'EXPORT_TEST',
        eventId: 'evt-export',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });

      const exported = await auditLogger.export({});

      const lines = exported.split('\n');
      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0] ?? '{}');
      expect(parsed.eventType).toBe('EXPORT_TEST');
    });

    it('should export multiple entries', async () => {
      await auditLogger.log({
        eventType: 'E1',
        eventId: 'evt-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'E2',
        eventId: 'evt-2',
        action: 'publish',
        resource: 'r2',
        outcome: 'success',
      });

      const exported = await auditLogger.export({});

      const lines = exported.split('\n');
      expect(lines.length).toBe(2);
    });

    it('should export with filters', async () => {
      await auditLogger.log({
        eventType: 'KEEP',
        eventId: 'evt-1',
        userId: 'user-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'SKIP',
        eventId: 'evt-2',
        userId: 'user-2',
        action: 'publish',
        resource: 'r2',
        outcome: 'success',
      });

      const exported = await auditLogger.export({ userId: 'user-1' });

      const lines = exported.split('\n');
      expect(lines.length).toBe(1);
      expect(JSON.parse(lines[0] ?? '{}').eventType).toBe('KEEP');
    });
  });

  // ==========================================================================
  // CLEANUP (RETENTION)
  // ==========================================================================

  describe('Cleanup (Retention)', () => {
    it('should cleanup old entries', async () => {
      // Create logger with very short retention (0 days = immediate cleanup)
      const shortRetentionLogger = new InMemoryAuditLogger(0);

      await shortRetentionLogger.log({
        eventType: 'OLD_EVENT',
        eventId: 'evt-old',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });

      // Wait a moment to ensure timestamp is in the past relative to cutoff
      await wait(10);

      const removed = await shortRetentionLogger.cleanup();

      expect(removed).toBe(1);
      expect(shortRetentionLogger.getEntryCount()).toBe(0);
    });

    it('should keep recent entries', async () => {
      // Default retention is 2190 days (6 years)
      await auditLogger.log({
        eventType: 'RECENT_EVENT',
        eventId: 'evt-recent',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });

      const removed = await auditLogger.cleanup();

      expect(removed).toBe(0);
      expect(auditLogger.getEntryCount()).toBe(1);
    });
  });

  // ==========================================================================
  // CLEAR AND UTILITY
  // ==========================================================================

  describe('Clear and Utility', () => {
    it('should clear all entries', async () => {
      await auditLogger.log({
        eventType: 'E1',
        eventId: 'evt-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });
      await auditLogger.log({
        eventType: 'E2',
        eventId: 'evt-2',
        action: 'publish',
        resource: 'r2',
        outcome: 'success',
      });

      auditLogger.clear();

      expect(auditLogger.getEntryCount()).toBe(0);
    });

    it('should get entry count', async () => {
      expect(auditLogger.getEntryCount()).toBe(0);

      await auditLogger.log({
        eventType: 'E1',
        eventId: 'evt-1',
        action: 'publish',
        resource: 'r1',
        outcome: 'success',
      });

      expect(auditLogger.getEntryCount()).toBe(1);
    });
  });
});
