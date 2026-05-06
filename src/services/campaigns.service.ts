import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type {
  Campaign,
  CampaignsResponse,
  CampaignStatus,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  LaunchResponse,
  ReachResponse,
} from "@/types";

interface GetCampaignsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
}

interface ReachParams {
  /** Pass the user ID explicitly — do not rely on authStore inside the service. */
  senderId?: string;
  recipientGroup?: string;
  segmentId?: string | null;
  includeTags?: string[];
  excludeTags?: string[];
  excludeGroups?: string[];
  excludeNumbers?: string[];
}

export const campaignsService = {
  getAll: (params: GetCampaignsParams = {}) => {
    const senderId = authStore.getUser()?.id ?? "";
    const p: Record<string, string | number> = {
      senderId,
      page:     params.page     ?? 1,
      pageSize: params.pageSize ?? 10,
    };
    if (params.search) p.search = params.search;
    if (params.status) p.status = params.status;
    return api.get<CampaignsResponse>("/campaigns", p);
  },

  getById: (id: string) =>
    api.get<Campaign>(`/campaigns/${id}`),

  /**
   * GET /campaigns/reach — dry-run audience count.
   * Call on every audience field change to update the Estimated reach counter.
   */
  reach: (params: ReachParams = {}): Promise<ReachResponse> => {
    const senderId = params.senderId ?? authStore.getUser()?.id ?? "";
    const p: Record<string, string> = { senderId };
    if (params.recipientGroup)       p.recipientGroup = params.recipientGroup;
    if (params.segmentId)            p.segmentId      = params.segmentId;
    if (params.includeTags?.length)  p.includeTags    = params.includeTags.join(",");
    if (params.excludeTags?.length)  p.excludeTags    = params.excludeTags.join(",");
    if (params.excludeGroups?.length) p.excludeGroups = params.excludeGroups.join(",");
    if (params.excludeNumbers?.length) p.excludeNumbers = params.excludeNumbers.join(",");
    return api.get<ReachResponse>("/campaigns/reach", p);
  },

  create: (payload: CreateCampaignPayload) =>
    api.post<Campaign>("/campaigns", payload),

  update: (id: string, payload: UpdateCampaignPayload) =>
    api.put<Campaign>(`/campaigns/${id}`, payload),

  /**
   * POST /campaigns/:id/launch — resolve audience + queue all SMS.
   * Throws ApiError 409 if already launched, 422 if no eligible recipients.
   */
  launch: (id: string) =>
    api.post<LaunchResponse>(`/campaigns/${id}/launch`, {}),

  delete: (id: string) =>
    api.delete<void>(`/campaigns/${id}`),

  duplicate: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/duplicate`, {}),
};
