import { create } from 'zustand';
import type { IndustryType, WorkflowState } from '@/types';

interface SessionStore {
  sessionId: string | null;
  industry: IndustryType | null;
  currentState: WorkflowState;
  isConnected: boolean;

  createSession: (industry: IndustryType) => Promise<string>;
  setCurrentState: (state: WorkflowState) => void;
  setConnected: (connected: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  industry: null,
  currentState: 'CONSENT',
  isConnected: false,

  createSession: async (industry: IndustryType) => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry }),
    });

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorBody?.error ?? 'Failed to create session');
    }

    const data = await res.json();
    set({ sessionId: data.id, industry: data.industry, currentState: data.currentState });
    return data.id;
  },

  setCurrentState: (state) => set({ currentState: state }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
