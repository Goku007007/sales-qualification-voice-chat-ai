import { z } from 'zod';
import type { ChatMessage, LLMResponse } from '@/types';
import type { LLMProvider } from './types';

const DEFAULT_CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct';

interface CloudflareEnvelope {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ message?: string }>;
}

export class CloudflareProvider implements LLMProvider {
  readonly name = 'cloudflare';

  private get accountId(): string | null {
    return process.env.CLOUDFLARE_ACCOUNT_ID ?? null;
  }

  private get apiToken(): string | null {
    return process.env.CLOUDFLARE_API_TOKEN ?? null;
  }

  private get model(): string {
    return process.env.CLOUDFLARE_MODEL || DEFAULT_CLOUDFLARE_MODEL;
  }

  private mapMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({
      role: (m.role === 'agent' ? 'assistant' : m.role) as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  private getEndpoint(): string {
    if (!this.accountId) {
      throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
    }
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
  }

  private getHeaders(): HeadersInit {
    if (!this.apiToken) {
      throw new Error('Missing CLOUDFLARE_API_TOKEN');
    }

    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async invokeModel(payload: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let parsed: CloudflareEnvelope | null = null;

    try {
      parsed = JSON.parse(rawText) as CloudflareEnvelope;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const apiError =
        parsed?.errors
          ?.map((error) => error.message)
          .filter(Boolean)
          .join('; ') || rawText;
      throw new Error(`Cloudflare AI request failed (${response.status}): ${apiError}`);
    }

    if (parsed?.success === false) {
      const apiError = parsed.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(`Cloudflare AI returned an error: ${apiError || 'Unknown error'}`);
    }

    if (parsed && 'result' in parsed) {
      return parsed.result;
    }

    return parsed ?? rawText;
  }

  private extractContent(result: unknown): string {
    if (typeof result === 'string') return result;

    if (!result || typeof result !== 'object') {
      return String(result ?? '');
    }

    const value = result as Record<string, unknown>;

    if (typeof value.response === 'string') return value.response;
    if (typeof value.output_text === 'string') return value.output_text;
    if (typeof value.text === 'string') return value.text;

    if (Array.isArray(value.choices)) {
      const firstChoice = value.choices[0] as Record<string, unknown> | undefined;
      if (firstChoice) {
        if (typeof firstChoice.text === 'string') return firstChoice.text;
        const message = firstChoice.message as Record<string, unknown> | undefined;
        if (message && typeof message.content === 'string') return message.content;
      }
    }

    if (value.result) return this.extractContent(value.result);

    return JSON.stringify(value);
  }

  private parseJsonPayload(raw: string): unknown {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('Empty JSON response');

    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue to fallback parsing below.
    }

    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    try {
      return JSON.parse(withoutFence);
    } catch {
      // Continue to fallback parsing below.
    }

    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const possibleJson = withoutFence.slice(firstBrace, lastBrace + 1);
      return JSON.parse(possibleJson);
    }

    throw new Error('Could not parse JSON payload from Cloudflare response');
  }

  async generateCompletion(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const result = await this.invokeModel({
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...this.mapMessages(params.messages),
      ],
      temperature: params.temperature ?? 0.7,
      ...(typeof params.maxTokens === 'number' ? { max_tokens: params.maxTokens } : {}),
      stream: false,
    });

    return {
      content: this.extractContent(result).trim(),
    };
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T> {
    const completion = await this.generateCompletion({
      systemPrompt: `${params.systemPrompt}

Return ONLY valid JSON that matches the required schema.
Do not include markdown, code fences, or any extra text.`,
      messages: params.messages,
      temperature: 0.2,
    });

    const firstAttempt = params.schema.safeParse(this.parseJsonPayload(completion.content));
    if (firstAttempt.success) return firstAttempt.data;

    const repairedCompletion = await this.generateCompletion({
      systemPrompt: `${params.systemPrompt}

The previous output failed schema validation. Fix it and return ONLY valid JSON.
Validation issues: ${JSON.stringify(firstAttempt.error.issues.map((issue) => issue.message))}
Do not include markdown, code fences, or any extra text.`,
      messages: params.messages,
      temperature: 0.1,
    });

    const secondAttempt = params.schema.safeParse(
      this.parseJsonPayload(repairedCompletion.content),
    );
    if (!secondAttempt.success) {
      throw new Error(
        `Cloudflare structured output validation failed: ${JSON.stringify(secondAttempt.error.issues)}`,
      );
    }

    return secondAttempt.data;
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.accountId && this.apiToken);
  }
}
