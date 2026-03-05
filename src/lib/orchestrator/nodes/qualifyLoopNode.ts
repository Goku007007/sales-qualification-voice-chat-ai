import type { SessionState } from '@/types';
import { getIndustryPack } from '@/industry-packs';
import { extractLeadFields } from '@/lib/extractors/leadFieldExtractor';
import { validateExtraction } from '@/lib/extractors/validators';
import { createLLMProvider } from '@/lib/providers/llm';
import { withSessionSpan, withSpan } from '@/lib/tracing/spans';

export const FOLLOW_UP_PROMPT = (missingFields: string[]) => `
You are a sales agent. The user's last answer was unclear or didn't fully address the question.
We need more clarity on the following aspects: ${missingFields.join(', ')}.
Ask a short, polite follow-up question to clarify this information.
`;

export const NEXT_QUESTION_PROMPT = (question: { text: string }) => `
You are a professional sales qualification agent.
The user just provided some information. Acknowledge it briefly and naturally, then ask the next question: "${question.text}".
Keep your response under 3 sentences.
`;

export const TARGET_FIELD_FOLLOW_UP_PROMPT = (prompt: string) => `
You are a professional sales qualification agent.
The user did not provide a clear answer for the current question.
Ask this concise follow-up question to collect the missing detail: "${prompt}".
Keep it under 2 sentences and do not ask multiple questions.
`;

function isFilledLeadValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return true;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return !['unknown', 'n/a', 'na', 'none'].includes(normalized);
}

export async function qualifyLoopNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    `qualify_loop_q${state.currentQuestionIndex + 1}`,
    async () => {
      const industryPack = getIndustryPack(state.industry);
      const currentQ = industryPack.questions[state.currentQuestionIndex];
      const llm = createLLMProvider();

      // 1. Extract fields
      const extraction = await withSpan(
        'extraction',
        () => extractLeadFields(state.messages, currentQ.text, state.industry),
        {
          namespace: 'orchestrator',
          attributes: {
            session_id: state.sessionId,
            question_index: state.currentQuestionIndex + 1,
          },
        },
      );

      // Filter to only non-null fields to merge
      const extractedData: Record<string, unknown> = {};
      if (extraction) {
        for (const [k, v] of Object.entries(extraction)) {
          if (v !== null && v !== undefined && k !== 'confidence' && k !== 'fieldsExtracted') {
            extractedData[k] = v;
          }
        }
      }

      const mergedFields = { ...state.leadFields, ...extractedData };
      const targetFieldValue = mergedFields[currentQ.targetField];

      // Require the current question's target field before progressing.
      if (!isFilledLeadValue(targetFieldValue)) {
        const followUpQuestion = currentQ.followUpPrompt || currentQ.text;
        const followUp = await withSpan(
          'llm_call_target_field_followup',
          () =>
            llm.generateCompletion({
              systemPrompt: TARGET_FIELD_FOLLOW_UP_PROMPT(followUpQuestion),
              messages: state.messages,
            }),
          {
            namespace: 'orchestrator',
            attributes: {
              session_id: state.sessionId,
              question_index: state.currentQuestionIndex + 1,
              target_field: currentQ.targetField,
            },
          },
        );

        return {
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role: 'agent',
              content: followUp.content,
              timestamp: new Date().toISOString(),
            },
          ],
          leadFields: mergedFields,
          currentQuestionIndex: state.currentQuestionIndex,
        };
      }

      // 2. Validate
      const validation = validateExtraction(extraction);

      // 3. Follow up if needed
      if (validation.needsFollowUp) {
        const followUp = await withSpan(
          'llm_call_followup',
          () =>
            llm.generateCompletion({
              systemPrompt: FOLLOW_UP_PROMPT(validation.missingFields),
              messages: state.messages,
            }),
          {
            namespace: 'orchestrator',
            attributes: {
              session_id: state.sessionId,
              question_index: state.currentQuestionIndex + 1,
              missing_fields_count: validation.missingFields.length,
            },
          },
        );
        return {
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role: 'agent',
              content: followUp.content,
              timestamp: new Date().toISOString(),
            },
          ],
          leadFields: mergedFields,
          // Don't advance index
        };
      }

      // 4. Move to next question or complete
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= industryPack.questions.length) {
        return {
          leadFields: mergedFields,
          currentQuestionIndex: nextIndex,
        };
      }

      // Ask next question
      const nextQ = industryPack.questions[nextIndex];
      const nextMessage = await withSpan(
        'llm_call_next_question',
        () =>
          llm.generateCompletion({
            systemPrompt: NEXT_QUESTION_PROMPT(nextQ),
            messages: state.messages,
          }),
        {
          namespace: 'orchestrator',
          attributes: {
            session_id: state.sessionId,
            question_index: state.currentQuestionIndex + 1,
            next_question_index: nextIndex + 1,
          },
        },
      );

      return {
        messages: [
          ...state.messages,
          {
            id: Date.now().toString(),
            role: 'agent',
            content: nextMessage.content,
            timestamp: new Date().toISOString(),
          },
        ],
        leadFields: mergedFields,
        currentQuestionIndex: nextIndex,
      };
    },
    {
      current_state: state.currentState,
      industry: state.industry,
      question_index: state.currentQuestionIndex + 1,
    },
  );
}

export function qualifyRouter(state: SessionState): string {
  const industryPack = getIndustryPack(state.industry);
  if (state.currentQuestionIndex >= industryPack.questions.length) return 'complete';
  return 'next_question';
}
