export type DashboardLeadFieldKey = 'budget' | 'timeline' | 'need' | 'decisionMaker';

const LEAD_FIELD_KEY_MAP: Record<string, DashboardLeadFieldKey> = {
  budget: 'budget',
  budget_range: 'budget',
  timeline: 'timeline',
  need: 'need',
  use_case: 'need',
  decisionMaker: 'decisionMaker',
  decision_maker: 'decisionMaker',
};

export function toDashboardLeadFieldKey(field: string): DashboardLeadFieldKey | null {
  return LEAD_FIELD_KEY_MAP[field] ?? null;
}

export function toDashboardLeadFieldLabel(field: string): string {
  const key = toDashboardLeadFieldKey(field);
  if (!key) return field.replace(/_/g, ' ');

  switch (key) {
    case 'budget':
      return 'budget';
    case 'timeline':
      return 'timeline';
    case 'need':
      return 'need';
    case 'decisionMaker':
      return 'decision maker';
    default:
      return field.replace(/_/g, ' ');
  }
}

export function mapLeadFieldsForDashboard(
  fields: Record<string, unknown> | undefined,
): Partial<Record<DashboardLeadFieldKey, string | null>> {
  if (!fields) return {};

  return Object.entries(fields).reduce<Partial<Record<DashboardLeadFieldKey, string | null>>>(
    (acc, [rawKey, rawValue]) => {
      const mappedKey = toDashboardLeadFieldKey(rawKey);
      if (!mappedKey) return acc;

      acc[mappedKey] = rawValue == null ? null : String(rawValue);
      return acc;
    },
    {},
  );
}
