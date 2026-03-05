import { LeadFieldsExtractionSchema, type LeadFieldsExtraction } from './schemas';
import { createLLMProvider } from '@/lib/providers/llm';
import type { ChatMessage, IndustryType } from '@/types';

export const EXTRACTION_PROMPT = (question: string, industry: IndustryType) => `
Extract structured fields from the user's response to a sales qualification question.

Question asked: ${question}
Industry: ${industry}

Extract into this schema. 

Rules:
- Only extract fields explicitly mentioned or clearly implied.
- Set confidence to 0.0-1.0 based on how explicit the information is.
- If a field is not mentioned, set it to null.
- Do NOT infer or guess values.
- If a user mentions budget like "We have about 20k to spend", extract budget_range="20k". 
- If a user mentions they are deciding, set decision_maker="yes".
`;

export async function extractLeadFields(
  messages: ChatMessage[],
  currentQuestion: string,
  industry: IndustryType,
): Promise<Partial<LeadFieldsExtraction>> {
  const llm = createLLMProvider();

  // Format history for the LLM
  // We only really care about the context and the recent response for extraction
  // Let's pass the whole history to give context
  const extraction = await llm.generateStructured({
    systemPrompt: EXTRACTION_PROMPT(currentQuestion, industry),
    messages,
    schema: LeadFieldsExtractionSchema,
  });

  return extraction;
}
