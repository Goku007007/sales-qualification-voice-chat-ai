export function scoreField(
  value: string | null | undefined,
  config: { weight: number; tiers: Record<string, string> },
): number {
  if (!value) return 0;

  const v = value.toLowerCase();

  // High tier check
  if (config.tiers.high && v.includes(config.tiers.high.toLowerCase())) return config.weight;

  // Medium tier check
  if (config.tiers.medium && v.includes(config.tiers.medium.toLowerCase()))
    return config.weight * 0.5;

  // Low tier check
  return config.weight * 0.1; // Better than nothing, but low match
}

export function detectRiskKeywords(
  messages: { role: string; content: string }[],
  industry: string,
): boolean {
  void industry;
  const content = messages.map((m) => m.content.toLowerCase()).join(' ');
  const riskWords = ['lawsuit', 'sue', 'illegal', 'scam', 'fraud', 'bankrupt'];
  return riskWords.some((w) => content.includes(w));
}
