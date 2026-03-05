import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionService } from '@/lib/services/sessionService';
import { eventLogger } from '@/lib/events/eventLogger';
import { ulid } from 'ulid';

const CreateSessionSchema = z.object({
  industry: z.enum(['saas', 'real_estate', 'healthcare', 'ecommerce', 'consulting']),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = CreateSessionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 },
      );
    }

    const { industry } = result.data;
    const session = await sessionService.createSession(industry);

    const initialMessage = await sessionService.createMessage({
      sessionId: session.id,
      id: ulid(),
      role: 'agent',
      content: 'Welcome! Do you consent to proceed with this demo?',
      source: 'text',
      metadata: { kind: 'initial_greeting' },
    });

    await eventLogger.logEvent({
      sessionId: session.id,
      type: 'session_created',
      description: `New ${industry} session created`,
      metadata: { industry },
    });

    return NextResponse.json(
      {
        id: session.id,
        industry: session.industry,
        currentState: session.currentState,
        createdAt: session.createdAt,
        initialMessage,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
