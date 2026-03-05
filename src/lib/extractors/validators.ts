import type { LeadFieldsExtraction } from './schemas';

export interface ValidationResult {
  isValid: boolean;
  needsFollowUp: boolean;
  missingFields: string[];
}

export function validateExtraction(extraction: Partial<LeadFieldsExtraction>): ValidationResult {
  const missingFields: string[] = [];

  // This is a simplified validation. In a real application, you might
  // verify whether certain fields exist before proceeding to the next level.
  // Example:
  // if (!extraction.budget_range && !currentFields.budget_range) {
  //   missingFields.push('budget_range');
  // }

  if (extraction.confidence != null && extraction.confidence < 0.4) {
    if (extraction.fieldsExtracted && extraction.fieldsExtracted.length > 0) {
      return {
        isValid: true, // We did get something
        needsFollowUp: true,
        missingFields: extraction.fieldsExtracted,
      };
    }
  }

  return {
    isValid: true,
    needsFollowUp: missingFields.length > 0,
    missingFields,
  };
}
