import type { BaseAdapter, HealthStatus } from '../base';
import type { CRMLeadInput, CRMRecordOutput } from './types';
import type { AdapterResult } from '@/types';
import { executeWithIdempotency, inMemoryStore } from '../idempotency';
import { withSpan } from '@/lib/tracing/spans';

export class MockCRMAdapter implements BaseAdapter<CRMLeadInput, CRMRecordOutput> {
  async execute(
    input: CRMLeadInput,
    idempotencyKey: string,
  ): Promise<AdapterResult<CRMRecordOutput>> {
    return withSpan(
      'crm_upsert',
      () =>
        executeWithIdempotency(idempotencyKey, async () => {
          const start = performance.now();

          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 500));

          const isUpdate = inMemoryStore.has(`crm_lead_${input.sessionId}`);
          inMemoryStore.set(`crm_lead_${input.sessionId}`, true);

          const durationMs = Math.round(performance.now() - start);

          return {
            success: true,
            data: {
              externalId: `mock-crm-${input.sessionId}-${Date.now().toString().slice(-4)}`,
              url: `https://crm.mock/leads/${input.sessionId}`,
              status: isUpdate ? 'updated' : 'created',
            },
            metadata: {
              idempotencyKey,
              durationMs,
              retryCount: 0,
              timestamp: new Date().toISOString(),
            },
          };
        }),
      {
        namespace: 'adapters',
        attributes: {
          adapter: 'mock_crm',
          session_id: input.sessionId,
          idempotency_key: idempotencyKey,
        },
      },
    );
  }

  async checkIdempotency(key: string): Promise<CRMRecordOutput | null> {
    const stored = inMemoryStore.get(key);
    if (!stored || typeof stored !== 'object') return null;
    return (stored as { data?: CRMRecordOutput }).data ?? null;
  }

  async healthCheck(): Promise<HealthStatus> {
    return { status: 'up', latencyMs: 50 };
  }
}

export const crmAdapter = new MockCRMAdapter();
