import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CreateEventInput } from './types';

const prisma = new PrismaClient();

export class EventLogger {
  /**
   * Appends a new event to the session audit log (database).
   * This is an immutable, append-only operation.
   */
  async logEvent(input: CreateEventInput) {
    try {
      const event = await prisma.event.create({
        data: {
          sessionId: input.sessionId,
          type: input.type,
          description: input.description,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      return event;
    } catch (error) {
      console.error(`Failed to log event for session ${input.sessionId}:`, error);
      // We don't throw here to prevent bringing down the main orchestrator flow,
      // but in production we'd route this to a DLQ or alerting system.
      return null;
    }
  }

  /**
   * Retrieves the full event log for a given session.
   */
  async getSessionEvents(sessionId: string) {
    return prisma.event.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const eventLogger = new EventLogger();
