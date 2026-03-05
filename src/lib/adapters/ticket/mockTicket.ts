import type { BaseAdapter, HealthStatus } from '../base';
import type { TicketInput, TicketOutput } from './types';
import type { AdapterResult } from '@/types';
import { executeWithIdempotency, inMemoryStore } from '../idempotency';
import { withSpan } from '@/lib/tracing/spans';

export class MockTicketAdapter implements BaseAdapter<TicketInput[], TicketOutput[]> {
  async execute(
    tickets: TicketInput[],
    idempotencyKey: string,
  ): Promise<AdapterResult<TicketOutput[]>> {
    return withSpan(
      'ticket_create',
      () =>
        executeWithIdempotency(idempotencyKey, async () => {
          const start = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 300));

          const results = tickets.map((_, idx) => ({
            ticketId: `TICK-${Date.now().toString().slice(-4)}-${idx}`,
            url: `https://tickets.mock/TICK-${Date.now().toString().slice(-4)}`,
            status: 'open' as const,
          }));

          const durationMs = Math.round(performance.now() - start);

          return {
            success: true,
            data: results,
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
          adapter: 'mock_ticket',
          ticket_count: tickets.length,
          session_id: tickets[0]?.sessionId ?? 'unknown',
          idempotency_key: idempotencyKey,
        },
      },
    );
  }

  async checkIdempotency(key: string): Promise<TicketOutput[] | null> {
    const stored = inMemoryStore.get(key);
    if (!stored || typeof stored !== 'object') return null;
    const data = (stored as { data?: TicketOutput[] }).data;
    return Array.isArray(data) ? data : null;
  }

  async healthCheck(): Promise<HealthStatus> {
    return { status: 'up', latencyMs: 20 };
  }
}

export const ticketAdapter = new MockTicketAdapter();
