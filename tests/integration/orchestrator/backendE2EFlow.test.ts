import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { sessionService } from '@/lib/services/sessionService';
import { POST as createSessionRoute } from '@/app/api/sessions/route';
import { inMemoryStore } from '@/lib/adapters/idempotency';
import { MockLLMProvider } from '@/lib/providers/llm/mockProvider';

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

describe('Backend E2E qualification flow', () => {
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

  beforeEach(() => {
    inMemoryStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (!dbAvailable) return;

    for (const id of createdSessionIds) {
      await cleanupSession(id);
    }
  });

  it('covers industry selection -> conversation -> CRM + follow-up mock persistence', async () => {
    if (!dbAvailable) return;

    const completionSpy = vi.spyOn(MockLLMProvider.prototype, 'generateCompletion');

    const structuredSpy = vi
      .spyOn(MockLLMProvider.prototype, 'generateStructured')
      .mockImplementation(
        async (params: {
          systemPrompt: string;
          messages: Array<{ role: string; content: string }>;
        }) => {
          if (params.systemPrompt.includes('Extract structured fields')) {
            const latestUserMessage =
              [...params.messages]
                .reverse()
                .find((msg) => msg.role === 'user')
                ?.content.toLowerCase() ?? '';

            const extraction = {
              budget_range: latestUserMessage.includes('<$10k') ? '<$10k' : null,
              timeline: latestUserMessage.includes('6+ months') ? '6+ months' : null,
              use_case: latestUserMessage.includes('just browsing') ? 'Just browsing' : null,
              decision_maker: latestUserMessage.includes('not the decision maker') ? 'no' : null,
              current_solution: latestUserMessage.includes('spreadsheets') ? 'spreadsheets' : null,
              pain_points: latestUserMessage.includes('manual') ? 'manual forecasting' : null,
              company_size: null,
              urgency: latestUserMessage.includes('6+ months') ? 'low' : null,
              confidence: 0.95,
              fieldsExtracted: [
                'budget_range',
                'timeline',
                'use_case',
                'decision_maker',
                'current_solution',
              ],
            };

            return extraction as never;
          }

          return {
            adjustedScore: 15,
            reasons: [
              'Lead is still in exploratory stage',
              'Budget is currently very limited',
              'Timeline is long-term',
            ],
          } as never;
        },
      );

    const createRequest = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: 'saas' }),
    });

    const createResponse = await createSessionRoute(createRequest);
    expect(createResponse.status).toBe(201);

    const createdSession = await createResponse.json();
    const sessionId = String(createdSession.id);
    createdSessionIds.push(sessionId);

    expect(createdSession.industry).toBe('saas');
    expect(createdSession.currentState).toBe('CONSENT');

    const { orchestrationService } = await import('@/lib/services/orchestratorService');

    const userConversation = [
      'Yes, I consent.',
      'We are mostly just browsing options for now.',
      'We currently manage everything in spreadsheets and manual CRM exports.',
      'This is likely a 6+ months decision window for us.',
      'Budget is probably below <$10k at this point.',
      'I am not the decision maker yet, just doing research.',
      'Option 1 works for me.',
    ];

    for (const userMessage of userConversation) {
      await orchestrationService.processMessage(sessionId, userMessage);
    }

    // Expect a realistic back-and-forth transcript depth.
    // 7 user turns + agent turns should produce 12+ messages overall.
    const transcript = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    expect(transcript.length).toBeGreaterThanOrEqual(12);
    expect(transcript.filter((m) => m.role === 'USER').length).toBeGreaterThanOrEqual(7);
    expect(transcript.filter((m) => m.role === 'AGENT').length).toBeGreaterThanOrEqual(5);

    const updatedSession = await sessionService.getSession(sessionId);
    expect(updatedSession).toBeTruthy();
    expect(updatedSession?.currentState).toBe('COMPLETED');
    expect(updatedSession?.score).toBeTypeOf('number');
    expect(updatedSession?.score).toBeLessThan(34);
    expect(updatedSession?.routeDecision).toBe('cold');

    const crmRecords = await prisma.cRMRecord.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    expect(crmRecords).toHaveLength(1);
    expect(crmRecords[0]?.provider).toBe('mock');
    expect(crmRecords[0]?.externalId).toContain(`mock-crm-${sessionId}`);

    const crmFields = (crmRecords[0]?.fields as Record<string, unknown>) ?? {};
    expect(crmFields.budget_range).toBe('<$10k');
    expect(crmFields.timeline).toBe('6+ months');
    expect(crmFields.use_case).toBe('Just browsing');

    const followUpJobs = await prisma.followUpJob.findMany({
      where: { sessionId },
      orderBy: { day: 'asc' },
    });

    expect(followUpJobs).toHaveLength(3);
    expect(followUpJobs.map((job) => job.day)).toEqual([1, 3, 7]);
    expect(followUpJobs.every((job) => job.status === 'SCHEDULED')).toBe(true);

    const tickets = await prisma.ticket.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    expect(tickets.length).toBeGreaterThanOrEqual(1);
    expect(tickets[0]?.type).toBe('STAKEHOLDER_INVITE');

    expect(inMemoryStore.has(`crm:${sessionId}:upsert:final`)).toBe(true);
    expect(completionSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(structuredSpy.mock.calls.length).toBeGreaterThanOrEqual(6);

    const completionPrompts = completionSpy.mock.calls.map(([params]) =>
      params.systemPrompt.toLowerCase(),
    );
    expect(completionPrompts.some((prompt) => prompt.includes('ask the next question'))).toBe(true);

    const structuredPrompts = structuredSpy.mock.calls.map(([params]) =>
      params.systemPrompt.toLowerCase(),
    );
    expect(structuredPrompts.some((prompt) => prompt.includes('extract structured fields'))).toBe(
      true,
    );
    expect(structuredPrompts.some((prompt) => prompt.includes('lead scoring assistant'))).toBe(
      true,
    );
  });
});
