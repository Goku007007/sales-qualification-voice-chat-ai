import type { IndustryPack } from '@/types';

export const CONSULTING_PACK: IndustryPack = {
  id: 'consulting',
  name: 'Consulting',
  description: 'Professional services and management consulting qualification',
  icon: '📊',
  color: '#8B5CF6', // Violet

  questions: [
    {
      id: 'q1',
      text: 'What type of consulting engagement are you looking for?',
      targetField: 'use_case',
    },
    {
      id: 'q2',
      text: 'Have you worked with consultants on this type of project before?',
      targetField: 'current_solution',
    },
    { id: 'q3', text: 'When do you need this engagement to start?', targetField: 'timeline' },
    {
      id: 'q4',
      text: 'Do you have a budget range for consulting services?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: "Who's the executive sponsor for this initiative?",
      targetField: 'decision_maker',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$250k+', medium: '$50k-$250k', low: '<$50k' } },
    timeline: {
      weight: 25,
      tiers: { high: 'Immediate', medium: 'Q2/Q3', low: 'Next year' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'C-Level Sponsor', medium: 'VP/Director', low: 'Individual Contributor' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Strategic pivot', medium: 'Process scaling', low: 'Information gathering' },
    },
  },

  ticketTemplates: [
    {
      type: 'handoff',
      title: '[Consulting] Warm handoff to Partner: {company}',
      priority: 'high',
    },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Just following up on our advisory chat regarding {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'I thought this whitepaper might be relevant to your strategy: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    { topic: 'services', content: 'We offer Strategy, Transformation, and Operations advisory.' },
    { topic: 'timeline', content: 'Typical engagements run from 3 months to 1 year.' },
  ],

  agentPersona: 'You are a poised, strategic management consultant advisor.',
  industryTerms: [
    'engagement',
    'SOW',
    'deliverables',
    'framework',
    'stakeholder',
    'operating model',
  ],
};
