import { api } from "./api";
import type { Contact, ContactsResponse, CreateContactPayload, ContactGroup } from "@/types";

export const contactsService = {
  getAll: (page = 1, pageSize = 10, search?: string, tag?: string) =>
    api.get<ContactsResponse>("/contacts", {
      page,
      pageSize,
      ...(search ? { search } : {}),
      ...(tag ? { tag } : {}),
    }),

  getById: (id: string) =>
    api.get<Contact>(`/contacts/${id}`),

  getGroups: () =>
    api.get<ContactGroup[]>("/contacts/groups"),

  create: (payload: CreateContactPayload) =>
    api.post<Contact>("/contacts", payload),

  update: (id: string, payload: Partial<CreateContactPayload>) =>
    api.put<Contact>(`/contacts/${id}`, payload),

  delete: (id: string) =>
    api.delete<void>(`/contacts/${id}`),

  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${import.meta.env.VITE_API_BASE_URL ?? "/api"}/contacts/import`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}`,
      },
    }).then((r) => r.json());
  },
};
