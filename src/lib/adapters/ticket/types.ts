export interface TicketInput {
  sessionId: string;
  type: string;
  title: string;
}

export interface TicketOutput {
  ticketId: string;
  url: string;
  status: 'open';
}
