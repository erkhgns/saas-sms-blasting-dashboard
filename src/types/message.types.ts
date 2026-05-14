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

export interface CreateSmsPayload {
  content: string;
  receiver: string;
  senderId: string;
}

export type SmsStatus = "PENDING" | "SENT" | "FAILED";

export interface SmsRecord {
  id: string;
  content: string;
  receiver: string;
  status: SmsStatus;
  priority: 0 | 1 | 2;
  retryCount: number;
  lastAttemptAt: string | null;
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSmsPayload {
  content: string;
  receivers: string[];
  senderId: string;
  priority?: 0 | 1 | 2;
  /** ISO 8601 datetime — omit or null to send immediately */
  scheduledAt?: string | null;
}

export interface BulkSmsResponse {
  count: number;
  skipped: string[];
  message: string;
}

export interface SmsListParams {
  senderId: string;
  status?:   SmsStatus;
  priority?: 0 | 1 | 2;
  search?:   string;
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?:   string;   // YYYY-MM-DD
  page?:     number;
  limit?:    number;
  sortBy?:   "date";
}

export interface SmsListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SmsListResponse {
  data: SmsRecord[];
  meta: SmsListMeta;
}
