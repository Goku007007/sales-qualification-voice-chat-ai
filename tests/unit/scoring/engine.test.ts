import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/types';

const mockGenerateStructured = vi.fn();

vi.mock('@/lib/providers/llm', () => ({
  createLLMProvider: () => ({
    generateStructured: mockGenerateStructured,
  }),
}));

import { scoreLead } from '@/lib/scoring/engine';
import { SAAS_PACK } from '@/industry-packs/saas';

function createState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 'ses_test',
    industry: 'saas',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Initial qualification response',
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
    currentState: 'SCORE',
    stateHistory: [],
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('scoring engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scores hot for high-value inputs', async () => {
    mockGenerateStructured.mockResolvedValue({
      adjustedScore: 90,
      reasons: ['High urgency and clear budget'],
    });

    const state = createState({
      leadFields: {
        budget_range: '$50k+',
        timeline: 'This quarter',
        decision_maker: 'Decision maker',
        use_case: 'Active pain point',
      },
    });

    const result = await scoreLead(state, SAAS_PACK);

    expect(result.score).toBeGreaterThanOrEqual(67);
    expect(result.scoreLabel).toBe('hot');
  });

  it('scores cold for sparse/low-signal inputs', async () => {
    mockGenerateStructured.mockResolvedValue({
      adjustedScore: 5,
      reasons: ['Little urgency'],
    });

    const state = createState({
      leadFields: {
        budget_range: null,
        timeline: null,
        decision_maker: null,
        use_case: null,
      },
    });

    const result = await scoreLead(state, SAAS_PACK);

    expect(result.score).toBeLessThan(34);
    expect(result.scoreLabel).toBe('cold');
  });

  it('returns reasons from LLM justification payload', async () => {
    mockGenerateStructured.mockResolvedValue({
      adjustedScore: 65,
      reasons: ['Budget is likely viable', 'Timeline appears reasonable'],
    });

    const result = await scoreLead(createState(), SAAS_PACK);

    expect(result.scoreReasons).toContain('Budget is likely viable');
    expect(result.scoreReasons.length).toBeGreaterThan(0);
  });
});
