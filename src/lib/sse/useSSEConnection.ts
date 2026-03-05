import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useChatStore } from '@/stores/chatStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ulid } from 'ulid';
import { toDashboardLeadFieldLabel } from '@/lib/dashboard/leadFieldMapping';
import { meetingFromEvents } from '@/lib/dashboard/meetingMapping';

export function useSSEConnection(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const sessionStore = useSessionStore.getState();
    const chatStore = useChatStore.getState();
    const dashboardStore = useDashboardStore.getState();

    sessionStore.setConnected(false);

    const eventSource = new EventSource(`/api/sessions/${sessionId}/events`);

    eventSource.onopen = () => {
      sessionStore.setConnected(true);
    };

    eventSource.addEventListener('message', (e) => {
      try {
        const event = JSON.parse(e.data);

        switch (event.type) {
          case 'connected':
            sessionStore.setConnected(true);
            break;

          case 'agent_message':
            chatStore.addMessage(event.payload.message);
            chatStore.setAgentTyping(false);
            break;

          case 'state_transition':
            sessionStore.setCurrentState(event.payload.to);
            dashboardStore.addEvent({
              id: ulid(),
              type: 'state_transition',
              description: `Agent reached ${event.payload.to} phase`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'field_extracted':
            dashboardStore.updateLeadField(event.payload.field, event.payload.value);
            dashboardStore.addEvent({
              id: ulid(),
              type: 'field_extracted',
              description: `Identified ${toDashboardLeadFieldLabel(event.payload.field)} as ${event.payload.value}`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'meeting_proposed':
            if (event.payload.proposedTimes && event.payload.proposedTimes.length > 0) {
              dashboardStore.setMeeting({
                title: 'Meeting Proposed',
                dateTime: event.payload.proposedTimes[0],
                status: 'Proposed',
                proposedTimes: event.payload.proposedTimes,
              });
            }
            break;

          case 'meeting_scheduled':
            dashboardStore.setMeeting({
              title: 'Meeting Scheduled',
              dateTime: event.payload.dateTime,
              status: event.payload.status || 'Scheduled',
              meetingLink: event.payload.meetingLink || null,
              proposedTimes: [event.payload.dateTime],
            });
            dashboardStore.addEvent({
              id: ulid(),
              type: 'meeting_scheduled',
              description: `Meeting scheduled for ${event.payload.dateTime}`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'followup_scheduled':
            const newFollowUp = {
              day: event.payload.day,
              label: event.payload.type,
              description: 'Follow-up',
              status: 'scheduled',
            };
            dashboardStore.addFollowUp(newFollowUp);
            dashboardStore.addEvent({
              id: ulid(),
              type: 'followup_scheduled',
              description: `Follow-up sequence created: Day ${event.payload.day} (${event.payload.type})`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'crm_updated':
            dashboardStore.addEvent({
              id: ulid(),
              type: 'crm_updated',
              description: `CRM lead ${event.payload.status}: ${event.payload.externalId}`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'ticket_created':
            dashboardStore.addEvent({
              id: ulid(),
              type: 'ticket_created',
              description: `Ticket created: ${event.payload.title}`,
              timestamp: event.timestamp || new Date().toISOString(),
            });
            break;

          case 'session_completed':
            dashboardStore.addEvent({
              id: ulid(),
              type: 'session_completed',
              description: 'Session completed',
              timestamp: event.timestamp || new Date().toISOString(),
            });
            chatStore.setAgentTyping(false);
            break;

          case 'error':
            dashboardStore.addEvent({
              id: ulid(),
              type: 'error',
              description: event.payload.message || 'Orchestration error',
              timestamp: event.timestamp || new Date().toISOString(),
            });
            chatStore.setAgentTyping(false);
            break;

          case 'agent_typing':
            chatStore.setAgentTyping(event.payload.isTyping ?? true);
            break;
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err, e.data);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      // EventSource tries to reconnect automatically by default
      sessionStore.setConnected(false);
    };

    // Fallback sync: if SSE delivery is delayed/dropped while typing,
    // periodically hydrate latest persisted messages/state from the API.
    const syncInterval = setInterval(async () => {
      const { isAgentTyping } = useChatStore.getState();
      const { isConnected } = useSessionStore.getState();

      if (!isAgentTyping && isConnected) return;

      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (Array.isArray(data.messages)) {
          chatStore.setMessages(data.messages);
        }
        if (typeof data.currentState === 'string') {
          sessionStore.setCurrentState(data.currentState);
        }
        if (Array.isArray(data.events)) {
          dashboardStore.setMeeting(meetingFromEvents(data.events));
        }

        const lastMessage = Array.isArray(data.messages)
          ? data.messages[data.messages.length - 1]
          : null;
        if (lastMessage?.role === 'agent') {
          chatStore.setAgentTyping(false);
        }
      } catch {
        // best-effort fallback, keep SSE as primary channel
      }
    }, 4000);

    return () => {
      clearInterval(syncInterval);
      eventSource.close();
      sessionStore.setConnected(false);
    };
  }, [sessionId]);
}
