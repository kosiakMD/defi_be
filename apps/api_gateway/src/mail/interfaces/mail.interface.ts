export interface EmailResponse {
  accepted: string[];
  rejected: any[];
  envelopeTime: number;
  messageTime: number;
  messageSize: number;
  response: string;
  envelope: {
    from: string;
    to: string[];
  };
  messageId: string;
}
export interface HireRequest {
  email: string;
  name: string;
  letter: string;
}

export interface QuestionRequest {
  email: string;
  name: string;
  letter: string;
}
