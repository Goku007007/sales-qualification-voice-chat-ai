import { describe, expect, it } from 'vitest';
import { containsPII, redactPII } from '@/lib/guardrails/piiRedactor';

describe('piiRedactor', () => {
  it('redacts email addresses', () => {
    const redacted = redactPII('Contact me at john@company.com');
    expect(redacted).toContain('[EMAIL REDACTED]');
    expect(redacted).not.toContain('john@company.com');
  });

  it('redacts phone numbers', () => {
    const redacted = redactPII('Call me at (415) 555-1234');
    expect(redacted).toContain('[PHONE REDACTED]');
    expect(redacted).not.toContain('555-1234');
  });

  it('redacts SSNs', () => {
    const redacted = redactPII('My SSN is 123-45-6789');
    expect(redacted).toContain('[SSN REDACTED]');
    expect(redacted).not.toContain('123-45-6789');
  });

  it('returns original text when no PII exists', () => {
    const text = 'We need better reporting tools.';
    const redacted = redactPII(text);
    expect(redacted).toBe(text);
    expect(containsPII(text)).toBe(false);
  });

  it('detects and redacts multiple PII values in one string', () => {
    const text = 'Email john@co.com or call 415-555-1234';
    const redacted = redactPII(text);

    expect(redacted).toContain('[EMAIL REDACTED]');
    expect(redacted).toContain('[PHONE REDACTED]');
    expect(containsPII(text)).toBe(true);
  });
});
