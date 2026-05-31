import { api } from "./api";
import type {
  AutomationRule,
  AutomationSettings,
  CreateAutomationRulePayload,
  UpdateAutomationRulePayload,
  ReorderRulesPayload,
  GetRulesResponse,
  AutomationPreviewResult,
  AutomationLogResponse,
  AutomationLogParams,
} from "@/types";

export const automationsService = {
  // ── Settings ──────────────────────────────────────────────────────────────

  /** Fetch the global automation settings (e.g. automationsPaused flag). */
  getSettings: (senderId: string) =>
    api.get<AutomationSettings>(`/automations/settings?senderId=${senderId}`),

  /** Update global automation settings (e.g. pause/unpause all rules). */
  updateSettings: (senderId: string, payload: Partial<AutomationSettings>) =>
    api.patch<AutomationSettings>(`/automations/settings?senderId=${senderId}`, payload),

  // ── Rules ─────────────────────────────────────────────────────────────────

  /** Fetch all automation rules for the current sender, ordered by sortOrder. */
  getRules: (senderId: string) =>
    api.get<GetRulesResponse>(`/automations/rules?senderId=${senderId}`),

  /** Create a new automation rule. */
  createRule: (payload: CreateAutomationRulePayload) =>
    api.post<AutomationRule>("/automations/rules", payload),

  /** Update an existing automation rule. */
  updateRule: (ruleId: string, payload: UpdateAutomationRulePayload) =>
    api.patch<AutomationRule>(`/automations/rules/${ruleId}`, payload),

  /** Partially update a rule — used for toggle (isEnabled) and reorder (sortOrder). */
  patchRule: (ruleId: string, payload: UpdateAutomationRulePayload) =>
    api.patch<AutomationRule>(`/automations/rules/${ruleId}`, payload),

  /** Permanently delete an automation rule. */
  deleteRule: (ruleId: string) =>
    api.delete<void>(`/automations/rules/${ruleId}`),

  /**
   * Duplicate an existing rule.
   * The server appends " (copy)" to the name, sets isEnabled=false,
   * and assigns a new sortOrder at the end of the list.
   */
  duplicateRule: (ruleId: string) =>
    api.post<AutomationRule>(`/automations/rules/${ruleId}/duplicate`, {}),

  /** Batch-update sortOrder for all rules after a drag-reorder. */
  reorderRules: (payload: ReorderRulesPayload) =>
    api.patch<void>("/automations/rules/reorder", payload),

  // ── Preview ───────────────────────────────────────────────────────────────

  /**
   * Get a preview of how many contacts a saved rule would currently match.
   * Only meaningful for TOKEN_UPDATED / SCHEDULED rules with ≥1 condition.
   */
  preview: (ruleId: string, senderId: string) =>
    api.get<AutomationPreviewResult>(`/automations/rules/${ruleId}/preview?senderId=${senderId}`),

  // ── Log ───────────────────────────────────────────────────────────────────

  /** Fetch paginated automation execution log, with optional filters. */
  getLog: (params: AutomationLogParams) => {
    const query = new URLSearchParams();
    query.set("senderId", params.senderId);
    if (params.ruleId)      query.set("ruleId",      params.ruleId);
    if (params.contactId)   query.set("contactId",   params.contactId);
    if (params.triggerType) query.set("triggerType", params.triggerType);
    if (params.result)      query.set("result",      params.result);
    if (params.from)        query.set("from",        params.from);
    if (params.to)          query.set("to",          params.to);
    if (params.page)        query.set("page",        String(params.page));
    if (params.limit)       query.set("limit",       String(params.limit));
    return api.get<AutomationLogResponse>(`/automations/log?${query.toString()}`);
  },
};
