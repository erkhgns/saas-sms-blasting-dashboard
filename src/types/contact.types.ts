export type ContactTag = "VIP" | "Active" | "Repeat Customer" | "New Lead" | "Trial" | string;

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: ContactTag[];
  createdAt: string;
  optedOut?: boolean;
}

export interface ContactGroup {
  id: string;
  name: string;
  count: number;
}

export interface CreateContactPayload {
  name: string;
  phone: string;
  email?: string;
  tags?: ContactTag[];
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  pageSize: number;
}
