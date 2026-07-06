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
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) =>
    api.get<ContactsResponse>("/contacts", {
      senderId: params.senderId,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search   ? { search:   params.search   } : {}),
      ...(params.tag      ? { tag:      params.tag      } : {}),
      ...(params.groupId  ? { groupId:  params.groupId  } : {}),
      ...(params.sortBy   ? { sortBy:   params.sortBy   } : {}),
      ...(params.sortDir  ? { sortDir:  params.sortDir  } : {}),
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
   * (api.post forces Content-Type: application/json which breaks multipart).
   *
   * Auth is handled manually here — including a one-shot token refresh if the
   * access token is missing or expired, mirroring what api.ts does automatically.
   */
  importCsv: async (file: File, senderId: string): Promise<ImportContactsResponse> => {
    if (!senderId) throw new Error("Session error — please refresh the page and try again.");

    // Helper: build auth headers with the freshest available token
    const buildHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {};
      const apiKey = ENV_API_KEY || authStore.getApiKey() || "";
      if (apiKey) headers["x-api-key"] = apiKey;
      const accessToken = authStore.getAccessToken();
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      return headers;
    };

    // Helper: run the actual fetch.
    // senderId is sent as a query param (API reads it from the URL, not the multipart body)
    // AND in the form body as a fallback.
    const doFetch = async (): Promise<Response> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("senderId", senderId);

      const url = `${BASE_URL}/contacts/import?senderId=${encodeURIComponent(senderId)}`;

      return fetch(url, {
        method: "POST",
        headers: buildHeaders(),
        body: formData,
      });
    };

    let response = await doFetch();

    // Read the body once — we need it to detect auth errors regardless of status code.
    // This API returns 400 (not 401) for missing/invalid authorization headers.
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const msg  = (data?.message ?? "") as string;

      const isAuthError =
        response.status === 401 ||
        msg.toLowerCase().includes("authorization") ||
        msg.toLowerCase().includes("unauthorized");

      if (!isAuthError) {
        // Normal API error (e.g. validation) — surface it immediately
        throw new Error(msg || "CSV import failed");
      }

      // Auth error — refresh the token and retry once
      const refreshToken = authStore.getRefreshToken();
      if (!refreshToken) {
        authStore.clear();
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }

      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) {
        authStore.clear();
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }

      const tokens = await refreshRes.json();
      authStore.setAccessToken(tokens.accessToken);
      authStore.setRefreshToken(tokens.refreshToken);

      // Retry the upload with the fresh token
      response = await doFetch();

      if (!response.ok) {
        const retryData = await response.json().catch(() => null);
        throw new Error(retryData?.message ?? "CSV import failed");
      }
    }

    return response.json();
  },
};
