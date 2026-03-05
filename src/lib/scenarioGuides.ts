import type { IndustryType } from '@/types';

export interface ScenarioGuide {
  title: string;
  situation: string;
  objective: string;
  suggestedInputs: string[];
}

export const scenarioGuides: Record<IndustryType, ScenarioGuide> = {
  saas: {
    title: 'SaaS Inbound Demo',
    situation: 'You are a buyer evaluating a B2B software platform for your team.',
    objective:
      'Share budget, timeline, problem, and decision authority so the agent can qualify you.',
    suggestedInputs: [
      'We have around $20k annual budget.',
      'We want to launch in 2 months.',
      'Our current process is manual and slow.',
      'I am the final decision maker.',
    ],
  },
  real_estate: {
    title: 'Real Estate Inquiry',
    situation: 'You are interested in buying a property and speaking with an agent.',
    objective: 'Share budget range, preferred area, move timeline, and buying authority.',
    suggestedInputs: [
      'Our budget is between $450k and $550k.',
      'We want a 3-bedroom home in North Austin.',
      'We need to move within 90 days.',
      'I am buying with my spouse and we both approve.',
    ],
  },
  healthcare: {
    title: 'Healthcare Intake',
    situation: 'You are requesting a service consultation for a clinic or care provider.',
    objective: 'Share urgency, service need, expected start date, and decision ownership.',
    suggestedInputs: [
      'We need a telehealth workflow setup.',
      'This is high priority for next quarter.',
      'We want implementation by June.',
      'I lead operations and can sign off.',
    ],
  },
  ecommerce: {
    title: 'E-Commerce Growth Call',
    situation: 'You run an online store and are evaluating a sales/operations solution.',
    objective: 'Share monthly revenue context, bottlenecks, rollout timeline, and owner.',
    suggestedInputs: [
      'We do about $80k monthly revenue.',
      'Cart abandonment and slow support are our main issues.',
      'We want this live in 4-6 weeks.',
      'I am the founder and make purchasing decisions.',
    ],
  },
  consulting: {
    title: 'Consulting Discovery',
    situation: 'You are exploring advisory support for a business initiative.',
    objective: 'Share pain points, budget band, target timeline, and stakeholder ownership.',
    suggestedInputs: [
      'We need help improving our sales process.',
      'Budget is around $15k for phase one.',
      'We want to start within 30 days.',
      'I am the department head and approve vendors.',
    ],
  },
};

export const industryLabels: Record<IndustryType, string> = {
  saas: 'SaaS',
  real_estate: 'Real Estate',
  healthcare: 'Healthcare',
  ecommerce: 'E-Commerce',
  consulting: 'Consulting',
};
