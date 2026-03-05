import type { IndustryPack } from '@/types';

export const REAL_ESTATE_PACK: IndustryPack = {
  id: 'real_estate',
  name: 'Real Estate',
  description: 'Property services and real estate technology qualification',
  icon: '🏠',
  color: '#10B981', // Emerald

  questions: [
    {
      id: 'q1',
      text: 'What type of property are you looking to buy, sell, or manage?',
      targetField: 'use_case',
    },
    { id: 'q2', text: 'What area or market are you focused on?', targetField: 'current_solution' },
    {
      id: 'q3',
      text: "What's your timeline — are you looking to move quickly or still exploring?",
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: 'Do you have a budget range in mind for this investment?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: 'Are you the primary decision-maker, or are there partners involved?',
      targetField: 'decision_maker',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$1M+', medium: '$500k-$1M', low: '<$500k' } },
    timeline: {
      weight: 25,
      tiers: { high: 'Immediate', medium: '3-6 months', low: 'Testing the market' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'Owner/Investor', medium: 'Partner', low: 'Browsing' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Pre-approved', medium: 'Exploring options', low: 'Just browsing' },
    },
  },

  ticketTemplates: [
    {
      type: 'handoff',
      title: '[Real Estate] Warm handoff to Agent: {company}',
      priority: 'high',
    },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Following up on our property discussion about {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'Here are some recent market trends you might find useful: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    {
      topic: 'markets',
      content: 'We cover residential and commercial properties in the Metro area.',
    },
    {
      topic: 'fees',
      content: 'Our standard commission is competitive and negotiable based on volume.',
    },
  ],

  agentPersona: 'You are a professional and attentive Real Estate agent assistant.',
  industryTerms: ['MLS', 'escrow', 'cap rate', 'zoning', 'appraisal'],
};
