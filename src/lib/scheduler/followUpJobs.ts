import { prisma } from '@/lib/db/prisma';
import { emailAdapter } from '@/lib/adapters/email/mockEmail';
import { getIndustryPack } from '@/industry-packs';
import type { FollowUpJob, JobStatus } from '@prisma/client';
import type { IndustryType } from '@/types';

const INDUSTRY_FROM_DB: Record<string, IndustryType> = {
  SAAS: 'saas',
  REAL_ESTATE: 'real_estate',
  HEALTHCARE: 'healthcare',
  ECOMMERCE: 'ecommerce',
  CONSULTING: 'consulting',
};

export async function executeFollowUpJob(job: FollowUpJob): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: job.sessionId },
    include: { messages: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // If meeting was already booked, cancel the follow-up
  if (session.outcome === 'MEETING_BOOKED') {
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: 'CANCELLED' as JobStatus, error: 'Meeting already booked' },
    });
    return;
  }

  // Check if user has replied since the job was created
  const recentMessages = session.messages.filter(
    (m) => m.role === 'USER' && m.createdAt > job.createdAt,
  );

  if (recentMessages.length > 0) {
    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: 'CANCELLED' as JobStatus, error: 'User already replied' },
    });
    return;
  }

  const industry = INDUSTRY_FROM_DB[String(session.industry)] ?? 'saas';
  const industryPack = getIndustryPack(industry);

  // Find template for this type
  const templateObj = industryPack.followUpTemplates?.find(
    (template) => template.type === job.type,
  );
  const messageBody = templateObj
    ? templateObj.template
    : `Follow-up message for ${job.description}`;

  try {
    // Send email via mock email adapter
    await emailAdapter.execute(
      {
        to: 'demo@example.com',
        subject: `Follow-up: ${job.description}`,
        body: messageBody,
      },
      `followup:${job.sessionId}:day${job.day}`,
    );

    await prisma.followUpJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED' as JobStatus, executedAt: new Date() },
    });

    await prisma.event.create({
      data: {
        sessionId: job.sessionId,
        type: 'followup_executed',
        description: `Day ${job.day} ${job.type} sent`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to execute follow up adapter: ${message}`);
  }
}
