export type CampaignStatus = "Sent" | "Scheduled" | "Draft" | "In Progress" | "Failed";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipients: number;
  deliveryRate: string;
  date: string;
  message?: string;
  tags?: string[];
  creditsUsed?: number;
}

export interface CreateCampaignPayload {
  name: string;
  message: string;
  recipientGroup: string;
  tags: string[];
  scheduledAt?: string;
}

export interface CampaignsResponse {
  data: Campaign[];
  total: number;
  page: number;
  pageSize: number;
}
