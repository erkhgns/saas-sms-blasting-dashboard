export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "failed" | "pending";

export interface Message {
  id: string;
  text: string;
  direction: MessageDirection;
  status?: MessageStatus;
  time: string;
  conversationId: string;
}

export interface Conversation {
  id: number;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages?: Message[];
}

export interface SendMessagePayload {
  to: string | string[];
  message: string;
  senderId?: string;
  scheduledAt?: string;
  tags?: string[];
}

export interface SendMessageResponse {
  batchId: string;
  status: MessageStatus;
  recipients: number;
  estimatedCredits: number;
}
