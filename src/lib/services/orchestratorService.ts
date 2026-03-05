import { ulid } from 'ulid';
import { getIndustryPack } from '@/industry-packs';
import type { ChatMessage, SessionState, MessageSource, QualificationQuestion } from '@/types';
import { sessionService } from './sessionService';
import { eventLogger } from '../events/eventLogger';
import { sseEmitter } from '../events/sseEmitter';
import { qualifyLoopNode } from '../orchestrator/nodes/qualifyLoopNode';
import { initOpenTelemetry } from '@/lib/tracing/setup';
import { calendarAdapter } from '@/lib/adapters/calendar/mockCalendar';
import type { TimeSlot } from '@/lib/adapters/calendar/types';

initOpenTelemetry();

interface ProcessMessageOptions {
  userMessageId?: string;
  source?: MessageSource;
}

interface CRMActionData {
  externalId?: string;
  status?: string;
  url?: string;
}

interface TicketActionData {
  ticketId: string;
  url?: string;
  status?: string;
}

interface TicketDetails {
  type: 'stakeholder_invite' | 'risk_review' | 'followup';
  title: string;
  priority: 'high' | 'medium';
}

type ConsentDecision = 'accepted' | 'declined' | 'unknown';

export class OrchestrationService {
  private normalizeMessage(message: unknown): ChatMessage {
    const value = (message ?? {}) as Record<string, unknown>;
    return {
      id: typeof value.id === 'string' ? value.id : ulid(),
      role:
        value.role === 'user' || value.role === 'agent' || value.role === 'system'
          ? value.role
          : 'user',
      content: typeof value.content === 'string' ? value.content : '',
      timestamp:
        typeof value.timestamp === 'string'
          ? value.timestamp
          : value.createdAt instanceof Date
            ? value.createdAt.toISOString()
            : new Date().toISOString(),
    };
  }

  private isLeadFieldFilled(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'string') return true;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;

    return !['unknown', 'n/a', 'na', 'none'].includes(normalized);
  }

  private getCurrentQuestionIndexFromLeadFields(
    questions: QualificationQuestion[],
    leadFields: Record<string, unknown>,
  ): number {
    for (let index = 0; index < questions.length; index += 1) {
      const targetField = questions[index]?.targetField;
      if (!targetField) return index;

      if (!this.isLeadFieldFilled(leadFields[targetField])) {
        return index;
      }
    }

    return questions.length;
  }

  private buildClosureMessage(followUpCount: number, meetingDateTime?: string | null): string {
    if (meetingDateTime) {
      const meetingDate = new Date(meetingDateTime);
      const readableMeetingDate = Number.isNaN(meetingDate.getTime())
        ? meetingDateTime
        : meetingDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          });

      if (followUpCount > 0) {
        return `Thanks, I have the details I need. Your meeting is scheduled for ${readableMeetingDate}. I have also scheduled ${followUpCount} follow-up touchpoints and we will contact you soon.`;
      }

      return `Thanks, I have the details I need. Your meeting is scheduled for ${readableMeetingDate}.`;
    }

    if (followUpCount > 0) {
      return `Thanks, I have the details I need. I have scheduled ${followUpCount} follow-up touchpoints and we will contact you soon.`;
    }

    return 'Thanks, I have the details I need. Qualification is complete and we will follow up with next steps soon.';
  }

  private toReadableDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  private buildMeetingSelectionPrompt(slots: TimeSlot[]): string {
    if (slots.length === 0) {
      return 'I can share meeting options once scheduling is available. Please reply "new options" to continue.';
    }

    if (slots.length === 1) {
      return `Thanks, I have the details I need. I can schedule a 30-minute meeting for ${this.toReadableDateTime(
        slots[0].start,
      )}. Reply "yes" to confirm this time.`;
    }

    const optionOne = this.toReadableDateTime(slots[0].start);
    const optionTwo = this.toReadableDateTime(slots[1].start);

    return `Thanks, I have the details I need. I can schedule a 30-minute meeting at Option 1: ${optionOne} or Option 2: ${optionTwo}. Please reply with "Option 1" or "Option 2".`;
  }

  private parseConsentDecision(message: string): ConsentDecision {
    const text = message.trim().toLowerCase();
    if (!text) return 'unknown';

    if (/\b(do not consent|don't consent|decline|not consent|no|stop|cancel)\b/.test(text)) {
      return 'declined';
    }

    if (/\b(yes|consent|proceed|continue|sure|okay|ok|agreed|sounds good)\b/.test(text)) {
      return 'accepted';
    }

    return 'unknown';
  }

  private async persistAndEmitAgentMessage(sessionId: string, content: string) {
    const storedMessage = await sessionService.createMessage({
      sessionId,
      role: 'agent',
      content,
      source: 'text',
    });

    sseEmitter.emit(sessionId, {
      type: 'agent_message',
      payload: { message: storedMessage },
    });

    return storedMessage;
  }

  private parseCRMActionData(data: unknown): CRMActionData {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const value = data as Record<string, unknown>;
    return {
      externalId: typeof value.externalId === 'string' ? value.externalId : undefined,
      status: typeof value.status === 'string' ? value.status : undefined,
      url: typeof value.url === 'string' ? value.url : undefined,
    };
  }

  private parseMeetingTimes(data: unknown): string[] {
    if (!Array.isArray(data)) return [];

    return data
      .map((slot) => {
        if (!slot || typeof slot !== 'object') return null;
        const start = (slot as Record<string, unknown>).start;
        return typeof start === 'string' ? start : null;
      })
      .filter((start): start is string => Boolean(start));
  }

  private parseMeetingSlots(data: unknown): TimeSlot[] {
    if (!Array.isArray(data)) return [];

    return data.flatMap((slot) => {
      if (!slot || typeof slot !== 'object') return [];
      const value = slot as Record<string, unknown>;
      const start = typeof value.start === 'string' ? value.start : null;
      const end = typeof value.end === 'string' ? value.end : null;
      if (!start || !end) return [];

      return [{ start, end }];
    });
  }

  private getLatestProposedSlots(
    events: Array<{ type: string; metadata?: Record<string, unknown> | null }>,
  ): TimeSlot[] {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type !== 'meeting_proposed') continue;

      const metadata = event.metadata ?? {};
      const fromSlots = this.parseMeetingSlots(metadata.proposedSlots);
      if (fromSlots.length > 0) return fromSlots;

      const proposedTimesRaw = metadata.proposedTimes;
      if (!Array.isArray(proposedTimesRaw)) continue;

      const fromTimes = proposedTimesRaw.flatMap((item) => {
        if (typeof item !== 'string') return [];
        const start = new Date(item);
        if (Number.isNaN(start.getTime())) return [];

        return [
          {
            start: start.toISOString(),
            end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
          },
        ];
      });

      if (fromTimes.length > 0) return fromTimes;
    }

    return [];
  }

  private selectMeetingSlot(message: string, slots: TimeSlot[]): TimeSlot | null {
    if (slots.length === 0) return null;
    if (slots.length === 1) return slots[0];

    const text = message.trim().toLowerCase();
    if (!text) return null;

    if (
      text.includes('option 1') ||
      text.includes('first') ||
      text.includes('1st') ||
      text.includes('one')
    ) {
      return slots[0];
    }
    if (
      text.includes('option 2') ||
      text.includes('second') ||
      text.includes('2nd') ||
      text.includes('two')
    ) {
      return slots[1] ?? slots[0];
    }

    for (const slot of slots) {
      const slotDate = new Date(slot.start);
      if (Number.isNaN(slotDate.getTime())) continue;

      const dayShort = slotDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const dayLong = slotDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hour = slotDate
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
        .toLowerCase();

      if (
        text.includes(dayShort) ||
        text.includes(dayLong) ||
        text.includes(hour) ||
        text.includes(slot.start.toLowerCase())
      ) {
        return slot;
      }
    }

    return null;
  }

  private parseTicketActionData(data: unknown): TicketActionData[] {
    if (!Array.isArray(data)) return [];

    return data.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Record<string, unknown>;
      const ticketId = typeof value.ticketId === 'string' ? value.ticketId : null;
      if (!ticketId) return [];

      return [
        {
          ticketId,
          url: typeof value.url === 'string' ? value.url : undefined,
          status: typeof value.status === 'string' ? value.status : undefined,
        },
      ];
    });
  }

  private inferTicketDetails(idempotencyKey: string): TicketDetails {
    if (idempotencyKey.includes(':stakeholder')) {
      return {
        type: 'stakeholder_invite',
        title: 'Stakeholder invitation needed',
        priority: 'high',
      };
    }

    if (idempotencyKey.includes(':risk')) {
      return {
        type: 'risk_review',
        title: 'Risk/compliance review required',
        priority: 'high',
      };
    }

    return {
      type: 'followup',
      title: 'Follow-up action created',
      priority: 'medium',
    };
  }

  async processMessage(
    sessionId: string,
    message: string,
    options: ProcessMessageOptions = {},
  ): Promise<void> {
    const initialSession = await sessionService.getSession(sessionId);
    if (!initialSession) throw new Error('Session not found');

    const messageSource = options.source ?? 'text';
    let resolvedUserMessageId = options.userMessageId;

    // Fallback path for callers that invoke orchestration directly (without API route persistence).
    if (!resolvedUserMessageId) {
      const persistedUserMessage = await sessionService.createMessage({
        sessionId,
        id: ulid(),
        role: 'user',
        content: message,
        source: messageSource,
        metadata: { source: messageSource },
      });

      resolvedUserMessageId = persistedUserMessage.id;

      await eventLogger.logEvent({
        sessionId,
        type: 'user_message',
        description: 'Received user message',
        metadata: {
          messageId: persistedUserMessage.id,
          contentLength: message.length,
          source: messageSource,
        },
      });
    }

    const session = await sessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found after persistence');

    const industryPack = getIndustryPack(session.industry);
    const messages = session.messages.map((m) => this.normalizeMessage(m));

    if (!messages.some((m) => m.id === resolvedUserMessageId)) {
      messages.push({
        id: resolvedUserMessageId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });
    }

    const derivedQuestionIndexFromFields = this.getCurrentQuestionIndexFromLeadFields(
      industryPack.questions,
      (session.leadFields ?? {}) as Record<string, unknown>,
    );

    const derivedQuestionIndex =
      session.currentState === 'QUALIFY_LOOP'
        ? Math.min(derivedQuestionIndexFromFields, Math.max(industryPack.questions.length - 1, 0))
        : 0;

    const state: SessionState = {
      sessionId: session.id,
      industry: session.industry,
      messages,
      currentQuestionIndex: derivedQuestionIndex,
      totalQuestions: industryPack.questions.length,
      leadFields: (session.leadFields ?? {}) as SessionState['leadFields'],
      extractionConfidences: {},
      score: session.score,
      scoreLabel: session.scoreLabel,
      scoreReasons: [],
      routeDecision: null,
      consentGiven: session.currentState !== 'CONSENT',
      consentTimestamp: session.consentAt ? new Date(session.consentAt).toISOString() : null,
      adapterResults: [],
      pendingActions: [],
      followUps: [],
      currentState: session.currentState,
      stateHistory: [],
      errorCount: 0,
      lastError: null,
    };

    try {
      if (state.currentState === 'CONSENT') {
        const consentDecision = this.parseConsentDecision(message);

        if (consentDecision === 'declined') {
          await this.persistAndEmitAgentMessage(
            sessionId,
            'Understood. I will close this demo session. If you want to continue later, start a new session.',
          );

          await eventLogger.logEvent({
            sessionId,
            type: 'consent_declined',
            description: 'User declined consent',
            metadata: {},
          });

          await sessionService.updateState(sessionId, 'COMPLETED');
          await sessionService.completeSession(sessionId, 'declined');
          sseEmitter.emit(sessionId, {
            type: 'state_transition',
            payload: { from: 'CONSENT', to: 'COMPLETED' },
          });
          sseEmitter.emit(sessionId, {
            type: 'session_completed',
            payload: {},
          });
          return;
        }

        if (consentDecision !== 'accepted') {
          await this.persistAndEmitAgentMessage(
            sessionId,
            'Before we continue, please confirm consent by replying "yes" or "no".',
          );
          return;
        }

        await sessionService.setConsent(sessionId, true);
        await eventLogger.logEvent({
          sessionId,
          type: 'consent_received',
          description: 'User provided consent',
          metadata: {},
        });

        const firstQuestion = industryPack.questions[0]?.text;
        const openingMessage = firstQuestion
          ? `Great, thanks for confirming. ${firstQuestion}`
          : 'Great, thanks for confirming. Let’s continue.';

        await this.persistAndEmitAgentMessage(sessionId, openingMessage);
        await sessionService.updateState(sessionId, 'QUALIFY_LOOP');
        sseEmitter.emit(sessionId, {
          type: 'state_transition',
          payload: { from: 'CONSENT', to: 'QUALIFY_LOOP' },
        });
        return;
      }

      if (state.currentState === 'QUALIFY_LOOP') {
        const updates = await qualifyLoopNode(state);

        if (updates.leadFields) {
          for (const [k, v] of Object.entries(updates.leadFields)) {
            if (v && state.leadFields[k as keyof typeof state.leadFields] !== v) {
              sseEmitter.emit(sessionId, {
                type: 'field_extracted',
                payload: {
                  field: k as keyof SessionState['leadFields'],
                  value: String(v),
                  confidence: 1,
                },
              });
            }
          }
          await sessionService.updateLeadFields(sessionId, updates.leadFields);
        }

        const newAgentMsg = updates.messages?.[updates.messages.length - 1];
        if (newAgentMsg?.role === 'agent' && newAgentMsg.content) {
          await this.persistAndEmitAgentMessage(sessionId, newAgentMsg.content);
        }

        const { qualifyRouter } = await import('../orchestrator/nodes/qualifyLoopNode');
        const routerResult = qualifyRouter({ ...state, ...updates });

        if (routerResult === 'complete') {
          const { scoreNode } = await import('../orchestrator/nodes/scoreNode');
          const { routeNode } = await import('../orchestrator/nodes/routeNode');
          const { actionsNode } = await import('../orchestrator/nodes/actionsNode');
          const { followUpNode } = await import('../orchestrator/nodes/followUpNode');

          const scoreUpdates = await scoreNode({ ...state, ...updates });
          const nextScore = scoreUpdates.score;
          const nextScoreLabel = scoreUpdates.scoreLabel;

          if (
            typeof nextScore === 'number' &&
            (nextScoreLabel === 'cold' || nextScoreLabel === 'warm' || nextScoreLabel === 'hot')
          ) {
            await sessionService.updateScore(
              sessionId,
              nextScore,
              nextScoreLabel,
              scoreUpdates.scoreReasons || [],
            );
            sseEmitter.emit(sessionId, {
              type: 'score_updated',
              payload: {
                score: nextScore,
                label: nextScoreLabel,
                reasons: scoreUpdates.scoreReasons || [],
              },
            });
          }

          const routeUpdates = await routeNode({ ...state, ...updates, ...scoreUpdates });
          if (routeUpdates.routeDecision) {
            await sessionService.updateRouteDecision(sessionId, routeUpdates.routeDecision);
          }

          const actionsUpdates = await actionsNode({
            ...state,
            ...updates,
            ...scoreUpdates,
            ...routeUpdates,
          });

          const proposedSlotsFromActions: TimeSlot[] = [];
          if (actionsUpdates.adapterResults) {
            for (const action of actionsUpdates.adapterResults) {
              if (action.type === 'crm_upsert') {
                const crmData = this.parseCRMActionData(action.result.data);
                const mergedFields = {
                  ...state.leadFields,
                  ...(updates.leadFields ?? {}),
                };

                await sessionService.createCRMRecord({
                  sessionId,
                  externalId: crmData.externalId ?? null,
                  provider: 'mock',
                  status: crmData.status ?? 'created',
                  fields: mergedFields as Record<string, unknown>,
                  metadata: {
                    source: 'actions_node',
                    adapterResult: action.result.success ? 'success' : 'failed',
                    url: crmData.url ?? null,
                  },
                });

                sseEmitter.emit(sessionId, {
                  type: 'crm_updated',
                  payload: {
                    externalId: crmData.externalId ?? `mock-crm-${sessionId}`,
                    status: crmData.status ?? 'created',
                  },
                });
              }

              if (action.type === 'meeting_proposed') {
                const proposedTimes = this.parseMeetingTimes(action.result.data);
                const proposedSlots = this.parseMeetingSlots(action.result.data);
                if (proposedSlots.length > 0) {
                  proposedSlotsFromActions.push(...proposedSlots);
                }
                sseEmitter.emit(sessionId, {
                  type: 'meeting_proposed',
                  payload: {
                    proposedTimes,
                    proposedSlots,
                  },
                });

                await eventLogger.logEvent({
                  sessionId,
                  type: 'meeting_proposed',
                  description:
                    proposedTimes.length > 0
                      ? 'Meeting time options proposed'
                      : 'Meeting proposal generated',
                  metadata: {
                    proposedTimes,
                    proposedSlots,
                  },
                });
              }

              if (action.type === 'ticket_create') {
                const tickets = this.parseTicketActionData(action.result.data);
                const details = this.inferTicketDetails(action.result.metadata.idempotencyKey);

                for (const ticket of tickets) {
                  await sessionService.createTicket({
                    sessionId,
                    title: details.title,
                    type: details.type,
                    description: details.title,
                    priority: details.priority,
                    metadata: {
                      externalTicketId: ticket.ticketId,
                      externalStatus: ticket.status ?? null,
                      externalUrl: ticket.url ?? null,
                      source: 'mock_ticket',
                    },
                  });

                  sseEmitter.emit(sessionId, {
                    type: 'ticket_created',
                    payload: {
                      ticketId: ticket.ticketId,
                      type: details.type,
                      title: details.title,
                    },
                  });
                }
              }
            }
          }

          if (proposedSlotsFromActions.length > 0) {
            await this.persistAndEmitAgentMessage(
              sessionId,
              this.buildMeetingSelectionPrompt(proposedSlotsFromActions),
            );
            await sessionService.updateState(sessionId, 'ACTIONS');
            sseEmitter.emit(sessionId, {
              type: 'state_transition',
              payload: { from: 'QUALIFY_LOOP', to: 'ACTIONS' },
            });
            return;
          }

          const followUpUpdates = await followUpNode({
            ...state,
            ...updates,
            ...scoreUpdates,
            ...routeUpdates,
            ...actionsUpdates,
          });

          if (followUpUpdates.followUps) {
            for (const fu of followUpUpdates.followUps) {
              sseEmitter.emit(sessionId, {
                type: 'followup_scheduled',
                payload: { jobId: ulid(), day: fu.day, type: fu.type },
              });
              await eventLogger.logEvent({
                sessionId,
                type: 'followup_scheduled',
                description: `Follow-up scheduled for day ${fu.day}`,
                metadata: { day: fu.day, type: fu.type },
              });
            }
          }

          await this.persistAndEmitAgentMessage(
            sessionId,
            this.buildClosureMessage(followUpUpdates.followUps?.length ?? 0, null),
          );

          await sessionService.updateState(sessionId, 'COMPLETED');
          await sessionService.completeSession(sessionId, 'nurture');
          sseEmitter.emit(sessionId, {
            type: 'state_transition',
            payload: { from: 'QUALIFY_LOOP', to: 'COMPLETED' },
          });
          sseEmitter.emit(sessionId, {
            type: 'session_completed',
            payload: {},
          });
        }
        return;
      }

      if (state.currentState === 'ACTIONS') {
        const proposedSlots = this.getLatestProposedSlots(
          (session.events ?? []) as Array<{
            type: string;
            metadata?: Record<string, unknown> | null;
          }>,
        );

        if (proposedSlots.length === 0) {
          await this.persistAndEmitAgentMessage(
            sessionId,
            'I could not find active meeting options. Please reply "new options" and I will generate fresh time slots.',
          );
          return;
        }

        const selectedSlot = this.selectMeetingSlot(message, proposedSlots);
        if (!selectedSlot) {
          await this.persistAndEmitAgentMessage(
            sessionId,
            `Please confirm one option so I can schedule the meeting. ${this.buildMeetingSelectionPrompt(
              proposedSlots,
            )}`,
          );
          return;
        }

        const booking = await calendarAdapter.bookSlot(
          selectedSlot,
          'lead@example.com',
          `calendar:${sessionId}:book:selected`,
        );

        if (!booking.success) {
          await this.persistAndEmitAgentMessage(
            sessionId,
            'I could not book that slot yet. Please choose an option again and I will retry.',
          );
          return;
        }

        sseEmitter.emit(sessionId, {
          type: 'meeting_scheduled',
          payload: {
            dateTime: selectedSlot.start,
            meetingLink: booking.data?.meetingLink,
            status: 'Scheduled',
          },
        });

        await eventLogger.logEvent({
          sessionId,
          type: 'meeting_scheduled',
          description: 'Meeting scheduled',
          metadata: {
            dateTime: selectedSlot.start,
            meetingLink: booking.data?.meetingLink ?? null,
            eventId: booking.data?.eventId ?? null,
          },
        });

        const { followUpNode } = await import('../orchestrator/nodes/followUpNode');
        const followUpUpdates = await followUpNode({
          ...state,
          adapterResults: [{ type: 'meeting_booked', result: booking }],
        });

        if (followUpUpdates.followUps) {
          for (const fu of followUpUpdates.followUps) {
            sseEmitter.emit(sessionId, {
              type: 'followup_scheduled',
              payload: { jobId: ulid(), day: fu.day, type: fu.type },
            });
            await eventLogger.logEvent({
              sessionId,
              type: 'followup_scheduled',
              description: `Follow-up scheduled for day ${fu.day}`,
              metadata: { day: fu.day, type: fu.type },
            });
          }
        }

        await this.persistAndEmitAgentMessage(
          sessionId,
          this.buildClosureMessage(followUpUpdates.followUps?.length ?? 0, selectedSlot.start),
        );

        await sessionService.updateState(sessionId, 'COMPLETED');
        await sessionService.completeSession(sessionId, 'meeting_booked');
        sseEmitter.emit(sessionId, {
          type: 'state_transition',
          payload: { from: 'ACTIONS', to: 'COMPLETED' },
        });
        sseEmitter.emit(sessionId, {
          type: 'session_completed',
          payload: {},
        });
      }
    } catch (error) {
      console.error(error);
      sseEmitter.emit(sessionId, {
        type: 'error',
        payload: { code: 'EXECUTION_FAILED', message: 'Failed to process message' },
      });
    } finally {
      sseEmitter.emit(sessionId, {
        type: 'agent_typing',
        payload: { isTyping: false },
      });
    }
  }
}

export const orchestrationService = new OrchestrationService();
