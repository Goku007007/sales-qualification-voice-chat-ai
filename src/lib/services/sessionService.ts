import { prisma } from '@/lib/db/prisma';
import type {
  Prisma,
  Industry as DbIndustry,
  WorkflowState as DbWorkflowState,
  MessageRole as DbMessageRole,
  MessageSource as DbMessageSource,
  ScoreLabel as DbScoreLabel,
  RouteDecision as DbRouteDecision,
  SessionOutcome as DbSessionOutcome,
  TicketType as DbTicketType,
  Priority as DbPriority,
} from '@prisma/client';
import type {
  IndustryType,
  WorkflowState,
  LeadFields,
  SessionOutcome,
  ScoreLabel,
  RouteDecision,
  MessageRole,
  MessageSource,
} from '@/types';

const INDUSTRY_TO_DB: Record<IndustryType, DbIndustry> = {
  saas: 'SAAS',
  real_estate: 'REAL_ESTATE',
  healthcare: 'HEALTHCARE',
  ecommerce: 'ECOMMERCE',
  consulting: 'CONSULTING',
};

const WORKFLOW_STATE_TO_DB: Record<WorkflowState, DbWorkflowState> = {
  CONSENT: 'CONSENT',
  OPENING: 'OPENING',
  QUALIFY_LOOP: 'QUALIFY_LOOP',
  SCORE: 'SCORE',
  ROUTE: 'ROUTE',
  ACTIONS: 'ACTIONS',
  FOLLOWUP_SCHEDULED: 'FOLLOWUP_SCHEDULED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
};

const WORKFLOW_STATE_FROM_DB: Record<string, WorkflowState> = {
  CONSENT: 'CONSENT',
  OPENING: 'OPENING',
  QUALIFY_LOOP: 'QUALIFY_LOOP',
  SCORE: 'SCORE',
  ROUTE: 'ROUTE',
  ACTIONS: 'ACTIONS',
  FOLLOWUP_SCHEDULED: 'FOLLOWUP_SCHEDULED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
};

const INDUSTRY_FROM_DB: Record<string, IndustryType> = {
  SAAS: 'saas',
  REAL_ESTATE: 'real_estate',
  HEALTHCARE: 'healthcare',
  ECOMMERCE: 'ecommerce',
  CONSULTING: 'consulting',
};

const ROLE_TO_DB: Record<MessageRole, DbMessageRole> = {
  user: 'USER',
  agent: 'AGENT',
  system: 'SYSTEM',
};

const ROLE_FROM_DB: Record<string, MessageRole> = {
  USER: 'user',
  AGENT: 'agent',
  SYSTEM: 'system',
};

const SOURCE_TO_DB: Record<MessageSource, DbMessageSource> = {
  text: 'TEXT',
  voice: 'VOICE',
};

const SOURCE_FROM_DB: Record<string, MessageSource> = {
  TEXT: 'text',
  VOICE: 'voice',
};

const SCORE_LABEL_TO_DB: Record<ScoreLabel, DbScoreLabel> = {
  cold: 'COLD',
  warm: 'WARM',
  hot: 'HOT',
};

const SCORE_LABEL_FROM_DB: Record<string, ScoreLabel> = {
  COLD: 'cold',
  WARM: 'warm',
  HOT: 'hot',
};

const OUTCOME_TO_DB: Record<SessionOutcome, DbSessionOutcome> = {
  meeting_booked: 'MEETING_BOOKED',
  nurture: 'NURTURE',
  handoff: 'HANDOFF',
  declined: 'DECLINED',
  abandoned: 'ABANDONED',
  error: 'ERROR',
};

const OUTCOME_FROM_DB: Record<string, SessionOutcome> = {
  MEETING_BOOKED: 'meeting_booked',
  NURTURE: 'nurture',
  HANDOFF: 'handoff',
  DECLINED: 'declined',
  ABANDONED: 'abandoned',
  ERROR: 'error',
};

const ROUTE_DECISION_TO_DB: Record<RouteDecision, DbRouteDecision> = {
  hot: 'HOT',
  warm: 'WARM',
  cold: 'COLD',
  risk: 'RISK',
};

const ROUTE_DECISION_FROM_DB: Record<string, RouteDecision> = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
  RISK: 'risk',
};

const TICKET_TYPE_TO_DB: Record<string, DbTicketType> = {
  stakeholder_invite: 'STAKEHOLDER_INVITE',
  risk_review: 'RISK_REVIEW',
  handoff: 'HANDOFF',
  followup: 'FOLLOWUP',
};

type TicketTypeKey = keyof typeof TICKET_TYPE_TO_DB;

const PRIORITY_TO_DB: Record<string, DbPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

type PriorityKey = keyof typeof PRIORITY_TO_DB;

export class SessionService {
  async createSession(industry: IndustryType) {
    const created = await prisma.session.create({
      data: {
        industry: INDUSTRY_TO_DB[industry],
        currentState: WORKFLOW_STATE_TO_DB.CONSENT,
      },
      include: {
        messages: true,
      },
    });

    return {
      ...created,
      industry: INDUSTRY_FROM_DB[String(created.industry)] ?? 'saas',
      currentState: WORKFLOW_STATE_FROM_DB[String(created.currentState)] ?? 'CONSENT',
    };
  }

  async getSession(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
        tickets: true,
        crmRecords: true,
        followUpJobs: true,
      },
    });

    if (!session) return null;

    return {
      ...session,
      industry: INDUSTRY_FROM_DB[String(session.industry)] ?? 'saas',
      currentState: WORKFLOW_STATE_FROM_DB[String(session.currentState)] ?? 'CONSENT',
      scoreLabel: session.scoreLabel
        ? (SCORE_LABEL_FROM_DB[String(session.scoreLabel)] ?? null)
        : null,
      routeDecision: session.routeDecision
        ? (ROUTE_DECISION_FROM_DB[String(session.routeDecision)] ?? null)
        : null,
      outcome: session.outcome ? (OUTCOME_FROM_DB[String(session.outcome)] ?? null) : null,
      messages: session.messages.map((message) => ({
        ...message,
        role: ROLE_FROM_DB[String(message.role)] ?? 'user',
        source: SOURCE_FROM_DB[String(message.source)] ?? 'text',
        timestamp: message.createdAt.toISOString(),
        metadata: (message.metadata as Record<string, unknown>) ?? {},
      })),
    };
  }

  async createMessage(input: {
    sessionId: string;
    id?: string;
    role: MessageRole;
    content: string;
    source?: MessageSource;
    metadata?: Record<string, unknown>;
  }) {
    const data: Prisma.MessageUncheckedCreateInput = {
      sessionId: input.sessionId,
      role: ROLE_TO_DB[input.role],
      content: input.content,
      source: SOURCE_TO_DB[input.source ?? 'text'],
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    };

    if (input.id) {
      data.id = input.id;
    }

    const created = await prisma.message.create({ data });

    return {
      ...created,
      role: ROLE_FROM_DB[String(created.role)] ?? 'user',
      source: SOURCE_FROM_DB[String(created.source)] ?? 'text',
      timestamp: created.createdAt.toISOString(),
      metadata: (created.metadata as Record<string, unknown>) ?? {},
    };
  }

  async updateState(id: string, state: WorkflowState) {
    await prisma.session.update({
      where: { id },
      data: {
        currentState: WORKFLOW_STATE_TO_DB[state],
      },
    });
  }

  async setConsent(id: string, consentGiven: boolean) {
    await prisma.session.update({
      where: { id },
      data: {
        consentGiven,
        consentAt: consentGiven ? new Date() : null,
      },
    });
  }

  async updateLeadFields(id: string, fields: Partial<LeadFields>) {
    const session = await prisma.session.findUnique({
      where: { id },
      select: { leadFields: true },
    });

    if (!session) throw new Error('Session not found');

    const updatedFields = {
      ...(session.leadFields as Record<string, unknown>),
      ...fields,
    };

    await prisma.session.update({
      where: { id },
      data: {
        leadFields: updatedFields,
      },
    });
  }

  async updateScore(id: string, score: number, label: ScoreLabel, reasons: string[]) {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    const safeLabel = SCORE_LABEL_TO_DB[label] ? label : 'cold';

    await prisma.session.update({
      where: { id },
      data: {
        score: safeScore,
        scoreLabel: SCORE_LABEL_TO_DB[safeLabel],
        scoreReasons: Array.isArray(reasons) ? reasons : [],
      },
    });
  }

  async updateRouteDecision(id: string, decision: RouteDecision) {
    await prisma.session.update({
      where: { id },
      data: {
        routeDecision: ROUTE_DECISION_TO_DB[decision],
      },
    });
  }

  async createCRMRecord(input: {
    sessionId: string;
    externalId?: string | null;
    provider?: string;
    status?: string;
    fields?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.cRMRecord.create({
      data: {
        sessionId: input.sessionId,
        externalId: input.externalId ?? null,
        provider: input.provider ?? 'mock',
        status: input.status ?? 'created',
        fields: (input.fields ?? {}) as Prisma.InputJsonValue,
        syncedAt: new Date(),
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async createTicket(input: {
    sessionId: string;
    title: string;
    type: TicketTypeKey;
    description?: string;
    priority?: PriorityKey;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.ticket.create({
      data: {
        sessionId: input.sessionId,
        title: input.title,
        type: TICKET_TYPE_TO_DB[input.type],
        description: input.description ?? '',
        priority: PRIORITY_TO_DB[input.priority ?? 'medium'],
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async completeSession(id: string, outcome: SessionOutcome) {
    await prisma.session.update({
      where: { id },
      data: {
        outcome: OUTCOME_TO_DB[outcome],
        completedAt: new Date(),
      },
    });
  }
}

export const sessionService = new SessionService();
