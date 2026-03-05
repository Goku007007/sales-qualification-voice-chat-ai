import type { DashboardMeetingState } from '@/stores/dashboardStore';

interface SessionEventWithMetadata {
  type: string;
  metadata?: Record<string, unknown> | null;
}

function toDateTime(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const dateTime = metadata.dateTime;
  if (typeof dateTime === 'string' && dateTime.length > 0) return dateTime;

  const scheduledAt = metadata.scheduledAt;
  if (typeof scheduledAt === 'string' && scheduledAt.length > 0) return scheduledAt;
  return null;
}

function toProposedTimes(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata) return [];
  const raw = metadata.proposedTimes;
  if (!Array.isArray(raw)) return [];

  return raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function meetingFromEvents(
  events: SessionEventWithMetadata[] | undefined,
): DashboardMeetingState | null {
  if (!Array.isArray(events) || events.length === 0) return null;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === 'meeting_scheduled') {
      const dateTime = toDateTime(event.metadata);
      if (!dateTime) continue;
      const meetingLink =
        typeof event.metadata?.meetingLink === 'string' ? event.metadata.meetingLink : null;

      return {
        title: 'Meeting Scheduled',
        dateTime,
        status: 'Scheduled',
        meetingLink,
        proposedTimes: [dateTime],
      };
    }

    if (event?.type !== 'meeting_proposed') continue;

    const proposedTimes = toProposedTimes(event.metadata);
    if (proposedTimes.length === 0) continue;

    return {
      title: 'Meeting Proposed',
      dateTime: proposedTimes[0],
      status: 'Proposed',
      proposedTimes,
    };
  }

  return null;
}
