import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { sessionService } from '@/lib/services/sessionService';

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

describe('Full qualification flow', () => {
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

  it('moves from CONSENT to QUALIFY_LOOP after consent message', async () => {
    if (!dbAvailable) return;

    const { orchestrationService } = await import('@/lib/services/orchestratorService');

    const session = await sessionService.createSession('saas');
    createdSessionIds.push(session.id);

    await orchestrationService.processMessage(session.id, 'Yes, I consent.');

    const updated = await sessionService.getSession(session.id);
    expect(updated).toBeTruthy();
    expect(updated?.currentState).toBe('QUALIFY_LOOP');
  });

  it('processes additional answers and keeps flow non-error', async () => {
    if (!dbAvailable) return;

    const { orchestrationService } = await import('@/lib/services/orchestratorService');

    const session = await sessionService.createSession('saas');
    createdSessionIds.push(session.id);

    await orchestrationService.processMessage(session.id, 'Yes, go ahead');
    await expect(
      orchestrationService.processMessage(
        session.id,
        'We need better forecasting and pipeline visibility.',
      ),
    ).resolves.toBeUndefined();

    const updated = await sessionService.getSession(session.id);
    expect(updated).toBeTruthy();
    expect(updated?.currentState).not.toBe('ERROR');
    expect(updated?.currentState).toBe('QUALIFY_LOOP');
  });
});
