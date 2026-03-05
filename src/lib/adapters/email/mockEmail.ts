import type { BaseAdapter, HealthStatus } from '../base';
import type { EmailInput, EmailOutput } from './types';
import type { AdapterResult } from '@/types';
import { executeWithIdempotency, inMemoryStore } from '../idempotency';
import { withSpan } from '@/lib/tracing/spans';

export class MockEmailAdapter implements BaseAdapter<EmailInput, EmailOutput> {
  async execute(input: EmailInput, idempotencyKey: string): Promise<AdapterResult<EmailOutput>> {
    return withSpan(
      'email_send',
      () =>
        executeWithIdempotency(idempotencyKey, async () => {
          const start = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 200));

          return {
            success: true,
            data: {
              messageId: `MSG-${Date.now().toString().slice(-4)}`,
            },
            metadata: {
              idempotencyKey,
              durationMs: Math.round(performance.now() - start),
              retryCount: 0,
              timestamp: new Date().toISOString(),
            },
          };
        }),
      {
        namespace: 'adapters',
        attributes: {
          adapter: 'mock_email',
          subject: input.subject,
          idempotency_key: idempotencyKey,
        },
      },
    );
  }

  async checkIdempotency(key: string): Promise<EmailOutput | null> {
    const stored = inMemoryStore.get(key);
    if (!stored || typeof stored !== 'object') return null;
    return (stored as { data?: EmailOutput }).data ?? null;
  }

  async healthCheck(): Promise<HealthStatus> {
    return { status: 'up', latencyMs: 15 };
  }
}

export const emailAdapter = new MockEmailAdapter();
