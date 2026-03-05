// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

// Realistic distribution: 25% hot, 40% warm, 35% cold
const SCORE_DISTRIBUTION = [
  // HOT leads (25%)
  {
    score: 85,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$50k+',
      timeline: 'This quarter',
      use_case: 'CRM replacement',
      decision_maker: 'yes',
    },
  },
  {
    score: 92,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$100k+',
      timeline: 'Immediate',
      use_case: 'Pipeline automation',
      decision_maker: 'yes',
    },
  },
  {
    score: 74,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$30k-$50k',
      timeline: 'Next month',
      use_case: 'Sales analytics',
      decision_maker: 'yes',
    },
  },
  // WARM leads (40%)
  {
    score: 58,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$10k-$30k',
      timeline: 'Next quarter',
      use_case: 'Reporting',
      decision_maker: 'partial',
    },
  },
  {
    score: 45,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$15k-$25k',
      timeline: '3-6 months',
      use_case: 'Lead tracking',
      decision_maker: 'unknown',
    },
  },
  {
    score: 62,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$20k-$40k',
      timeline: 'Q3 2026',
      use_case: 'Customer onboarding',
      decision_maker: 'partial',
    },
  },
  {
    score: 51,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$10k-$20k',
      timeline: 'Evaluating',
      use_case: 'Data integration',
      decision_maker: 'no',
    },
  },
  // COLD leads (35%)
  {
    score: 22,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: null,
      timeline: 'Next year',
      use_case: 'Just browsing',
      decision_maker: 'unknown',
    },
  },
  {
    score: 15,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: '<$5k',
      timeline: 'No timeline',
      use_case: 'Research',
      decision_maker: 'no',
    },
  },
  {
    score: 28,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: null,
      timeline: '6+ months',
      use_case: 'Exploring options',
      decision_maker: 'unknown',
    },
  },
];

async function seed() {
  const industries = ['SAAS', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'CONSULTING'] as const;

  for (const industry of industries) {
    for (const profile of SCORE_DISTRIBUTION) {
      const sessionId = ulid();
      const duration = 120_000 + Math.floor(Math.random() * 480_000); // 2-10 min

      await prisma.session.create({
        data: {
          id: sessionId,
          industry: industry as any,
          currentState: 'COMPLETED',
          consentGiven: true,
          consentAt: new Date(Date.now() - Math.random() * 7 * 86_400_000), // Past week
          score: profile.score,
          scoreLabel: profile.label as any,
          scoreReasons: [`Score ${profile.score}: ${profile.fields.use_case || 'N/A'}`],
          leadFields: profile.fields,
          routeDecision: profile.label as any,
          outcome: profile.outcome as any,
          durationMs: duration,
          completedAt: new Date(),
        },
      });
    }
  }

  console.log(`Seeded ${industries.length * SCORE_DISTRIBUTION.length} sessions`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
