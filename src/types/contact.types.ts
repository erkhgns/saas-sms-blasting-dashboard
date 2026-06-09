export type ContactTag = string;

// ── Token operations ──────────────────────────────────────────────────────────

/**
 * Atomic mutation for a single personalization token.
 * Used in the `tokenOperations` field of POST /contacts and PATCH /contacts/:id.
 *
 * - overwrite      — set an explicit value (all types)
 * - increment      — add `value` to current (number / decimal only)
 * - decrement      — subtract `value` from current (number / decimal only)
 * - toggle         — flip true↔false (boolean only, no value)
 * - set_today      — set token to today's date YYYY-MM-DD (date only, no value)
 * - add_days       — advance date by `value` days (date only)
 * - subtract_days  — rewind date by `value` days (date only)
 */
export type TokenOperation =
  | { key: string; op: "overwrite";     value: string }
  | { key: string; op: "increment";     value: string }
  | { key: string; op: "decrement";     value: string }
  | { key: string; op: "toggle" }
  | { key: string; op: "set_today" }
  | { key: string; op: "add_days";      value: string }
  | { key: string; op: "subtract_days"; value: string };

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: ContactTag[];
  optedOut: boolean;
  senderId: string;
  createdAt: string;
  updatedAt: string;
  // Custom fields — keyed by personalization token key, e.g. { first_name: "Maria", company: "Acme" }
  // Backend coordination: API must accept and return this field. Pending contract confirmation.
  customFields?: Record<string, string>;
}

export interface ContactGroup {
  id: string;
  name: string;
  count: number;
}

export interface ContactsListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactsResponse {
  data: Contact[];
  meta: ContactsListMeta;
}

export interface CreateContactPayload {
  senderId: string;
  name: string;
  phone: string;
  email?: string;
  tags?: ContactTag[];
  /**
   * Ordered list of atomic token mutations to apply on create/upsert.
   * This is the only supported way to write token/custom field values.
   * `customFields` and `tokens` have been removed from the API schema.
   *
   * Operations are applied left-to-right. For a brand-new contact, operations
   * like increment/decrement start from 0 if no prior value exists.
   */
  tokenOperations?: TokenOperation[];
}

export interface UpdateContactPayload {
  name?: string;
  phone?: string;
  email?: string | null;
  tags?: ContactTag[];
  optedOut?: boolean;
  /**
   * Ordered list of atomic token mutations to apply on update.
   * If omitted, existing token values are untouched.
   * This is the only supported way to write token/custom field values.
   */
  tokenOperations?: TokenOperation[];
}

export interface BulkDeleteContactsPayload {
  ids: string[];
  senderId: string;
}

export interface BulkDeleteContactsResponse {
  deleted: number;
}

export interface ImportSkipReason {
  row: number;
  phone: string;
  reason: string;
}

export interface ImportContactsResponse {
  imported: number;
  skipped: number;
  skippedReasons: ImportSkipReason[];
}

export interface OptOutPayload {
  optedOut: boolean;
}
