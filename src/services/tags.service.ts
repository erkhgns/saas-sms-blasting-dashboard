import { api } from "./api";
import type { Tag, CreateTagPayload, UpdateTagPayload } from "@/types";

export const tagsService = {
  getAll: (senderId: string) =>
    api.get<Tag[]>("/tags", { senderId }),

  create: (payload: CreateTagPayload) =>
    api.post<Tag>("/tags", payload),

  update: (id: string, payload: UpdateTagPayload) =>
    api.put<Tag>(`/tags/${id}`, payload),

  delete: (id: string) =>
    api.delete<void>(`/tags/${id}`),
};
