import type { LLMProvider } from '@/lib/providers/llm/types';
import type { ChatMessage, LLMResponse } from '@/types';
import type { z } from 'zod';

export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';

  async generateCompletion(_params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    return {
      content: 'Mock agent response',
      usage: {
        promptTokens: 10,
        completionTokens: 40,
        totalTokens: 50,
      },
    };
  }

  async generateStructured<T>(_params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    // Simplified mock implementation
    return {} as T;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
