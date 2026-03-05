import type { IndustryType, WorkflowState } from '@/types';
import type { DashboardLeadFields, DashboardMeetingState } from '@/stores/dashboardStore';

type SuggestionStage =
  | 'consent'
  | 'use_case'
  | 'current_solution'
  | 'timeline'
  | 'budget_range'
  | 'decision_maker'
  | 'meeting'
  | 'closure'
  | 'fallback';

interface ReplySuggestionContext {
  industry: IndustryType;
  currentState: WorkflowState;
  latestAgentMessage: string;
  leadFields: DashboardLeadFields;
  meeting: DashboardMeetingState | null;
  fallback: string[];
}

const STAGE_SUGGESTIONS: Record<SuggestionStage, Record<IndustryType, string[]>> = {
  consent: {
    saas: ['Yes, I consent to proceed.', 'Yes, continue with the qualification call.'],
    real_estate: ['Yes, I consent to continue.', 'Yes, please proceed with the questions.'],
    healthcare: ['Yes, I consent to continue.', 'Yes, proceed with the intake questions.'],
    ecommerce: ['Yes, I consent to continue.', 'Yes, continue with the discovery call.'],
    consulting: ['Yes, I consent to continue.', 'Yes, proceed with the qualification questions.'],
  },
  use_case: {
    saas: [
      'We need better CRM automation and pipeline visibility.',
      'Our sales workflow is manual and inconsistent.',
    ],
    real_estate: [
      'We are looking to buy a 3-bedroom home.',
      'We need help selling a property quickly.',
    ],
    healthcare: [
      'We need a better patient intake workflow.',
      'We want to improve telehealth operations.',
    ],
    ecommerce: [
      'We need to reduce cart abandonment.',
      'We need better order and support automation.',
    ],
    consulting: [
      'We need help improving our sales process.',
      'We need advisory support for operational efficiency.',
    ],
  },
  current_solution: {
    saas: [
      'We currently use spreadsheets and manual follow-ups.',
      'We use a basic CRM but adoption is low.',
    ],
    real_estate: [
      'We are managing this through local listings.',
      'We currently use a small broker network.',
    ],
    healthcare: ['We use spreadsheets and email today.', 'Our current process is mostly manual.'],
    ecommerce: [
      'We use spreadsheets and a few disconnected tools.',
      'We use Shopify with manual support workflows.',
    ],
    consulting: [
      'We use internal spreadsheets and ad-hoc docs.',
      'We currently have no formal process.',
    ],
  },
  timeline: {
    saas: ['We want to implement within 2 months.', 'We want this live this quarter.'],
    real_estate: ['We want to move within 90 days.', 'We need to close within 2-3 months.'],
    healthcare: ['We want implementation next quarter.', 'We need this in place within 2 months.'],
    ecommerce: ['We want this live in 4-6 weeks.', 'We need rollout within 2 months.'],
    consulting: ['We want to start within 30 days.', 'We need kickoff this quarter.'],
  },
  budget_range: {
    saas: ['Our budget is around $20k.', 'We can allocate $10k-$50k.'],
    real_estate: ['Budget is around $500k.', 'Our range is $450k-$550k.'],
    healthcare: ['Budget is around $30k.', 'We can allocate about $20k-$40k.'],
    ecommerce: ['Budget is around $15k for phase one.', 'We can allocate $10k-$25k.'],
    consulting: [
      'Budget is around $15k for phase one.',
      'We can allocate about $20k for this project.',
    ],
  },
  decision_maker: {
    saas: ['I am the primary decision maker.', 'I decide with my manager.'],
    real_estate: ['I am the primary decision maker.', 'My spouse and I decide together.'],
    healthcare: ['I can approve this purchase.', 'I decide with our operations director.'],
    ecommerce: ['I am the founder and final approver.', 'I decide with my co-founder.'],
    consulting: [
      'I am the department head and final approver.',
      'I decide with our executive team.',
    ],
  },
  meeting: {
    saas: ['Monday 10:00 AM CT works for me.', 'Tuesday 2:30 PM CT works for me.'],
    real_estate: ['Monday 10:00 AM CT works for me.', 'Tuesday 2:30 PM CT works for me.'],
    healthcare: ['Monday 10:00 AM CT works for me.', 'Tuesday 2:30 PM CT works for me.'],
    ecommerce: ['Monday 10:00 AM CT works for me.', 'Tuesday 2:30 PM CT works for me.'],
    consulting: ['Monday 10:00 AM CT works for me.', 'Tuesday 2:30 PM CT works for me.'],
  },
  closure: {
    saas: ['Thanks, that works for me.', 'Great, I will join the scheduled meeting.'],
    real_estate: ['Thanks, that works for me.', 'Great, I will join the scheduled meeting.'],
    healthcare: ['Thanks, that works for me.', 'Great, I will join the scheduled meeting.'],
    ecommerce: ['Thanks, that works for me.', 'Great, I will join the scheduled meeting.'],
    consulting: ['Thanks, that works for me.', 'Great, I will join the scheduled meeting.'],
  },
  fallback: {
    saas: ['We have around $20k annual budget.', 'We want to launch in 2 months.'],
    real_estate: ['Our budget is between $450k and $550k.', 'We need to move within 90 days.'],
    healthcare: ['This is high priority for next quarter.', 'I lead operations and can sign off.'],
    ecommerce: ['We do about $80k monthly revenue.', 'Cart abandonment is our main issue.'],
    consulting: ['Budget is around $15k for phase one.', 'We want to start within 30 days.'],
  },
};

function detectStage(
  currentState: WorkflowState,
  latestAgentMessage: string,
  leadFields: DashboardLeadFields,
  meeting: DashboardMeetingState | null,
): SuggestionStage {
  if (currentState === 'CONSENT') return 'consent';
  if (currentState === 'COMPLETED' || currentState === 'ERROR') return 'closure';
  if (currentState === 'ACTIONS' || (meeting && meeting.status.toLowerCase() === 'proposed')) {
    return 'meeting';
  }

  const agentMessage = latestAgentMessage.toLowerCase();
  if (agentMessage.includes('main challenge') || agentMessage.includes('looking to solve')) {
    return 'use_case';
  }
  if (agentMessage.includes('currently using') || agentMessage.includes('new initiative')) {
    return 'current_solution';
  }
  if (agentMessage.includes('timeline')) return 'timeline';
  if (agentMessage.includes('budget')) return 'budget_range';
  if (agentMessage.includes('who else') || agentMessage.includes('decision')) {
    return 'decision_maker';
  }

  if (!leadFields.need) return 'use_case';
  if (!leadFields.timeline) return 'timeline';
  if (!leadFields.budget) return 'budget_range';
  if (!leadFields.decisionMaker) return 'decision_maker';

  return 'fallback';
}

export function getReplySuggestions(context: ReplySuggestionContext): string[] {
  const stage = detectStage(
    context.currentState,
    context.latestAgentMessage,
    context.leadFields,
    context.meeting,
  );

  if (stage === 'meeting' && context.meeting?.dateTime) {
    const options = context.meeting.proposedTimes ?? [context.meeting.dateTime];
    if (options.length > 1) {
      return ['Option 1 works for me.', 'Option 2 works for me.'];
    }

    const meetingDate = new Date(options[0]);
    const readableMeetingDate = Number.isNaN(meetingDate.getTime())
      ? options[0]
      : meetingDate.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        });

    return [`Yes, schedule ${readableMeetingDate}.`, 'Please generate new options.'];
  }

  const stageSuggestions = STAGE_SUGGESTIONS[stage][context.industry];
  if (stageSuggestions?.length > 0) return stageSuggestions;

  return context.fallback.length > 0
    ? context.fallback.slice(0, 2)
    : STAGE_SUGGESTIONS.fallback[context.industry];
}
