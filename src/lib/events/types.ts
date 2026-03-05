import type { WorkflowState, ChatMessage, LeadFields, ScoreLabel } from '@/types';

// Payload Types
export interface AgentMessagePayload {
  message: ChatMessage;
}

export interface StateTransitionPayload {
  from: WorkflowState;
  to: WorkflowState;
  trigger?: string;
}

export interface FieldExtractedPayload {
  field: keyof LeadFields;
  value: string;
  confidence: number;
}

export interface ScoreUpdatedPayload {
  score: number;
  label: ScoreLabel;
  reasons: string[];
}

export interface CRMUpdatedPayload {
  externalId: string;
  status: string;
}

export interface TicketCreatedPayload {
  ticketId: string;
  type: string;
  title: string;
}

export interface FollowUpPayload {
  jobId: string;
  day: number;
  type: string;
}

export interface MeetingPayload {
  proposedTimes: string[];
  proposedSlots?: Array<{
    start: string;
    end: string;
  }>;
}

export interface MeetingScheduledPayload {
  dateTime: string;
  meetingLink?: string;
  status: string;
}

// Emitted Event Type (Union)
export type SSEResponseEvent =
  | { type: 'agent_message'; payload: AgentMessagePayload }
  | { type: 'agent_typing'; payload: { isTyping: boolean } }
  | { type: 'state_transition'; payload: StateTransitionPayload }
  | { type: 'field_extracted'; payload: FieldExtractedPayload }
  | { type: 'score_updated'; payload: ScoreUpdatedPayload }
  | { type: 'crm_updated'; payload: CRMUpdatedPayload }
  | { type: 'ticket_created'; payload: TicketCreatedPayload }
  | { type: 'followup_scheduled'; payload: FollowUpPayload }
  | { type: 'meeting_proposed'; payload: MeetingPayload }
  | { type: 'meeting_scheduled'; payload: MeetingScheduledPayload }
  | { type: 'session_completed'; payload: Record<string, never> }
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'heartbeat'; payload: { timestamp: string } };

export interface CreateEventInput {
  sessionId: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}
