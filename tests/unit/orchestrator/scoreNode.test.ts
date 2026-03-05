import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/types';

const mockScoreLead = vi.fn();

vi.mock('@/lib/scoring/engine', () => ({
  scoreLead: (...args: unknown[]) => mockScoreLead(...args),
}));

import { scoreNode } from '@/lib/orchestrator/nodes/scoreNode';

function createState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 'ses_test',
    industry: 'saas',
    messages: [],
    currentQuestionIndex: 5,
    totalQuestions: 5,
    leadFields: {
      budget_range: '$50k+',
      timeline: 'This quarter',
      decision_maker: 'Decision maker',
      use_case: 'Active pain point',
    },
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
    currentState: 'SCORE',
    stateHistory: [],
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('scoreNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps score engine output onto state updates', async () => {
    mockScoreLead.mockResolvedValue({
      score: 82,
      scoreLabel: 'hot',
      scoreReasons: ['Budget and urgency are high'],
    });

    const result = await scoreNode(createState());

    expect(mockScoreLead).toHaveBeenCalledOnce();
    expect(result).toEqual({
      score: 82,
      scoreLabel: 'hot',
      scoreReasons: ['Budget and urgency are high'],
    });
  });

  it('supports warm/cold score labels from scoring engine', async () => {
    mockScoreLead.mockResolvedValueOnce({
      score: 55,
      scoreLabel: 'warm',
      scoreReasons: ['Good timeline'],
    });
    mockScoreLead.mockResolvedValueOnce({
      score: 20,
      scoreLabel: 'cold',
      scoreReasons: ['Low urgency'],
    });

    const warm = await scoreNode(createState());
    const cold = await scoreNode(createState());

    expect(warm.scoreLabel).toBe('warm');
    expect(cold.scoreLabel).toBe('cold');
  });
});
