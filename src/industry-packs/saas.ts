import type { IndustryPack } from '@/types';

export const SAAS_PACK: IndustryPack = {
  id: 'saas',
  name: 'SaaS / Software',
  description: 'B2B software and cloud services qualification',
  icon: '💻',
  color: '#6366F1', // Indigo

  questions: [
    {
      id: 'q1_use_case',
      text: "What's the main challenge you're looking to solve with our platform?",
      targetField: 'use_case',
      followUpIf: 'vague',
      followUpPrompt: 'Could you give me a specific example of where this is causing friction?',
    },
    {
      id: 'q2_current_solution',
      text: 'What are you currently using to handle this? Or is this a new initiative?',
      targetField: 'current_solution',
      followUpIf: 'none',
      followUpPrompt: 'No worries! How are you managing it today — spreadsheets, manual process?',
    },
    {
      id: 'q3_timeline',
      text: "What's your ideal timeline to get something in place?",
      targetField: 'timeline',
      followUpIf: 'vague',
      followUpPrompt: 'Is this more of a this-quarter urgency or a longer-term evaluation?',
    },
    {
      id: 'q4_budget',
      text: 'Do you have a budget range allocated for this type of solution?',
      targetField: 'budget_range',
      followUpIf: 'missing',
      followUpPrompt: 'Even a rough range helps — are we talking under $10k, $10-50k, or $50k+?',
    },
    {
      id: 'q5_decision',
      text: 'Who else would be involved in making this decision?',
      targetField: 'decision_maker',
      followUpIf: 'unclear',
      followUpPrompt:
        'Would you be the primary decision-maker, or would we need to loop in someone else?',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$50k+', medium: '$10k-$50k', low: '<$10k' } },
    timeline: {
      weight: 25,
      tiers: { high: 'This quarter', medium: 'Next quarter', low: '6+ months' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'Decision maker', medium: 'Influencer', low: 'Researcher' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Active pain point', medium: 'Exploring', low: 'Just browsing' },
    },
  },

  ticketTemplates: [
    {
      type: 'stakeholder_invite',
      title: '[SaaS] Invite decision-maker: {company}',
      priority: 'high',
    },
    {
      type: 'risk_review',
      title: '[SaaS] Security/compliance review: {company}',
      priority: 'high',
    },
    { type: 'handoff', title: '[SaaS] Warm handoff to AE: {company}', priority: 'medium' },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Just following up on our conversation about {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'I thought you might find this case study relevant: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    {
      topic: 'pricing',
      content: 'Plans start at $49/mo for Starter, $149/mo for Pro, custom for Enterprise.',
    },
    {
      topic: 'integrations',
      content: 'We integrate with Salesforce, HubSpot, Slack, and 200+ tools via Zapier.',
    },
    { topic: 'security', content: 'SOC 2 Type II certified, GDPR compliant, SSO via SAML 2.0.' },
    { topic: 'onboarding', content: 'Typical onboarding takes 2-4 weeks with a dedicated CSM.' },
  ],

  agentPersona: 'You are a friendly, professional SaaS sales development representative.',
  industryTerms: ['MRR', 'ARR', 'churn', 'seats', 'API', 'integration', 'SSO', 'SOC 2'],
};
