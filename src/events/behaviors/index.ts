/**
 * FolliCore Pipeline Behaviors
 *
 * MediatR-inspired middleware for Event Bus.
 * Each behavior handles cross-cutting concerns.
 *
 * @module events/behaviors
 */

import type { IDomainEvent } from '../IEvents';
import type {
  IPipelineBehavior,
  IPipelineContext,
  IAuditLogger,
} from '../IEvents';
import { isSafetyCriticalEvent } from '../DomainEvents';

// ============================================================================
// LOGGING BEHAVIOR
// ============================================================================

/**
 * Logging Pipeline Behavior
 *
 * Logs all events for debugging and audit trail
 * Priority: 10 (early in pipeline)
 */
export class LoggingBehavior implements IPipelineBehavior {
  readonly name = 'LoggingBehavior';
  readonly priority = 10;

  private readonly logger: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };

  constructor(logger?: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  }) {
    this.logger = logger ?? {
      debug: (msg, data) => {
        // eslint-disable-next-line no-console
        console.debug(`[FolliCore] ${msg}`, data ?? '');
      },
      info: (msg, data) => {
        // eslint-disable-next-line no-console
        console.info(`[FolliCore] ${msg}`, data ?? '');
      },
      warn: (msg, data) => {
        // eslint-disable-next-line no-console
        console.warn(`[FolliCore] ${msg}`, data ?? '');
      },
      error: (msg, data) => {
        // eslint-disable-next-line no-console
        console.error(`[FolliCore] ${msg}`, data ?? '');
      },
    };
  }

  async handle(
    event: IDomainEvent,
    context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();

    this.logger.debug(`Publishing event: ${event.eventType}`, {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      correlationId: context.correlationId,
    });

    try {
      await next();

      const duration = Date.now() - startTime;
      this.logger.info(`Event published: ${event.eventType}`, {
        eventId: event.eventId,
        durationMs: duration,
        correlationId: context.correlationId,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Event failed: ${event.eventType}`, {
        eventId: event.eventId,
        durationMs: duration,
        error: (error as Error).message,
        correlationId: context.correlationId,
      });
      throw error;
    }
  }
}

// ============================================================================
// VALIDATION BEHAVIOR
// ============================================================================

/**
 * Event validator function type
 */
export type EventValidator = (event: IDomainEvent) => {
  valid: boolean;
  errors: string[];
};

/**
 * Validation Pipeline Behavior
 *
 * Validates events before processing
 * Priority: 20 (after logging, before processing)
 */
export class ValidationBehavior implements IPipelineBehavior {
  readonly name = 'ValidationBehavior';
  readonly priority = 20;

  private readonly validators: Map<string, EventValidator[]>;
  private readonly globalValidators: EventValidator[];

  constructor() {
    this.validators = new Map();
    this.globalValidators = [];

    // Add default validators
    this.addGlobalValidator(this.validateRequiredFields);
    this.addGlobalValidator(this.validateMetadata);
  }

  /**
   * Add validator for specific event type
   */
  addValidator(eventType: string, validator: EventValidator): void {
    const validators = this.validators.get(eventType) ?? [];
    validators.push(validator);
    this.validators.set(eventType, validators);
  }

  /**
   * Add global validator for all events
   */
  addGlobalValidator(validator: EventValidator): void {
    this.globalValidators.push(validator);
  }

  async handle(
    event: IDomainEvent,
    _context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const errors: string[] = [];

    // Run global validators
    for (const validator of this.globalValidators) {
      const result = validator(event);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    // Run event-specific validators
    const typeValidators = this.validators.get(event.eventType) ?? [];
    for (const validator of typeValidators) {
      const result = validator(event);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Event validation failed: ${errors.join('; ')}`);
    }

    await next();
  }

  // Default validators
  private validateRequiredFields: EventValidator = (event) => {
    const errors: string[] = [];

    if (!event.eventId) {
      errors.push('eventId is required');
    }

    if (!event.eventType) {
      errors.push('eventType is required');
    }

    if (!event.aggregateId) {
      errors.push('aggregateId is required');
    }

    if (!event.aggregateType) {
      errors.push('aggregateType is required');
    }

    if (!event.timestamp) {
      errors.push('timestamp is required');
    }

    return { valid: errors.length === 0, errors };
  };

  private validateMetadata: EventValidator = (event) => {
    const errors: string[] = [];

    if (!event.metadata) {
      errors.push('metadata is required');
    } else {
      if (!event.metadata.correlationId) {
        errors.push('metadata.correlationId is required');
      }

      if (!event.metadata.source) {
        errors.push('metadata.source is required');
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

// ============================================================================
// METRICS BEHAVIOR
// ============================================================================

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Metrics Pipeline Behavior
 *
 * Collects metrics for monitoring and alerting
 * Priority: 15 (after logging, before validation)
 */
export class MetricsBehavior implements IPipelineBehavior {
  readonly name = 'MetricsBehavior';
  readonly priority = 15;

  private readonly collector: IMetricsCollector;

  constructor(collector?: IMetricsCollector) {
    this.collector = collector ?? this.createDefaultCollector();
  }

  async handle(
    event: IDomainEvent,
    _context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    const tags = {
      eventType: event.eventType,
      aggregateType: event.aggregateType,
    };

    this.collector.incrementCounter('follicore.events.published', tags);

    try {
      await next();

      const duration = Date.now() - startTime;
      this.collector.recordHistogram('follicore.events.duration_ms', duration, tags);
      this.collector.incrementCounter('follicore.events.success', tags);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.recordHistogram('follicore.events.duration_ms', duration, tags);
      this.collector.incrementCounter('follicore.events.failure', {
        ...tags,
        error: (error as Error).name,
      });
      throw error;
    }
  }

  private createDefaultCollector(): IMetricsCollector {
    // Default in-memory collector for development
    const counters = new Map<string, number>();
    const histograms = new Map<string, number[]>();

    return {
      incrementCounter: (name, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        counters.set(key, (counters.get(key) ?? 0) + 1);
      },
      recordHistogram: (name, value, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        const values = histograms.get(key) ?? [];
        values.push(value);
        histograms.set(key, values);
      },
      recordGauge: (name, value, tags) => {
        const key = `${name}:${JSON.stringify(tags ?? {})}`;
        counters.set(key, value);
      },
    };
  }
}

// ============================================================================
// AUDIT BEHAVIOR
// ============================================================================

/**
 * Audit Pipeline Behavior
 *
 * Creates HIPAA-compliant audit trail
 * Priority: 5 (first in pipeline)
 */
export class AuditBehavior implements IPipelineBehavior {
  readonly name = 'AuditBehavior';
  readonly priority = 5;

  private readonly auditLogger: IAuditLogger;

  constructor(auditLogger: IAuditLogger) {
    this.auditLogger = auditLogger;
  }

  async handle(
    event: IDomainEvent,
    context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await next();

      // Log successful publish
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        patientId: event.metadata.patientId,
        sessionId: event.metadata.sessionId,
        action: 'publish',
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: 'success',
        correlationId: context.correlationId,
        details: {
          durationMs: Date.now() - startTime,
        },
      });
    } catch (error) {
      // Log failed publish
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        patientId: event.metadata.patientId,
        sessionId: event.metadata.sessionId,
        action: 'publish',
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: 'failure',
        correlationId: context.correlationId,
        details: {
          durationMs: Date.now() - startTime,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }
}

// ============================================================================
// SAFETY-CRITICAL BEHAVIOR (TRICHOLOGY-SPECIFIC)
// ============================================================================

/**
 * Safety-Critical Pipeline Behavior
 *
 * Handles safety-critical events per CLAUDE.md Rule 1:
 * "Contraindications are absolute barriers"
 *
 * Priority: 1 (highest priority, first in pipeline)
 */
export class SafetyCriticalBehavior implements IPipelineBehavior {
  readonly name = 'SafetyCriticalBehavior';
  readonly priority = 1;

  private readonly alertHandler: (event: IDomainEvent) => Promise<void>;
  private readonly safetyCriticalEventTypes: Set<string>;

  constructor(
    alertHandler: (event: IDomainEvent) => Promise<void>,
    safetyCriticalEventTypes?: string[]
  ) {
    this.alertHandler = alertHandler;
    this.safetyCriticalEventTypes = new Set(
      safetyCriticalEventTypes ?? [
        'TREATMENT_CONTRAINDICATED',
        'CONTRAINDICATION_DETECTED',
        'SAFETY_RULE_TRIGGERED',
      ]
    );
  }

  async handle(
    event: IDomainEvent,
    context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    // Check if this is a safety-critical event
    if (
      this.safetyCriticalEventTypes.has(event.eventType) ||
      isSafetyCriticalEvent(event)
    ) {
      // Immediately trigger alert (fire-and-forget for speed)
      this.alertHandler(event).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[SafetyCriticalBehavior] Alert handler failed:', error);
      });

      // Mark in context for downstream behaviors
      context.data.set('isSafetyCriticalEvent', true);
    }

    await next();
  }
}

// ============================================================================
// RETRY BEHAVIOR
// ============================================================================

/**
 * Retry Pipeline Behavior
 *
 * Retries failed event processing with exponential backoff
 * Priority: 90 (late in pipeline, wraps handler execution)
 */
export class RetryBehavior implements IPipelineBehavior {
  readonly name = 'RetryBehavior';
  readonly priority = 90;

  private readonly maxAttempts: number;
  private readonly delayMs: number;
  private readonly backoffMultiplier: number;
  private readonly retryableErrors: Set<string>;

  constructor(options?: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  }) {
    this.maxAttempts = options?.maxAttempts ?? 3;
    this.delayMs = options?.delayMs ?? 100;
    this.backoffMultiplier = options?.backoffMultiplier ?? 2;
    this.retryableErrors = new Set(
      options?.retryableErrors ?? [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'NetworkError',
        'TimeoutError',
      ]
    );
  }

  async handle(
    _event: IDomainEvent,
    context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.maxAttempts) {
      try {
        await next();
        context.metrics.retryCount = attempt;
        return;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }

        if (attempt < this.maxAttempts) {
          const delay =
            this.delayMs * Math.pow(this.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    context.metrics.retryCount = attempt;
    throw lastError;
  }

  private isRetryable(error: Error): boolean {
    // Check error name
    if (this.retryableErrors.has(error.name)) {
      return true;
    }

    // Check error code if available
    const errorWithCode = error as Error & { code?: string };
    if (errorWithCode.code && this.retryableErrors.has(errorWithCode.code)) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// THROTTLING BEHAVIOR
// ============================================================================

/**
 * Throttling Pipeline Behavior
 *
 * Rate limits event publishing to prevent overload
 * Priority: 25 (after validation)
 */
export class ThrottlingBehavior implements IPipelineBehavior {
  readonly name = 'ThrottlingBehavior';
  readonly priority = 25;

  private readonly maxEventsPerSecond: number;
  private readonly windowMs: number;
  private eventCounts: Map<string, { count: number; resetAt: number }>;

  constructor(maxEventsPerSecond = 100) {
    this.maxEventsPerSecond = maxEventsPerSecond;
    this.windowMs = 1000;
    this.eventCounts = new Map();
  }

  async handle(
    event: IDomainEvent,
    _context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void> {
    const key = event.metadata.userId ?? 'global';
    const now = Date.now();

    // Get or create counter for this key
    let counter = this.eventCounts.get(key);
    if (!counter || now >= counter.resetAt) {
      counter = { count: 0, resetAt: now + this.windowMs };
      this.eventCounts.set(key, counter);
    }

    // Check rate limit
    if (counter.count >= this.maxEventsPerSecond) {
      const waitTime = counter.resetAt - now;
      throw new Error(`Rate limit exceeded. Try again in ${waitTime}ms`);
    }

    // Increment counter
    counter.count++;

    await next();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default pipeline behaviors
 */
export function createDefaultBehaviors(
  auditLogger?: IAuditLogger,
  metricsCollector?: IMetricsCollector
): IPipelineBehavior[] {
  const behaviors: IPipelineBehavior[] = [
    new LoggingBehavior(),
    new ValidationBehavior(),
    new MetricsBehavior(metricsCollector),
    new ThrottlingBehavior(),
  ];

  if (auditLogger) {
    behaviors.push(new AuditBehavior(auditLogger));
  }

  return behaviors.sort((a, b) => a.priority - b.priority);
}

/**
 * Create safety-aware pipeline behaviors for trichology
 */
export function createSafetyAwareBehaviors(
  alertHandler: (event: IDomainEvent) => Promise<void>,
  auditLogger?: IAuditLogger
): IPipelineBehavior[] {
  const behaviors = createDefaultBehaviors(auditLogger);
  behaviors.push(new SafetyCriticalBehavior(alertHandler));
  return behaviors.sort((a, b) => a.priority - b.priority);
}
