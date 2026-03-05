import { z } from 'zod';
import type { ChatMessage, LLMResponse } from '@/types';

export interface LLMProvider {
  readonly name: string;

  generateCompletion(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse>;

  generateStructured<T>(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T>;

  healthCheck(): Promise<boolean>;
}
