import { api } from "./api";
import type { ApiToken, CreateApiTokenPayload, UpdateApiTokenPayload } from "@/types";

export const tokensService = {
  getAll: (senderId: string) =>
    api.get<ApiToken[]>("/tokens", { senderId }),

  create: (payload: CreateApiTokenPayload) =>
    api.post<ApiToken>("/tokens", payload),

  update: (id: string, payload: UpdateApiTokenPayload) =>
    api.put<ApiToken>(`/tokens/${id}`, payload),

  delete: (id: string) =>
    api.delete<void>(`/tokens/${id}`),
};
