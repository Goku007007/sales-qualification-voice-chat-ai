import type { IndustryPack } from '@/types';

export const ECOMMERCE_PACK: IndustryPack = {
  id: 'ecommerce',
  name: 'E-Commerce',
  description: 'Online retail and marketplace qualification',
  icon: '🛒',
  color: '#F59E0B', // Amber

  questions: [
    {
      id: 'q1',
      text: "What's the biggest challenge you're facing with your online store?",
      targetField: 'use_case',
    },
    { id: 'q2', text: 'Which platform are you currently using?', targetField: 'current_solution' },
    {
      id: 'q3',
      text: 'When are you looking to make changes — before the next peak season?',
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: "What's your monthly revenue range so I can recommend the right tier?",
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: "Are you the person who'll decide on this, or should we include someone else?",
      targetField: 'decision_maker',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$1M+/mo', medium: '$100k-$1M/mo', low: '<$100k/mo' } },
    timeline: {
      weight: 25,
      tiers: { high: 'Immediately', medium: 'Before BFCM', low: 'Next year' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'Owner/Founder', medium: 'E-comm Director', low: 'Specialist' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Conversion block', medium: 'Optimization', low: 'Exploration' },
    },
  },

  ticketTemplates: [
    {
      type: 'handoff',
      title: '[Ecom] Warm handoff to AE: {company}',
      priority: 'medium',
    },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Just following up on our chat about optimizing {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'Check out how this similar brand boosted conversions: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    {
      topic: 'platforms',
      content: 'We integrate tightly with Shopify, BigCommerce, and WooCommerce.',
    },
  ],

  agentPersona: 'You are an e-commerce growth expert helping brands scale.',
  industryTerms: ['AOV', 'LTV', 'conversion rate', 'abandoned cart', 'ROAS', 'BFCM'],
};
