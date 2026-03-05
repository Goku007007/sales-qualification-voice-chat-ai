import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState, ChatMessage } from '@/types';

const mockGenerateCompletion = vi.fn();
const mockExtractLeadFields = vi.fn();
const mockValidateExtraction = vi.fn();

vi.mock('@/lib/providers/llm', () => ({
  createLLMProvider: () => ({
    generateCompletion: mockGenerateCompletion,
  }),
}));

vi.mock('@/lib/extractors/leadFieldExtractor', () => ({
  extractLeadFields: (...args: unknown[]) => mockExtractLeadFields(...args),
}));

vi.mock('@/lib/extractors/validators', () => ({
  validateExtraction: (...args: unknown[]) => mockValidateExtraction(...args),
}));

import { qualifyLoopNode, qualifyRouter } from '@/lib/orchestrator/nodes/qualifyLoopNode';

function createState(overrides: Partial<SessionState> = {}): SessionState {
  const baseMessages: ChatMessage[] = [
    {
      id: 'm1',
      role: 'user',
      content: 'We need better pipeline visibility.',
      timestamp: new Date().toISOString(),
    },
  ];

  return {
    sessionId: 'ses_test',
    industry: 'saas',
    messages: baseMessages,
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
    currentState: 'QUALIFY_LOOP',
    stateHistory: [],
    errorCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('qualifyLoopNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances to next question when validation passes', async () => {
    mockExtractLeadFields.mockResolvedValue({
      use_case: 'Pipeline visibility',
      confidence: 0.9,
      fieldsExtracted: ['use_case'],
    });
    mockValidateExtraction.mockReturnValue({
      isValid: true,
      needsFollowUp: false,
      missingFields: [],
    });
    mockGenerateCompletion.mockResolvedValue({ content: 'Great, what are you using today?' });

    const result = await qualifyLoopNode(createState());

    expect(result.currentQuestionIndex).toBe(1);
    expect(result.leadFields).toMatchObject({ use_case: 'Pipeline visibility' });
    expect(result.messages).toBeDefined();
    expect(result.messages?.at(-1)?.role).toBe('agent');
    expect(result.messages?.at(-1)?.content).toContain('Great');
  });

  it('asks follow-up and does not advance when validation requires follow-up', async () => {
    mockExtractLeadFields.mockResolvedValue({
      budget_range: '$10k-$20k',
      confidence: 0.3,
      fieldsExtracted: ['budget_range'],
    });
    mockValidateExtraction.mockReturnValue({
      isValid: true,
      needsFollowUp: true,
      missingFields: ['budget_range'],
    });
    mockGenerateCompletion.mockResolvedValue({ content: 'Could you clarify your budget range?' });

    const result = await qualifyLoopNode(createState());

    expect(result.currentQuestionIndex).toBe(0);
    expect(result.leadFields).toMatchObject({ budget_range: '$10k-$20k' });
    expect(result.messages?.at(-1)?.content).toContain('clarify');
  });

  it('marks completion when current question is the last one', async () => {
    mockExtractLeadFields.mockResolvedValue({
      decision_maker: 'yes',
      confidence: 0.8,
      fieldsExtracted: ['decision_maker'],
    });
    mockValidateExtraction.mockReturnValue({
      isValid: true,
      needsFollowUp: false,
      missingFields: [],
    });

    const result = await qualifyLoopNode(createState({ currentQuestionIndex: 4 }));

    expect(result.currentQuestionIndex).toBe(5);
    expect(result.leadFields).toMatchObject({ decision_maker: 'yes' });
    expect(result.messages).toBeUndefined();
  });
});

describe('qualifyRouter', () => {
  it('returns complete when all questions are answered', () => {
    const route = qualifyRouter(createState({ currentQuestionIndex: 5 }));
    expect(route).toBe('complete');
  });

  it('returns next_question while questions remain', () => {
    const route = qualifyRouter(createState({ currentQuestionIndex: 1 }));
    expect(route).toBe('next_question');
  });
});
