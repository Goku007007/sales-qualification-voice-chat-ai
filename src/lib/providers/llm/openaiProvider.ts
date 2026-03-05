import { z } from 'zod';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { LLMProvider } from './types';
import type { ChatMessage, LLMResponse } from '@/types';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';

  private mapMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({
      role: (m.role === 'agent' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  async generateCompletion(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const { text, usage } = await generateText({
      model: openai('gpt-4o'),
      system: params.systemPrompt,
      messages: this.mapMessages(params.messages),
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens,
    });

    return {
      content: text,
      usage: usage
        ? {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          }
        : undefined,
    };
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      system: params.systemPrompt,
      messages: this.mapMessages(params.messages),
      schema: params.schema,
    });

    return object as T;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
