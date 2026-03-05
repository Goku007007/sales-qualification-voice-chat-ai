import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { sessionService } from '@/lib/services/sessionService';
import { POST as createSessionRoute } from '@/app/api/sessions/route';
import { POST as sendMessageRoute } from '@/app/api/sessions/[id]/message/route';

const createdSessionIds: string[] = [];

let dbAvailable = false;

async function cleanupSession(sessionId: string) {
  await prisma.event.deleteMany({ where: { sessionId } });
  await prisma.message.deleteMany({ where: { sessionId } });
  await prisma.ticket.deleteMany({ where: { sessionId } });
  await prisma.cRMRecord.deleteMany({ where: { sessionId } });
  await prisma.followUpJob.deleteMany({ where: { sessionId } });
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

describe('API sessions routes', () => {
  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    process.env.OTEL_ENABLED = 'false';

    try {
      await prisma.$connect();
      dbAvailable = true;
    } catch {
      dbAvailable = false;
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    for (const id of createdSessionIds) {
      await cleanupSession(id);
    }
  });

  it('POST /api/sessions creates a session with initial message', async () => {
    if (!dbAvailable) return;

    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: 'saas' }),
    });

    const res = await createSessionRoute(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBeTruthy();
    expect(data.currentState).toBe('CONSENT');
    expect(data.initialMessage).toBeTruthy();
    expect(data.initialMessage.role).toBe('agent');

    createdSessionIds.push(data.id);
  });

  it('POST /api/sessions rejects invalid industry', async () => {
    if (!dbAvailable) return;

    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: 'invalid' }),
    });

    const res = await createSessionRoute(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/sessions/[id]/message accepts valid message', async () => {
    if (!dbAvailable) return;

    const session = await sessionService.createSession('saas');
    createdSessionIds.push(session.id);

    const req = new Request(`http://localhost/api/sessions/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Yes, I consent.' }),
    });

    const res = await sendMessageRoute(req, { params: { id: session.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('processed');
    expect(data.messageId).toBeTruthy();
  });

  it('POST /api/sessions/[id]/message rejects empty message', async () => {
    if (!dbAvailable) return;

    const session = await sessionService.createSession('saas');
    createdSessionIds.push(session.id);

    const req = new Request(`http://localhost/api/sessions/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    const res = await sendMessageRoute(req, { params: { id: session.id } });
    expect(res.status).toBe(400);
  });

  it('POST /api/sessions/[id]/message returns 404 for unknown session', async () => {
    if (!dbAvailable) return;

    const req = new Request('http://localhost/api/sessions/unknown/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });

    const res = await sendMessageRoute(req, { params: { id: 'unknown-session-id' } });
    expect(res.status).toBe(404);
  });
});
