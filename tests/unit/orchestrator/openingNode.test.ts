import { describe, expect, it } from 'vitest';
import type { SessionState } from '@/types';
import { openingNode } from '@/lib/orchestrator/nodes/openingNode';

function createState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 'ses_test',
    industry: 'saas',
    messages: [],
    currentQuestionIndex: 0,
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
    currentState: 'OPENING',
    stateHistory: [],
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('openingNode', () => {
  it('returns no state changes in current implementation', async () => {
    const state = createState();
    const result = await openingNode(state);
    expect(result).toEqual({});
  });

  it('handles different industries without throwing', async () => {
    const state = createState({ industry: 'consulting' });
    await expect(openingNode(state)).resolves.toEqual({});
  });
});
