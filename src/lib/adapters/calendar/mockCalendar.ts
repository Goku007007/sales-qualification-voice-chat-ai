import type { BaseAdapter, HealthStatus } from '../base';
import type { CalendarInput, TimeSlot, BookingConfirmation } from './types';
import type { AdapterResult } from '@/types';
import { executeWithIdempotency, inMemoryStore } from '../idempotency';
import { withSpan } from '@/lib/tracing/spans';

export class MockCalendarAdapter implements BaseAdapter<CalendarInput, TimeSlot[]> {
  async execute(input: CalendarInput, idempotencyKey: string): Promise<AdapterResult<TimeSlot[]>> {
    return withSpan(
      'calendar_propose',
      () =>
        executeWithIdempotency(idempotencyKey, async () => {
          const start = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 400));

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);

          const nextDay = new Date(tomorrow);
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(14, 30, 0, 0);

          const results: TimeSlot[] = [
            {
              start: tomorrow.toISOString(),
              end: new Date(tomorrow.getTime() + input.durationMinutes * 60000).toISOString(),
            },
            {
              start: nextDay.toISOString(),
              end: new Date(nextDay.getTime() + input.durationMinutes * 60000).toISOString(),
            },
          ];

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
          adapter: 'mock_calendar',
          duration_minutes: input.durationMinutes,
          days_ahead: input.daysAhead,
          idempotency_key: idempotencyKey,
        },
      },
    );
  }

  async bookSlot(
    slot: TimeSlot,
    email: string,
    idempotencyKey: string,
  ): Promise<AdapterResult<BookingConfirmation>> {
    return withSpan(
      'calendar_book',
      () =>
        executeWithIdempotency(idempotencyKey, async () => {
          const start = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 300));

          return {
            success: true,
            data: {
              eventId: `CAL-${Date.now().toString().slice(-4)}`,
              meetingLink: `https://meet.mock/CAL-${Date.now().toString().slice(-4)}`,
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
          adapter: 'mock_calendar',
          attendee_email: email,
          idempotency_key: idempotencyKey,
          slot_start: slot.start,
        },
      },
    );
  }

  async checkIdempotency(key: string): Promise<TimeSlot[] | null> {
    const stored = inMemoryStore.get(key);
    if (!stored || typeof stored !== 'object') return null;
    const data = (stored as { data?: TimeSlot[] }).data;
    return Array.isArray(data) ? data : null;
  }

  async healthCheck(): Promise<HealthStatus> {
    return { status: 'up', latencyMs: 25 };
  }
}

export const calendarAdapter = new MockCalendarAdapter();
