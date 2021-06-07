export interface HireRequest {
  address: string;
}

export interface HireEmailResponse {
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
