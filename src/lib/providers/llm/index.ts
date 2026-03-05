import type { LLMProvider } from './types';
import { CloudflareProvider } from './cloudflareProvider';
import { OpenAIProvider } from './openaiProvider';
import { MockLLMProvider } from './mockProvider';

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'cloudflare';

  switch (provider) {
    case 'cloudflare':
      return new CloudflareProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'mock':
      return new MockLLMProvider();
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export type { LLMProvider } from './types';
