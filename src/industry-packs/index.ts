import type { IndustryPack, IndustryType } from '@/types';
import { SAAS_PACK } from './saas';
import { REAL_ESTATE_PACK } from './realEstate';
import { HEALTHCARE_PACK } from './healthcare';
import { ECOMMERCE_PACK } from './ecommerce';
import { CONSULTING_PACK } from './consulting';

const INDUSTRY_PACKS: Record<IndustryType, IndustryPack> = {
  saas: SAAS_PACK,
  real_estate: REAL_ESTATE_PACK,
  healthcare: HEALTHCARE_PACK,
  ecommerce: ECOMMERCE_PACK,
  consulting: CONSULTING_PACK,
};

export function getIndustryPack(industry: IndustryType): IndustryPack {
  const pack = INDUSTRY_PACKS[industry];
  if (!pack) throw new Error(`Unknown industry: ${industry}`);
  return pack;
}
