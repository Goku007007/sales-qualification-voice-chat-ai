import { z } from 'zod';
import type { SessionState, IndustryPack } from '@/types';
import { scoreField } from './rubrics';
import { createLLMProvider } from '@/lib/providers/llm';

const ScoringSchema = z.object({
  adjustedScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
});

type ScoringResult = z.infer<typeof ScoringSchema>;

const SCORING_PROMPT = (rubric: IndustryPack['scoringRubric']) => `
You are a lead scoring assistant. Given the conversation and extracted lead data, provide a score assessment.

Industry rubric: ${JSON.stringify(rubric, null, 2)}

Provide:
1. An adjusted score (0-100) based on the conversation quality and engagement.
2. A list of 3-5 specific reasons for the score.

Score ranges: Cold (0-33), Warm (34-66), Hot (67-100)
`;

export async function scoreLead(state: SessionState, industryPack: IndustryPack) {
  const rubric = industryPack.scoringRubric;
  const llm = createLLMProvider();

  // Rule-based scoring
  let ruleScore = 0;
  ruleScore += scoreField(state.leadFields.budget_range, rubric.budget);
  ruleScore += scoreField(state.leadFields.timeline, rubric.timeline);
  ruleScore += scoreField(state.leadFields.decision_maker, rubric.authority);
  ruleScore += scoreField(state.leadFields.use_case, rubric.need);

  // LLM-assisted justification (optional enrichment)
  const justification = await llm.generateStructured<ScoringResult>({
    systemPrompt: SCORING_PROMPT(rubric),
    messages: state.messages,
    schema: ScoringSchema,
  });

  const adjustedScore =
    typeof justification.adjustedScore === 'number' && Number.isFinite(justification.adjustedScore)
      ? justification.adjustedScore
      : ruleScore;

  const reasons = Array.isArray(justification.reasons)
    ? justification.reasons.filter((reason: unknown) => typeof reason === 'string')
    : [];

  // Blend: 70% rule-based, 30% LLM-adjusted
  // Wait, the ruleScore max is 100
  const finalScore = Math.round(ruleScore * 0.7 + adjustedScore * 0.3);
  const label = finalScore >= 67 ? 'hot' : finalScore >= 34 ? 'warm' : 'cold';

  return {
    score: finalScore,
    scoreLabel: label as 'hot' | 'warm' | 'cold',
    scoreReasons: reasons,
  };
}
