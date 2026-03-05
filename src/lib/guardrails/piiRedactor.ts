// Regex based PII redaction for basic data
export function redactPII(text: string): string {
  let redacted = text;

  // Email
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL REDACTED]',
  );

  // Phone numbers (simple US formats like XXX-XXX-XXXX or (XXX) XXX-XXXX)
  redacted = redacted.replace(
    /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/g,
    '[PHONE REDACTED]',
  );

  // Credit Cards
  redacted = redacted.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CC REDACTED]');

  // SSN
  redacted = redacted.replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[SSN REDACTED]');

  return redacted;
}

export function containsPII(text: string): boolean {
  return text !== redactPII(text);
}
