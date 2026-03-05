import type { IndustryPack } from '@/types';

export const HEALTHCARE_PACK: IndustryPack = {
  id: 'healthcare',
  name: 'Healthcare',
  description: 'Healthcare technology and medical services qualification',
  icon: '🏥',
  color: '#EF4444', // Red

  questions: [
    {
      id: 'q1',
      text: 'What healthcare challenge are you looking to address with technology?',
      targetField: 'use_case',
    },
    {
      id: 'q2',
      text: 'What systems are you currently using for this?',
      targetField: 'current_solution',
    },
    {
      id: 'q3',
      text: "What's your timeline for implementation — is there a compliance deadline?",
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: 'Has budget been allocated for this initiative?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: 'Who are the key stakeholders involved in this decision?',
      targetField: 'decision_maker',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$100k+', medium: '$20k-$100k', low: '<$20k' } },
    timeline: {
      weight: 25,
      tiers: { high: 'Immediate', medium: 'This year', low: 'Next year' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'Director/VP', medium: 'Manager', low: 'Practitioner' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Compliance requirement', medium: 'Process improvement', low: 'Exploring' },
    },
  },

  ticketTemplates: [
    {
      type: 'risk_review',
      title: '[Healthcare] HIPAA/Security review required: {company}',
      priority: 'high',
    },
    {
      type: 'handoff',
      title: '[Healthcare] Warm handoff to AE: {company}',
      priority: 'high',
    },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Following up to see if you had any questions on our solution for {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'Here is a quick overview of our HIPAA compliance certification: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    { topic: 'compliance', content: 'We are fully HIPAA compliant and sign BAAs.' },
    { topic: 'integrations', content: 'We integrate with Epic, Cerner, and other major EHRs.' },
  ],

  agentPersona:
    'You are a compliant, empathetic, and professional healthcare technology consultant.',
  industryTerms: ['HIPAA', 'EHR', 'EMR', 'PHI', 'interoperability', 'BAA'],
};
