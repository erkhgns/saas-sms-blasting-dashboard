import { api } from "./api";
import type { Campaign, CampaignsResponse, CreateCampaignPayload } from "@/types";

export const campaignsService = {
  getAll: (page = 1, pageSize = 10, search?: string) =>
    api.get<CampaignsResponse>("/campaigns", { page, pageSize, ...(search ? { search } : {}) }),

  getById: (id: string) =>
    api.get<Campaign>(`/campaigns/${id}`),

  create: (payload: CreateCampaignPayload) =>
    api.post<Campaign>("/campaigns", payload),

  update: (id: string, payload: Partial<CreateCampaignPayload>) =>
    api.put<Campaign>(`/campaigns/${id}`, payload),

  delete: (id: string) =>
    api.delete<void>(`/campaigns/${id}`),

  duplicate: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/duplicate`, {}),
};
