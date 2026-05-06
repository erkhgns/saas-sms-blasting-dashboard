// ── Status enum (API values — underscore format) ──────────────────────────────
export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "SENT"
  | "FAILED";

/** Map API enum → human display label. Always use this at the render layer. */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT:       "Draft",
  SCHEDULED:   "Scheduled",
  IN_PROGRESS: "In Progress",
  SENT:        "Sent",
  FAILED:      "Failed",
};

export const LOCKED_CAMPAIGN_STATUSES: CampaignStatus[] = [
  "IN_PROGRESS",
  "SENT",
  "FAILED",
];

// ── Priority (API uses 0 | 1 | 2) ────────────────────────────────────────────
export type CampaignPriority = 0 | 1 | 2;
export type CampaignPriorityLabel = "Normal" | "High" | "Urgent";

export const PRIORITY_LABELS: Record<CampaignPriority, CampaignPriorityLabel> = {
  0: "Normal",
  1: "High",
  2: "Urgent",
};

export const PRIORITY_FROM_LABEL: Record<CampaignPriorityLabel, CampaignPriority> = {
  Normal: 0,
  High:   1,
  Urgent: 2,
};

// ── Campaign object (matches API response) ────────────────────────────────────
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  /** Alphanumeric sender displayed to recipients, e.g. "SMSBlast" */
  senderName: string;
  message: string;
  priority: CampaignPriority;
  recipientGroup: string;
  segmentId: string | null;
  includeTags: string[];
  excludeTags: string[];
  excludeGroups: string[];
  /** Cleaned E.164 numbers */
  excludeNumbers: string[];
  scheduledAt: string | null;
  sentAt: string | null;
  /** Resolved recipient count — 0 until launched */
  recipients: number;
  /** Live counter incremented by ESP32 PATCHes */
  sent: number;
  failed: number;
  /** null while IN_PROGRESS, set when campaign completes */
  deliveryRate: number | null;
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

// ── API payloads ──────────────────────────────────────────────────────────────
export interface CreateCampaignPayload {
  senderId: string;
  name: string;
  senderName: string;
  message: string;
  priority?: CampaignPriority;
  recipientGroup?: string;
  segmentId?: string | null;
  includeTags?: string[];
  excludeTags?: string[];
  excludeGroups?: string[];
  excludeNumbers?: string[];
  scheduledAt?: string | null;
}

export type UpdateCampaignPayload = Partial<Omit<CreateCampaignPayload, "senderId">>;

export interface LaunchResponse {
  status: CampaignStatus;
  recipients: number;
  scheduledAt: string | null;
}

export interface ReachResponse {
  count: number;
}

// ── List response ─────────────────────────────────────────────────────────────
export interface CampaignsResponse {
  data: Campaign[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Form state ────────────────────────────────────────────────────────────────
export interface CampaignFormState {
  /** null = unsaved new campaign */
  id: string | null;
  name: string;
  status: CampaignStatus;
  message: string;
  /** Alphanumeric sender name shown to recipients */
  senderName: string;
  priority: CampaignPriority;
  /** Contact group ID — "all" or a tag name */
  group: string;
  includeTags: string[];
  excludeTags: string[];
  excludeGroups: string[];
  /** Raw textarea content — cleaned on submit */
  excludeNumbers: string;
  segmentId: string | null;
  sendNow: boolean;
  /** YYYY-MM-DD */
  scheduledDate: string;
  /** HH:mm */
  scheduledTime: string;
  // View/edit read-back fields
  recipients?: number;
  sent?: number;
  failed?: number;
  deliveryRate?: number | null;
  date?: string;
}

export function emptyCampaignForm(): CampaignFormState {
  return {
    id: null,
    name: "",
    status: "DRAFT",
    message: "",
    senderName: "SMSBlast",
    priority: 0,
    group: "all",
    includeTags: [],
    excludeTags: [],
    excludeGroups: [],
    excludeNumbers: "",
    segmentId: null,
    sendNow: true,
    scheduledDate: "",
    scheduledTime: "",
  };
}

// ── Saved segments (stub — backend not yet implemented) ───────────────────────
export interface SavedSegment {
  id: string;
  name: string;
  count: number;
}
