import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateStructured = vi.fn();

vi.mock('@/lib/providers/llm', () => ({
  createLLMProvider: () => ({
    generateStructured: mockGenerateStructured,
  }),
}));

import { extractLeadFields } from '@/lib/extractors/leadFieldExtractor';

describe('leadFieldExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns structured extraction payload from provider', async () => {
    mockGenerateStructured.mockResolvedValue({
      budget_range: '$30k-$40k',
      timeline: 'Q2 2026',
      use_case: 'Pipeline visibility',
      decision_maker: 'yes',
      current_solution: 'Spreadsheets',
      pain_points: 'No reporting consistency',
      company_size: '50',
      urgency: 'high',
      confidence: 0.92,
      fieldsExtracted: ['budget_range', 'timeline', 'use_case'],
    });

    const result = await extractLeadFields(
      [
        {
          id: 'm1',
          role: 'user',
          content: 'Our budget is around 30-40k and we need this by Q2.',
          timestamp: new Date().toISOString(),
        },
      ],
      'Do you have a budget range?',
      'saas',
    );

    expect(result.budget_range).toBe('$30k-$40k');
    expect(result.timeline).toBe('Q2 2026');
    expect(mockGenerateStructured).toHaveBeenCalledOnce();
  });

  it('passes schema, question, and industry context to provider prompt', async () => {
    mockGenerateStructured.mockResolvedValue({
      budget_range: null,
      timeline: null,
      use_case: null,
      decision_maker: null,
      current_solution: null,
      pain_points: null,
      company_size: null,
      urgency: null,
      confidence: 0.2,
      fieldsExtracted: [],
    });

    await extractLeadFields(
      [
        {
          id: 'm2',
          role: 'user',
          content: 'Still exploring options.',
          timestamp: new Date().toISOString(),
        },
      ],
      'What is your timeline?',
      'healthcare',
    );

    const call = mockGenerateStructured.mock.calls[0]?.[0];
    expect(call.systemPrompt).toContain('What is your timeline?');
    expect(call.systemPrompt).toContain('healthcare');
    expect(call.schema).toBeDefined();
  });
});
