// ── Enums ─────────────────────────────────────────────────────────────────────

export type FrequencyType =
  | "EVERY_MESSAGE"
  | "ONCE_EVERY_24_HOURS"
  | "ONCE_EVERY_7_DAYS"
  | "ONCE_EVERY_30_DAYS";

// ── Core model ────────────────────────────────────────────────────────────────

export interface AutoReplyRule {
  id: string;
  senderId: string;
  name: string;
  keywords: string[];
  message: string;
  frequencyType: FrequencyType;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoReplySettings {
  enabled: boolean;
  rules: AutoReplyRule[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface ToggleAutoReplyPayload {
  enabled: boolean;
}

export interface ToggleAutoReplyResponse {
  enabled: boolean;
}

export interface CreateAutoReplyRulePayload {
  name: string;
  keywords: string[];
  message: string;
  frequencyType: FrequencyType;
  isEnabled: boolean;
}

export interface UpdateAutoReplyRulePayload {
  name?: string;
  keywords?: string[];
  message?: string;
  frequencyType?: FrequencyType;
  isEnabled?: boolean;
  sortOrder?: number;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  EVERY_MESSAGE:        "Every message",
  ONCE_EVERY_24_HOURS:  "Once every 24 hours",
  ONCE_EVERY_7_DAYS:    "Once every 7 days",
  ONCE_EVERY_30_DAYS:   "Once every 30 days",
};

export const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: "EVERY_MESSAGE",       label: "Every message"        },
  { value: "ONCE_EVERY_24_HOURS", label: "Once every 24 hours"  },
  { value: "ONCE_EVERY_7_DAYS",   label: "Once every 7 days"    },
  { value: "ONCE_EVERY_30_DAYS",  label: "Once every 30 days"   },
];
