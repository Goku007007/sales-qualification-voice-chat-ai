// --- Industry Types ---
export type IndustryType = 'saas' | 'real_estate' | 'healthcare' | 'ecommerce' | 'consulting';

// --- Workflow States ---
export type WorkflowState =
  | 'CONSENT'
  | 'OPENING'
  | 'QUALIFY_LOOP'
  | 'SCORE'
  | 'ROUTE'
  | 'ACTIONS'
  | 'FOLLOWUP_SCHEDULED'
  | 'COMPLETED'
  | 'ERROR';

// --- Scoring ---
export type ScoreLabel = 'cold' | 'warm' | 'hot';
export type RouteDecision = 'hot' | 'warm' | 'cold' | 'risk';

// --- Session ---
export type SessionOutcome =
  | 'meeting_booked'
  | 'nurture'
  | 'handoff'
  | 'declined'
  | 'abandoned'
  | 'error';

// --- Messages ---
export type MessageRole = 'user' | 'agent' | 'system';
export type MessageSource = 'text' | 'voice';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  source?: MessageSource;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// --- Lead Fields ---
export interface LeadFields {
  budget_range: string | null;
  timeline: string | null;
  use_case: string | null;
  decision_maker: string | null;
  current_solution: string | null;
  pain_points: string | null;
  company_size: string | null;
  urgency: 'low' | 'medium' | 'high' | 'critical' | null;
}

// --- Events ---
export interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// --- Session State (Orchestrator) ---
export interface SessionState {
  sessionId: string;
  industry: IndustryType;
  messages: ChatMessage[];
  currentQuestionIndex: number;
  totalQuestions: number;
  leadFields: Partial<LeadFields>;
  extractionConfidences: Record<string, number>;
  score: number | null;
  scoreLabel: ScoreLabel | null;
  scoreReasons: string[];
  routeDecision: RouteDecision | null;
  consentGiven: boolean;
  consentTimestamp: string | null;
  adapterResults: ActionItem[];
  pendingActions: ActionItem[];
  followUps: FollowUpItem[];
  currentState: WorkflowState;
  stateHistory: StateTransition[];
  errorCount: number;
  lastError: string | null;
}

// --- Adapter Types ---
export interface AdapterResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  metadata: {
    idempotencyKey: string;
    durationMs: number;
    retryCount: number;
    timestamp: string;
  };
}

export interface ActionItem {
  type: string;
  result: AdapterResult;
}

export interface FollowUpItem {
  day: number;
  type: 'friendly_ping' | 'value_add' | 'close_loop';
  description: string;
  status: 'scheduled' | 'sent' | 'opened' | 'cancelled' | 'failed';
}

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  timestamp: string;
  trigger: string;
}

// --- Industry Pack ---
export interface QualificationQuestion {
  id: string;
  text: string;
  targetField: keyof LeadFields;
  followUpIf?: string;
  followUpPrompt?: string;
}

export interface ScoringRubric {
  budget: { weight: number; tiers: Record<string, string> };
  timeline: { weight: number; tiers: Record<string, string> };
  authority: { weight: number; tiers: Record<string, string> };
  need: { weight: number; tiers: Record<string, string> };
}

export interface IndustryPack {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  color: string;
  questions: QualificationQuestion[];
  scoringRubric: ScoringRubric;
  ticketTemplates: { type: string; title: string; priority: string }[];
  followUpTemplates: { day: number; type: string; template: string }[];
  knowledgeBase: { topic: string; content: string }[];
  agentPersona: string;
  industryTerms: string[];
}

// --- SSE Events ---
export type SSEEventType =
  | 'agent_message'
  | 'agent_typing'
  | 'state_transition'
  | 'field_extracted'
  | 'score_updated'
  | 'crm_updated'
  | 'ticket_created'
  | 'followup_scheduled'
  | 'meeting_proposed'
  | 'meeting_scheduled'
  | 'session_completed'
  | 'error'
  | 'heartbeat';

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

// --- API Types ---
export interface CreateSessionRequest {
  industry: IndustryType;
}

export interface SendMessageRequest {
  content: string;
  metadata?: {
    source?: MessageSource;
  };
}

// --- Provider Interfaces ---
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
