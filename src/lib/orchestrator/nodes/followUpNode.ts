import type { SessionState, FollowUpItem } from '@/types';
import { jobQueue } from '@/lib/scheduler/jobQueue';
import { withSessionSpan } from '@/lib/tracing/spans';

export async function followUpNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    'followup_schedule',
    async () => {
      const followUps: FollowUpItem[] = [
        { day: 1, type: 'friendly_ping', description: 'Friendly check-in', status: 'scheduled' },
        {
          day: 3,
          type: 'value_add',
          description: 'Share relevant case study',
          status: 'scheduled',
        },
        {
          day: 7,
          type: 'close_loop',
          description: 'Close-loop: still interested?',
          status: 'scheduled',
        },
      ];

      for (const fu of followUps) {
        await jobQueue.scheduleJob({
          sessionId: state.sessionId,
          type: fu.type,
          day: fu.day,
          description: fu.description,
          executeAt: new Date(Date.now() + fu.day * 24 * 60 * 60 * 1000),
        });
      }

      return { followUps };
    },
    {
      route_decision: state.routeDecision ?? 'unknown',
    },
  );
}
