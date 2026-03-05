import { create } from 'zustand';
import type { ChatMessage, MessageSource } from '@/types';
import { ulid } from 'ulid';

interface ChatStore {
  messages: ChatMessage[];
  isAgentTyping: boolean;
  isSendingMessage: boolean;
  isVoiceRecording: boolean;

  addMessage: (message: ChatMessage) => void;
  removeMessage: (id: string) => void;
  setAgentTyping: (typing: boolean) => void;
  setVoiceRecording: (recording: boolean) => void;
  sendMessage: (sessionId: string, text: string, source?: MessageSource) => Promise<void>;

  // Hydrator
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isAgentTyping: false,
  isSendingMessage: false,
  isVoiceRecording: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),

  setAgentTyping: (typing) => set({ isAgentTyping: typing }),
  setVoiceRecording: (recording) => set({ isVoiceRecording: recording }),

  setMessages: (messages) => set({ messages }),

  sendMessage: async (sessionId: string, text: string, source?: MessageSource) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Avoid concurrent user turns while the previous turn is still processing.
    const { isSendingMessage } = get();
    if (isSendingMessage) return;

    const messageSource = source ?? 'text';

    // Optimistic UI update
    const userMessage: ChatMessage = {
      id: ulid(),
      role: 'user',
      content: trimmedText,
      source: messageSource,
      timestamp: new Date().toISOString(),
    };

    get().addMessage(userMessage);
    get().setAgentTyping(true);
    set({ isSendingMessage: true });

    // Safety net: if SSE/event flow is interrupted, don't leave typing stuck forever.
    const typingFallbackTimer = setTimeout(() => {
      if (get().isAgentTyping) {
        get().setAgentTyping(false);
      }
    }, 15000);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedText,
          metadata: { source: userMessage.source },
        }),
      });

      if (!res.ok) {
        clearTimeout(typingFallbackTimer);
        get().setAgentTyping(false);
        get().removeMessage(userMessage.id);
        console.error('Failed to send message');
        // In a real app we'd trigger a toast or a retry state on the optimistic message
      }
    } catch (error) {
      clearTimeout(typingFallbackTimer);
      get().setAgentTyping(false);
      get().removeMessage(userMessage.id);
      console.error('Failed to send message', error);
    } finally {
      set({ isSendingMessage: false });
    }
  },
}));
