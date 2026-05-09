import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type {
  Contact,
  ContactGroup,
  ContactsResponse,
  CreateContactPayload,
  UpdateContactPayload,
  BulkDeleteContactsPayload,
  BulkDeleteContactsResponse,
  ImportContactsResponse,
  OptOutPayload,
} from "@/types";

// These are resolved from the shared api.ts module so BASE_URL is always in sync
// with VITE_API_BASE_URL (or the "/api" fallback for local dev).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const ENV_API_KEY = import.meta.env.VITE_API_KEY ?? "";

export const contactsService = {
  getAll: (params: {
    senderId: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    groupId?: string;
  }) =>
    api.get<ContactsResponse>("/contacts", {
      senderId: params.senderId,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search   ? { search:  params.search  } : {}),
      ...(params.tag      ? { tag:     params.tag     } : {}),
      ...(params.groupId  ? { groupId: params.groupId } : {}),
    }),

  getById: (id: string) =>
    api.get<Contact>(`/contacts/${id}`),

  getGroups: (senderId: string) =>
    api.get<ContactGroup[]>("/contacts/groups", { senderId }),

  create: (payload: CreateContactPayload) =>
    api.post<Contact>("/contacts", payload),

  update: (id: string, payload: UpdateContactPayload) =>
    api.put<Contact>(`/contacts/${id}`, payload),

  delete: (id: string) =>
    api.delete<void>(`/contacts/${id}`),

  bulkDelete: (payload: BulkDeleteContactsPayload) =>
    api.post<BulkDeleteContactsResponse>("/contacts/bulk-delete", payload),

  optOut: (id: string, payload: OptOutPayload) =>
    api.patch<Contact>(`/contacts/${id}/opt-out`, payload),

  /**
   * CSV import uses a raw fetch because the body is multipart/form-data
   * (can't use api.post which sets Content-Type: application/json).
   * We still use the same BASE_URL and auth headers as the shared api.ts client.
   */
  importCsv: async (file: File, senderId: string): Promise<ImportContactsResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("senderId", senderId);

    // Mirror the header logic from api.ts: API key first, then Bearer token
    const headers: Record<string, string> = {};
    const apiKey = ENV_API_KEY || authStore.getApiKey() || "";
    if (apiKey) headers["x-api-key"] = apiKey;

    const accessToken = authStore.getAccessToken();
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const response = await fetch(`${BASE_URL}/contacts/import`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message ?? "CSV import failed");
    }

    return response.json();
  },
};
