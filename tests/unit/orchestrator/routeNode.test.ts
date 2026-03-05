import { describe, expect, it } from 'vitest';
import type { SessionState } from '@/types';
import { routeNode, routeRouter } from '@/lib/orchestrator/nodes/routeNode';

function createState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 'ses_test',
    industry: 'saas',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'We want to move fast on this implementation.',
        timestamp: new Date().toISOString(),
      },
    ],
    currentQuestionIndex: 5,
    totalQuestions: 5,
    leadFields: {},
    extractionConfidences: {},
    score: null,
    scoreLabel: null,
    scoreReasons: [],
    routeDecision: null,
    consentGiven: true,
    consentTimestamp: new Date().toISOString(),
    adapterResults: [],
    pendingActions: [],
    followUps: [],
    currentState: 'ROUTE',
    stateHistory: [],
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('routeNode', () => {
  it('routes risk when risk keywords are present', async () => {
    const state = createState({
      scoreLabel: 'hot',
      messages: [
        {
          id: 'm2',
          role: 'user',
          content: 'This looked like fraud in the past and might be illegal.',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const result = await routeNode(state);
    expect(result.routeDecision).toBe('risk');
  });

  it('routes hot and warm labels directly when no risk is detected', async () => {
    const hot = await routeNode(createState({ scoreLabel: 'hot' }));
    const warm = await routeNode(createState({ scoreLabel: 'warm' }));

    expect(hot.routeDecision).toBe('hot');
    expect(warm.routeDecision).toBe('warm');
  });

  it('falls back to cold for null or cold labels', async () => {
    const nullLabel = await routeNode(createState({ scoreLabel: null }));
    const coldLabel = await routeNode(createState({ scoreLabel: 'cold' }));

    expect(nullLabel.routeDecision).toBe('cold');
    expect(coldLabel.routeDecision).toBe('cold');
  });
});

describe('routeRouter', () => {
  it('returns lowercased decision key when present', () => {
    expect(routeRouter(createState({ routeDecision: 'risk' }))).toBe('risk');
    expect(routeRouter(createState({ routeDecision: 'hot' }))).toBe('hot');
  });

  it('defaults to cold when route decision is absent', () => {
    expect(routeRouter(createState({ routeDecision: null }))).toBe('cold');
  });
});
