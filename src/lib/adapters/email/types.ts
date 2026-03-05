export interface EmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface EmailOutput {
  messageId: string;
}
