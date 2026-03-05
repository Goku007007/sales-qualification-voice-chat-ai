import { EventEmitter } from 'events';

// Create a singleton event bus for in-process communication
// In a serverless/multi-instance environment (like Vercel), this would
// be replaced by Redis Pub/Sub, Upstash, or a similar distributed queue.
class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // increase max listeners if many SSE connections are expected
    this.setMaxListeners(100);
  }
}

export const eventBus = new AppEventBus();
