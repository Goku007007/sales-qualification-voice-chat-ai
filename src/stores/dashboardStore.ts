import { create } from 'zustand';
import type { TimelineEvent } from '@/types';
import { toDashboardLeadFieldKey } from '@/lib/dashboard/leadFieldMapping';

export interface DashboardLeadFields {
  budget: string | null;
  timeline: string | null;
  need: string | null;
  decisionMaker: string | null;
}

export interface DashboardMeetingState {
  title: string;
  dateTime: string;
  status: string;
  meetingLink?: string | null;
  proposedTimes?: string[];
}

export interface DashboardFollowUpState {
  day: number;
  label: string;
  description: string;
  status: string;
}

interface DashboardStore {
  leadFields: DashboardLeadFields;
  meeting: DashboardMeetingState | null;
  events: TimelineEvent[];
  followUps: DashboardFollowUpState[];

  updateLeadField: (field: string, value: string) => void;
  setMeeting: (meeting: DashboardMeetingState | null) => void;
  addEvent: (event: TimelineEvent) => void;
  addFollowUp: (followUp: DashboardFollowUpState) => void;

  // Hydrator
  setHydratedState: (
    leadFields: Partial<DashboardLeadFields>,
    meeting: DashboardMeetingState | null,
    events: TimelineEvent[],
    followUps: DashboardFollowUpState[],
  ) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  leadFields: {
    budget: null,
    timeline: null,
    need: null,
    decisionMaker: null,
  },
  meeting: null,
  events: [],
  followUps: [],

  updateLeadField: (field, value) =>
    set((state) => {
      const mappedKey = toDashboardLeadFieldKey(field);
      if (!mappedKey) return state;

      return {
        leadFields: {
          ...state.leadFields,
          [mappedKey]: value,
        },
      };
    }),

  setMeeting: (meeting) => set({ meeting }),

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),

  addFollowUp: (followUp) =>
    set((state) => ({
      followUps: [...state.followUps, followUp],
    })),

  setHydratedState: (fields, meeting, events, followUps) =>
    set((state) => ({
      leadFields: {
        ...state.leadFields,
        ...fields,
      },
      meeting,
      events,
      followUps,
    })),
}));
