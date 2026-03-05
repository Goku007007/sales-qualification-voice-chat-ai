import type { SessionState, ActionItem } from '@/types';
import { crmAdapter } from '@/lib/adapters/crm/mockCRM';
import { ticketAdapter } from '@/lib/adapters/ticket/mockTicket';
import { calendarAdapter } from '@/lib/adapters/calendar/mockCalendar';
import { withSessionSpan } from '@/lib/tracing/spans';

export async function actionsNode(state: SessionState): Promise<Partial<SessionState>> {
  return withSessionSpan(
    state.sessionId,
    'actions_node',
    async () => {
      const actions: ActionItem[] = [];

      // Always: upsert CRM record
      const crmResult = await crmAdapter.execute(
        {
          sessionId: state.sessionId,
          industry: state.industry,
          score: state.score!,
          fields: state.leadFields,
        },
        `crm:${state.sessionId}:upsert:final`,
      );
      actions.push({ type: 'crm_upsert', result: crmResult });

      // Conditional: create tickets
      if (
        state.leadFields.decision_maker === 'not_me' ||
        state.leadFields.decision_maker === 'partial' ||
        state.leadFields.decision_maker === 'no'
      ) {
        const ticketResult = await ticketAdapter.execute(
          [
            {
              title: 'Stakeholder invitation needed',
              type: 'stakeholder_invite',
              sessionId: state.sessionId,
            },
          ],
          `ticket:${state.sessionId}:stakeholder`,
        );
        actions.push({ type: 'ticket_create', result: ticketResult });
      }

      if (state.routeDecision === 'risk') {
        const ticketResult = await ticketAdapter.execute(
          [
            {
              title: 'Risk/compliance review required',
              type: 'risk_review',
              sessionId: state.sessionId,
            },
          ],
          `ticket:${state.sessionId}:risk`,
        );
        actions.push({ type: 'ticket_create', result: ticketResult });
      }

      // Always propose times so the Meeting panel can be hydrated for every qualified session.
      const calendarResult = await calendarAdapter.execute(
        {
          durationMinutes: 30,
          daysAhead: 7,
          timezone: 'America/Chicago',
        },
        `calendar:${state.sessionId}:propose`,
      );
      actions.push({ type: 'meeting_proposed', result: calendarResult });

      return { adapterResults: actions };
    },
    {
      route_decision: state.routeDecision ?? 'unknown',
      score_label: state.scoreLabel ?? 'none',
    },
  );
}
