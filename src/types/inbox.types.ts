import type { Contact } from "./contact.types";
import type { SmsStatus } from "./message.types";

// ── Thread list ──────────────────────────────────────────────────────────────

export interface InboxThreadLastMessage {
  content: string;
  receivedAt: string;
  from?: string;    // present in actual API response; not in docs spec — keep as optional
}

export interface InboxThread {
  phone: string;
  contact: Contact | null;
  lastMessage: InboxThreadLastMessage;
  lastActivityAt: string;
  unreadCount: number;
}

export interface InboxMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadThreads: number;
}

export interface InboxResponse {
  data: InboxThread[];
  meta: InboxMeta;
}

// ── Conversation messages ─────────────────────────────────────────────────────
// GET /inbox/conversation merges inbound + outbound into one timeline.
// Each message has an explicit "direction" field — use it directly.

export interface ConversationMessage {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  isRead: boolean | null;       // null on outbound
  status: SmsStatus | null;     // null on inbound
  priority: 0 | 1 | 2 | null;  // null on inbound
  timestamp: string;
}

export interface ConversationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConversationResponse {
  phone: string;
  contact: Contact | null;
  messages: ConversationMessage[];
  meta: ConversationMeta;
}

// ── Mark-read ────────────────────────────────────────────────────────────────

export interface MarkReadPayload {
  senderId: string;
  phone: string;
}

export interface MarkReadResponse {
  marked: number;
}
