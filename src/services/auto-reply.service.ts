import { api } from "./api";
import type {
  AutoReplySettings,
  ToggleAutoReplyPayload,
  ToggleAutoReplyResponse,
  AutoReplyRule,
  CreateAutoReplyRulePayload,
  UpdateAutoReplyRulePayload,
} from "@/types";

export const autoReplyService = {
  /** Fetch global enabled flag + all rules for the current sender. */
  getSettings: () =>
    api.get<AutoReplySettings>("/settings/auto-reply"),

  /** Toggle the global Auto Reply on or off. */
  toggleEnabled: (payload: ToggleAutoReplyPayload) =>
    api.patch<ToggleAutoReplyResponse>("/settings/auto-reply", payload),

  /** Create a new auto reply rule. */
  createRule: (payload: CreateAutoReplyRulePayload) =>
    api.post<AutoReplyRule>("/settings/auto-reply/rules", payload),

  /** Update an existing auto reply rule (partial — only send changed fields). */
  updateRule: (ruleId: string, payload: UpdateAutoReplyRulePayload) =>
    api.patch<AutoReplyRule>(`/settings/auto-reply/rules/${ruleId}`, payload),

  /** Permanently delete an auto reply rule. */
  deleteRule: (ruleId: string) =>
    api.delete<void>(`/settings/auto-reply/rules/${ruleId}`),
};
