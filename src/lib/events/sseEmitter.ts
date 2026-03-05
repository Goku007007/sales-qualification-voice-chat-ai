import { eventBus } from './eventBus';
import type { SSEResponseEvent } from './types';
import { ulid } from 'ulid';

interface SSEEnvelope {
  id: string;
  type: SSEResponseEvent['type'];
  payload: SSEResponseEvent['payload'];
  timestamp: string;
}

export class SSEEmitter {
  /**
   * Broadcast an event to a specific session's listeners
   */
  emit(sessionId: string, event: SSEResponseEvent) {
    const sseFormat = {
      id: ulid(),
      type: event.type,
      payload: event.payload,
      timestamp: new Date().toISOString(),
    };

    eventBus.emit(`session:${sessionId}`, sseFormat);
  }

  /**
   * Subscribe to events for a specific session
   * Returns an async generator for ReadableStream consumption
   */
  async *subscribe(sessionId: string) {
    const eventName = `session:${sessionId}`;
    const queue: SSEEnvelope[] = [];
    let resolveNext: (() => void) | null = null;

    const listener = (eventData: SSEEnvelope) => {
      queue.push(eventData);
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    eventBus.on(eventName, listener);

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }

        while (queue.length > 0) {
          const eventData = queue.shift();
          yield eventData;
        }
      }
    } finally {
      eventBus.off(eventName, listener);
    }
  }
}

export const sseEmitter = new SSEEmitter();
