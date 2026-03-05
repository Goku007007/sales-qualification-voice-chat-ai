import { afterEach, describe, expect, it } from 'vitest';
import { createLLMProvider } from '@/lib/providers/llm';

const originalProvider = process.env.LLM_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) {
    delete process.env.LLM_PROVIDER;
    return;
  }
  process.env.LLM_PROVIDER = originalProvider;
});

describe('createLLMProvider', () => {
  it('returns cloudflare provider when configured', () => {
    process.env.LLM_PROVIDER = 'cloudflare';
    const provider = createLLMProvider();
    expect(provider.name).toBe('cloudflare');
  });

  it('falls back to cloudflare when env is not set', () => {
    delete process.env.LLM_PROVIDER;
    const provider = createLLMProvider();
    expect(provider.name).toBe('cloudflare');
  });

  it('throws for unsupported providers', () => {
    process.env.LLM_PROVIDER = 'unsupported-provider';
    expect(() => createLLMProvider()).toThrow('Unknown LLM provider');
  });
});
