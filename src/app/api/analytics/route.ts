import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const WORKFLOW_STATES = [
  'CONSENT',
  'OPENING',
  'QUALIFY_LOOP',
  'SCORE',
  'ROUTE',
  'ACTIONS',
  'FOLLOWUP_SCHEDULED',
  'COMPLETED',
  'ERROR',
] as const;

const SCORE_LABELS = ['HOT', 'WARM', 'COLD'] as const;
const TOTAL_QUESTIONS = 5;

function toPct(count: number, total: number) {
  if (total <= 0) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function normalizeEnum(value: string | null) {
  return value ? value.toLowerCase() : null;
}

export async function GET() {
  try {
    const [
      totalSessions,
      sessionsForDropOff,
      stateCounts,
      scoreLabelCounts,
      userMessageCounts,
      recentSessions,
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.findMany({
        select: {
          id: true,
          currentState: true,
        },
      }),
      prisma.session.groupBy({
        by: ['currentState'],
        _count: { _all: true },
      }),
      prisma.session.groupBy({
        by: ['scoreLabel'],
        where: {
          scoreLabel: {
            in: [...SCORE_LABELS],
          },
        },
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ['sessionId'],
        where: {
          type: 'user_message',
        },
        _count: { _all: true },
      }),
      prisma.session.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          industry: true,
          score: true,
          scoreLabel: true,
          currentState: true,
          outcome: true,
          durationMs: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const stateCountMap = new Map<string, number>(
      stateCounts.map((row) => [row.currentState, row._count._all]),
    );

    const funnel = WORKFLOW_STATES.map((state) => {
      const count = stateCountMap.get(state) ?? 0;
      return {
        state: state.toLowerCase(),
        count,
        percentage: toPct(count, totalSessions),
      };
    });

    const scoreLabelCountMap = new Map<string, number>(
      scoreLabelCounts
        .filter((row) => row.scoreLabel)
        .map((row) => [row.scoreLabel as string, row._count._all]),
    );

    const scoredTotal = SCORE_LABELS.reduce(
      (acc, label) => acc + (scoreLabelCountMap.get(label) ?? 0),
      0,
    );

    const outcomes = SCORE_LABELS.map((label) => {
      const count = scoreLabelCountMap.get(label) ?? 0;
      return {
        label: label.toLowerCase(),
        count,
        percentage: toPct(count, scoredTotal),
      };
    });

    const answersBySession = new Map<string, number>(
      userMessageCounts.map((row) => [row.sessionId, row._count._all]),
    );

    const dropCountByQuestion = new Map<number, number>();

    for (const session of sessionsForDropOff) {
      const answers = answersBySession.get(session.id) ?? 0;
      const isTerminal =
        session.currentState === 'COMPLETED' || session.currentState === 'FOLLOWUP_SCHEDULED';

      if (isTerminal || answers >= TOTAL_QUESTIONS) continue;

      const droppedAtQuestion = Math.min(answers + 1, TOTAL_QUESTIONS);
      dropCountByQuestion.set(
        droppedAtQuestion,
        (dropCountByQuestion.get(droppedAtQuestion) ?? 0) + 1,
      );
    }

    const dropOff = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
      const question = i + 1;
      const count = dropCountByQuestion.get(question) ?? 0;
      return {
        question,
        count,
        percentage: toPct(count, totalSessions),
      };
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totalSessions,
      funnel,
      outcomes,
      dropOff,
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        industry: normalizeEnum(session.industry),
        score: session.score,
        scoreLabel: normalizeEnum(session.scoreLabel),
        status: normalizeEnum(session.outcome ?? session.currentState),
        durationMs: session.durationMs,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to load analytics:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
