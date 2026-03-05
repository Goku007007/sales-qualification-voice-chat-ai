export interface TimeSlot {
  start: string;
  end: string;
}

export interface CalendarInput {
  durationMinutes: number;
  daysAhead: number;
  timezone: string;
}

export interface BookingConfirmation {
  eventId: string;
  meetingLink: string;
}
