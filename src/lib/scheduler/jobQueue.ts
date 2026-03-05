import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { JobStatus } from '@prisma/client';

export interface ScheduleJobInput {
  sessionId: string;
  type: string;
  day: number;
  description: string;
  executeAt: Date;
  payload?: Prisma.InputJsonValue;
}

export class JobQueue {
  async scheduleJob(input: ScheduleJobInput) {
    return prisma.followUpJob.create({
      data: {
        sessionId: input.sessionId,
        type: input.type,
        day: input.day,
        description: input.description,
        executeAt: input.executeAt,
        payload: input.payload || {},
      },
    });
  }

  async getPendingJobs(limit: number = 10) {
    return prisma.followUpJob.findMany({
      where: {
        status: 'SCHEDULED' as JobStatus,
        executeAt: { lte: new Date() },
      },
      orderBy: { executeAt: 'asc' },
      take: limit,
      include: {
        session: true,
      },
    });
  }

  async updateJobStatus(id: string, status: JobStatus, error?: string) {
    return prisma.followUpJob.update({
      where: { id },
      data: {
        status,
        error: error || null,
        ...(status === 'COMPLETED' ? { executedAt: new Date() } : {}),
      },
    });
  }

  async incrementRetryCount(id: string) {
    return prisma.followUpJob.update({
      where: { id },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });
  }
}

export const jobQueue = new JobQueue();
