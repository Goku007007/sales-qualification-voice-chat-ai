import { z } from 'zod';

// Core lead fields extraction schema
export const LeadFieldsExtractionSchema = z.object({
  budget_range: z.string().nullable().describe('Budget range, e.g., "$10k-$50k"'),
  timeline: z.string().nullable().describe('Implementation timeline, e.g., "Q2 2026"'),
  use_case: z.string().nullable().describe('Primary use case or need'),
  decision_maker: z
    .enum(['yes', 'no', 'partial', 'unknown'])
    .nullable()
    .describe('Is this person the decision maker?'),
  current_solution: z.string().nullable().describe('Current solution/competitor'),
  pain_points: z.string().nullable().describe('Key pain points mentioned'),
  company_size: z.string().nullable().describe('Company size (employees or revenue)'),
  urgency: z
    .enum(['low', 'medium', 'high', 'critical'])
    .nullable()
    .describe('How urgently do they need a solution?'),

  // Extraction metadata
  confidence: z.number().min(0).max(1).describe('Overall extraction confidence'),
  fieldsExtracted: z.array(z.string()).describe('Which fields were extracted this turn'),
});

export type LeadFieldsExtraction = z.infer<typeof LeadFieldsExtractionSchema>;
