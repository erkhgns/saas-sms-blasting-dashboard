// ── Quick Replies ─────────────────────────────────────────────────────────────
// Saved message templates, managed in Settings and inserted in the Inbox via "/".

export interface QuickReply {
  id: string;
  senderId: string;
  name: string;            // trimmed, 1–100 chars
  shortcut: string | null; // lowercase, ^[a-z0-9_-]+$, max 30, unique per account
  category: string | null; // trimmed, max 50
  message: string;         // raw template with {{token_key}}, max 1000
  sortOrder: number;       // ascending = display order (gaps are normal)
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickReplyPayload {
  name: string;
  shortcut?: string | null;
  category?: string | null;
  message: string;
}

/** Partial update — only the fields sent are changed. `shortcut: null` clears it. */
export type UpdateQuickReplyPayload = Partial<CreateQuickReplyPayload>;

export interface ReorderQuickRepliesPayload {
  /** Every quick reply id on the account, in the new order. */
  ids: string[];
}

export const QUICK_REPLY_LIMITS = {
  name:     100,
  shortcut: 30,
  category: 50,
  message:  1000,
  perAccount: 200,
} as const;

export const QUICK_REPLY_SHORTCUT_PATTERN = /^[a-z0-9_-]+$/;
