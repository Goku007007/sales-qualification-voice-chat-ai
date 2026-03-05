import { sseEmitter } from '@/lib/events/sseEmitter';

export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const iterator = sseEmitter.subscribe(params.id);

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const connectPayload = JSON.stringify({
        type: 'connected',
        payload: { sessionId: params.id },
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${connectPayload}\n\n`));

      try {
        for await (const event of iterator) {
          if (event) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      // cleanup handled by async generator finally block
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
