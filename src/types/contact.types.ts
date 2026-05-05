export type ContactTag = string;

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
  // Optional — Add modal skips this; filled via the EditContactDrawer after creation
  customFields?: Record<string, string>;
}

export interface UpdateContactPayload {
  name?: string;
  phone?: string;
  email?: string | null;
  tags?: ContactTag[];
  optedOut?: boolean;
  customFields?: Record<string, string>;
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
