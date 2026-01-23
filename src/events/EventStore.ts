/**
 * FolliCore Event Store Implementation
 *
 * HIPAA-compliant Event Store with:
 * - 6-year retention (45 C.F.R. § 164.530(j))
 * - Crypto-shredding for GDPR compliance
 * - Integrity verification via checksums
 * - Snapshot support for performance
 *
 * @module events
 */

import { createHash, randomUUID } from 'crypto';
import type { IDomainEvent } from './IEvents';
import type {
  IEventStore,
  IEventStoreConfig,
  IStoredEvent,
  IEventQueryOptions,
  IAggregateSnapshot,
  IAuditLogger,
  IAuditLogEntry,
  IAuditLogQueryOptions,
  AggregateType,
} from './IEvents';
import { DEFAULT_EVENT_STORE_CONFIG } from './IEvents';

// ============================================================================
// IN-MEMORY EVENT STORE
// ============================================================================

/**
 * In-Memory Event Store
 *
 * Features:
 * - Full IEventStore interface implementation
 * - HIPAA-compliant audit trail
 * - Snapshotting for aggregate performance
 * - Crypto-shredding ready (marks events as shredded)
 * - Suitable for development and testing
 *
 * Note: For production, use PostgreSQL or external event store
 */
export class InMemoryEventStore implements IEventStore {
  private readonly events: Map<string, IStoredEvent[]>;
  private readonly eventIndex: Map<string, IStoredEvent>;
  private readonly snapshots: Map<string, IAggregateSnapshot>;
  private readonly shreddedAggregates: Set<string>;
  private readonly config: IEventStoreConfig;
  private globalSequence: number;

  constructor(config: Partial<IEventStoreConfig> = {}) {
    this.events = new Map<string, IStoredEvent[]>();
    this.eventIndex = new Map<string, IStoredEvent>();
    this.snapshots = new Map<string, IAggregateSnapshot>();
    this.shreddedAggregates = new Set<string>();
    this.config = { ...DEFAULT_EVENT_STORE_CONFIG, ...config };
    this.globalSequence = 0;
  }

  /**
   * Append event to store
   */
  async append(event: IDomainEvent): Promise<IStoredEvent> {
    const aggregateId = event.aggregateId;

    // Check if aggregate is shredded
    if (this.shreddedAggregates.has(aggregateId)) {
      throw new Error(`Aggregate ${aggregateId} has been crypto-shredded`);
    }

    // Get existing events for aggregate
    const aggregateEvents = this.events.get(aggregateId) ?? [];
    const sequenceNumber = aggregateEvents.length + 1;
    this.globalSequence++;

    // Create stored event
    const storedEvent: IStoredEvent = {
      id: randomUUID(),
      sequenceNumber,
      globalSequence: this.globalSequence,
      event,
      storedAt: new Date(),
      encryptionKeyId: this.config.enableEncryption
        ? this.config.encryptionKeyId
        : undefined,
      checksum: this.calculateChecksum(event),
    };

    // Store event
    aggregateEvents.push(storedEvent);
    this.events.set(aggregateId, aggregateEvents);
    this.eventIndex.set(storedEvent.id, storedEvent);

    return storedEvent;
  }

  /**
   * Append multiple events atomically
   */
  async appendBatch(events: IDomainEvent[]): Promise<IStoredEvent[]> {
    const results: IStoredEvent[] = [];

    // Group by aggregate for atomic append
    const eventsByAggregate = new Map<string, IDomainEvent[]>();
    for (const event of events) {
      const aggregateEvents = eventsByAggregate.get(event.aggregateId) ?? [];
      aggregateEvents.push(event);
      eventsByAggregate.set(event.aggregateId, aggregateEvents);
    }

    // Append each group
    for (const [aggregateId, aggregateEvents] of eventsByAggregate) {
      if (this.shreddedAggregates.has(aggregateId)) {
        throw new Error(`Aggregate ${aggregateId} has been crypto-shredded`);
      }

      for (const event of aggregateEvents) {
        const stored = await this.append(event);
        results.push(stored);
      }
    }

    return results;
  }

  /**
   * Get events by aggregate ID
   */
  async getEvents(
    aggregateId: string,
    fromVersion?: number
  ): Promise<IStoredEvent[]> {
    if (this.shreddedAggregates.has(aggregateId)) {
      return []; // Return empty for shredded aggregates
    }

    const events = this.events.get(aggregateId) ?? [];

    if (fromVersion !== undefined) {
      return events.filter((e) => e.sequenceNumber > fromVersion);
    }

    return [...events];
  }

  /**
   * Query events with filters
   */
  async queryEvents(options: IEventQueryOptions): Promise<IStoredEvent[]> {
    let results: IStoredEvent[] = [];

    // Collect all events
    if (options.aggregateId) {
      const events = this.events.get(options.aggregateId);
      if (events && !this.shreddedAggregates.has(options.aggregateId)) {
        results = [...events];
      }
    } else {
      // Get all non-shredded events
      for (const [aggregateId, events] of this.events) {
        if (!this.shreddedAggregates.has(aggregateId)) {
          results.push(...events);
        }
      }
    }

    // Apply filters
    if (options.aggregateType) {
      results = results.filter(
        (e) => e.event.aggregateType === options.aggregateType
      );
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      results = results.filter((e) =>
        options.eventTypes?.includes(e.event.eventType)
      );
    }

    if (options.userId) {
      results = results.filter(
        (e) => e.event.metadata.userId === options.userId
      );
    }

    if (options.patientId) {
      results = results.filter(
        (e) => e.event.metadata.patientId === options.patientId
      );
    }

    if (options.fromTimestamp) {
      const fromTs = options.fromTimestamp;
      results = results.filter((e) => e.storedAt >= fromTs);
    }

    if (options.toTimestamp) {
      const toTs = options.toTimestamp;
      results = results.filter((e) => e.storedAt <= toTs);
    }

    if (options.fromSequence !== undefined) {
      const fromSeq = options.fromSequence;
      results = results.filter((e) => e.globalSequence >= fromSeq);
    }

    // Sort
    if (options.order === 'desc') {
      results.sort((a, b) => b.globalSequence - a.globalSequence);
    } else {
      results.sort((a, b) => a.globalSequence - b.globalSequence);
    }

    // Pagination
    const offset = options.offset ?? 0;
    const limit = Math.min(
      options.limit ?? this.config.maxEventsPerQuery,
      this.config.maxEventsPerQuery
    );

    return results.slice(offset, offset + limit);
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: string,
    options?: Partial<IEventQueryOptions>
  ): Promise<IStoredEvent[]> {
    return this.queryEvents({
      ...options,
      eventTypes: [eventType],
    });
  }

  /**
   * Create snapshot for aggregate
   */
  async createSnapshot<TState>(
    aggregateId: string,
    aggregateType: AggregateType,
    state: TState,
    version: number
  ): Promise<IAggregateSnapshot<TState>> {
    const snapshot: IAggregateSnapshot<TState> = {
      aggregateId,
      aggregateType,
      version,
      state,
      createdAt: new Date(),
      checksum: this.calculateChecksum(state),
    };

    this.snapshots.set(aggregateId, snapshot as IAggregateSnapshot);

    return snapshot;
  }

  /**
   * Get latest snapshot for aggregate
   */
  async getSnapshot<TState>(
    aggregateId: string
  ): Promise<IAggregateSnapshot<TState> | null> {
    if (this.shreddedAggregates.has(aggregateId)) {
      return null;
    }

    const snapshot = this.snapshots.get(aggregateId);
    return (snapshot as IAggregateSnapshot<TState>) ?? null;
  }

  /**
   * Get event count for aggregate
   */
  async getEventCount(aggregateId: string): Promise<number> {
    if (this.shreddedAggregates.has(aggregateId)) {
      return 0;
    }

    return this.events.get(aggregateId)?.length ?? 0;
  }

  /**
   * Get global event count
   */
  async getTotalEventCount(): Promise<number> {
    return this.globalSequence;
  }

  /**
   * Crypto-shred aggregate (GDPR compliance)
   *
   * Note: In a real implementation with encryption, this would
   * destroy the encryption keys, making events unreadable.
   * In this in-memory version, we mark the aggregate as shredded.
   */
  async cryptoShred(aggregateId: string): Promise<number> {
    const events = this.events.get(aggregateId);
    const count = events?.length ?? 0;

    // Mark as shredded (in real impl, destroy encryption keys)
    this.shreddedAggregates.add(aggregateId);

    // Remove snapshot
    this.snapshots.delete(aggregateId);

    return count;
  }

  /**
   * Archive old events
   *
   * Note: In production, this would move events to cold storage.
   * In this in-memory version, we just return the count.
   */
  async archiveEvents(beforeDate: Date): Promise<number> {
    let archivedCount = 0;

    for (const [aggregateId, events] of this.events) {
      if (this.shreddedAggregates.has(aggregateId)) {
        continue;
      }

      const oldEvents = events.filter((e) => e.storedAt < beforeDate);
      archivedCount += oldEvents.length;

      // In production, move to cold storage
      // For in-memory, we keep them but could mark as archived
    }

    return archivedCount;
  }

  /**
   * Verify event integrity
   */
  async verifyIntegrity(eventId: string): Promise<boolean> {
    const storedEvent = this.eventIndex.get(eventId);
    if (!storedEvent) {
      return false;
    }

    const calculatedChecksum = this.calculateChecksum(storedEvent.event);
    return calculatedChecksum === storedEvent.checksum;
  }

  // ============================================================================
  // ADDITIONAL METHODS
  // ============================================================================

  /**
   * Get all aggregate IDs
   */
  getAllAggregateIds(): string[] {
    return Array.from(this.events.keys()).filter(
      (id) => !this.shreddedAggregates.has(id)
    );
  }

  /**
   * Get event by ID
   */
  getEventById(eventId: string): IStoredEvent | null {
    return this.eventIndex.get(eventId) ?? null;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.events.clear();
    this.eventIndex.clear();
    this.snapshots.clear();
    this.shreddedAggregates.clear();
    this.globalSequence = 0;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEvents: number;
    totalAggregates: number;
    totalSnapshots: number;
    shreddedAggregates: number;
  } {
    return {
      totalEvents: this.globalSequence,
      totalAggregates: this.events.size,
      totalSnapshots: this.snapshots.size,
      shreddedAggregates: this.shreddedAggregates.size,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(data: unknown): string {
    const json = JSON.stringify(data);
    return createHash('sha256').update(json).digest('hex');
  }
}

// ============================================================================
// AUDIT LOGGER IMPLEMENTATION
// ============================================================================

/**
 * In-Memory Audit Logger
 *
 * HIPAA-compliant audit logging for event operations
 * Retention: 6 years (2190 days) per 45 C.F.R. § 164.530(j)
 */
export class InMemoryAuditLogger implements IAuditLogger {
  private readonly entries: Map<string, IAuditLogEntry>;
  private readonly retentionDays: number;

  constructor(retentionDays = 2190) {
    this.entries = new Map();
    this.retentionDays = retentionDays;
  }

  /**
   * Log audit entry
   */
  async log(entry: Omit<IAuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: IAuditLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date(),
    };

    this.entries.set(fullEntry.id, fullEntry);
  }

  /**
   * Query audit logs
   */
  async query(options: IAuditLogQueryOptions): Promise<IAuditLogEntry[]> {
    let results = Array.from(this.entries.values());

    // Apply filters
    if (options.userId) {
      results = results.filter((e) => e.userId === options.userId);
    }

    if (options.patientId) {
      results = results.filter((e) => e.patientId === options.patientId);
    }

    if (options.eventType) {
      results = results.filter((e) => e.eventType === options.eventType);
    }

    if (options.action) {
      results = results.filter((e) => e.action === options.action);
    }

    if (options.outcome) {
      results = results.filter((e) => e.outcome === options.outcome);
    }

    if (options.fromTimestamp) {
      const fromTs = options.fromTimestamp;
      results = results.filter((e) => e.timestamp >= fromTs);
    }

    if (options.toTimestamp) {
      const toTs = options.toTimestamp;
      results = results.filter((e) => e.timestamp <= toTs);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 1000;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit log count
   */
  async count(options?: Partial<IAuditLogQueryOptions>): Promise<number> {
    if (!options) {
      return this.entries.size;
    }

    const results = await this.query(options as IAuditLogQueryOptions);
    return results.length;
  }

  /**
   * Export audit logs for compliance reporting
   */
  async export(options: IAuditLogQueryOptions): Promise<string> {
    const results = await this.query(options);

    // Export as NDJSON (Newline Delimited JSON) for compliance
    return results.map((entry) => JSON.stringify(entry)).join('\n');
  }

  /**
   * Clear old entries based on retention policy
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    let removedCount = 0;
    for (const [id, entry] of this.entries) {
      if (entry.timestamp < cutoffDate) {
        this.entries.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get total entry count
   */
  getEntryCount(): number {
    return this.entries.size;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create In-Memory Event Store
 */
export function createInMemoryEventStore(
  config?: Partial<IEventStoreConfig>
): InMemoryEventStore {
  return new InMemoryEventStore(config);
}

/**
 * Create In-Memory Audit Logger
 */
export function createInMemoryAuditLogger(
  retentionDays?: number
): InMemoryAuditLogger {
  return new InMemoryAuditLogger(retentionDays);
}
