import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockCRMAdapter } from '@/lib/adapters/crm/mockCRM';
import { inMemoryStore } from '@/lib/adapters/idempotency';

const baseInput = {
  sessionId: 'ses_001',
  industry: 'saas',
  score: 80,
  fields: { budget_range: '$50k+' },
};

describe('MockCRMAdapter', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a new lead record', async () => {
    const adapter = new MockCRMAdapter();
    const pending = adapter.execute(baseInput, 'key-001');
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('created');
    expect(result.data?.externalId).toContain('mock-crm-ses_001');
  });

  it('updates existing lead for same session with different idempotency key', async () => {
    const adapter = new MockCRMAdapter();

    const firstPending = adapter.execute(baseInput, 'key-001');
    await vi.runAllTimersAsync();
    const first = await firstPending;

    const secondPending = adapter.execute(
      { ...baseInput, score: 90, fields: { budget_range: '$100k+' } },
      'key-002',
    );
    await vi.runAllTimersAsync();
    const second = await secondPending;

    expect(first.data?.status).toBe('created');
    expect(second.data?.status).toBe('updated');
  });

  it('returns cached result for duplicate idempotency key', async () => {
    const adapter = new MockCRMAdapter();

    const firstPending = adapter.execute(baseInput, 'dup-key');
    await vi.runAllTimersAsync();
    const first = await firstPending;

    const second = await adapter.execute(
      { ...baseInput, score: 5, fields: { budget_range: null } },
      'dup-key',
    );

    expect(second).toEqual(first);
    expect(second.metadata.idempotencyKey).toBe('dup-key');
  });
});
