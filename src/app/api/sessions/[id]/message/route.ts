import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionService } from '@/lib/services/sessionService';
import { eventLogger } from '@/lib/events/eventLogger';
import { sseEmitter } from '@/lib/events/sseEmitter';
import { ulid } from 'ulid';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  metadata: z
    .object({
      source: z.enum(['text', 'voice']).default('text'),
    })
    .optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = SendMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid message', details: result.error.format() },
        { status: 400 },
      );
    }

    const session = await sessionService.getSession(params.id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.currentState === 'COMPLETED' || session.currentState === 'ERROR') {
      return NextResponse.json({ error: 'Session is closed for input' }, { status: 400 });
    }

    const messageId = ulid();
    const { content, metadata } = result.data;

    await sessionService.createMessage({
      sessionId: session.id,
      id: messageId,
      role: 'user',
      content,
      source: metadata?.source ?? 'text',
      metadata: metadata ?? {},
    });

    await eventLogger.logEvent({
      sessionId: session.id,
      type: 'user_message',
      description: 'Received user message',
      metadata: { messageId, contentLength: content.length, source: metadata?.source || 'text' },
    });

    sseEmitter.emit(session.id, {
      type: 'agent_typing',
      payload: { isTyping: true },
    });

    const { orchestrationService } = await import('@/lib/services/orchestratorService');
    await orchestrationService.processMessage(session.id, content, {
      userMessageId: messageId,
      source: metadata?.source ?? 'text',
    });

    return NextResponse.json({ messageId, status: 'processed' });
  } catch (error) {
    console.error(`Failed to process message for session ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
