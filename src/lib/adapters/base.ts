import type { AdapterResult } from '@/types';

export interface HealthStatus {
  status: 'up' | 'down';
  latencyMs?: number;
}

export interface BaseAdapter<TInput, TOutput> {
  execute(input: TInput, idempotencyKey: string): Promise<AdapterResult<TOutput>>;
  checkIdempotency(key: string): Promise<TOutput | null>;
  healthCheck(): Promise<HealthStatus>;
}
