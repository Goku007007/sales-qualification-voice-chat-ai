import type { z } from 'zod';
import type { LLMProvider } from './types';
import type { ChatMessage, LLMResponse } from '@/types';

export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';

  async generateCompletion(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    void params;
    return {
      content: 'Mock agent response',
      usage: {
        promptTokens: 10,
        completionTokens: 40,
        totalTokens: 50,
      },
    };
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    void params;
    return {} as T;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
