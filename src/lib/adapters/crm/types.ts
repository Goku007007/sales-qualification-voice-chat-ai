export interface CRMLeadInput {
  sessionId: string;
  industry: string;
  score: number;
  fields: Record<string, unknown>;
}

export interface CRMRecordOutput {
  externalId: string;
  url: string;
  status: 'created' | 'updated';
}
