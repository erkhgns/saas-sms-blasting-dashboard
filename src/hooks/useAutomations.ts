import { useState, useEffect, useCallback } from "react";
import { automationsService } from "@/services/automations.service";
import { authStore } from "@/utils/auth.store";
import type {
  AutomationRule,
  AutomationSettings,
  CreateAutomationRulePayload,
  UpdateAutomationRulePayload,
  ReorderRulesPayload,
} from "@/types";

interface UseAutomationsReturn {
  /** Sorted (by sortOrder asc) list of rules. */
  rules: AutomationRule[];
  /** Global automation settings (e.g. automationsPaused). Null until loaded. */
  settings: AutomationSettings | null;
  loading: boolean;
  error: string | null;

  /** Re-fetch rules and settings from the API. */
  refetch: () => void;

  // ── Settings mutations ─────────────────────────────────────────────────────
  /** Optimistically toggle the global pause flag. Reverts on failure. */
  setPaused: (paused: boolean) => Promise<void>;

  // ── Rule mutations ─────────────────────────────────────────────────────────
  /** Create a new rule and prepend it to the local list. */
  createRule: (payload: CreateAutomationRulePayload) => Promise<AutomationRule>;
  /** Full-update a rule (PUT). Merges result into local list. */
  updateRule: (ruleId: string, payload: UpdateAutomationRulePayload) => Promise<AutomationRule>;
  /**
   * Optimistically toggle isEnabled on a single rule via PATCH.
   * Reverts the local state on API failure.
   */
  toggleRule: (ruleId: string, isEnabled: boolean) => Promise<void>;
  /** Delete a rule and remove it from the local list. */
  deleteRule: (ruleId: string) => Promise<void>;
  /**
   * Duplicate a rule via POST /rules/:id/duplicate.
   * Appends the returned copy to the local list (sorted by sortOrder).
   */
  duplicateRule: (ruleId: string) => Promise<AutomationRule>;
  /**
   * Reorder rules after a drag-drop.
   * Applies the new order locally immediately; POSTs to API; reverts on failure.
   */
  reorderRules: (payload: ReorderRulesPayload) => Promise<void>;
}

export function useAutomations(): UseAutomationsReturn {
  const [rules,    setRules]    = useState<AutomationRule[]>([]);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const senderId = authStore.getUser()?.id ?? "";

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!senderId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, settingsData] = await Promise.all([
        automationsService.getRules(senderId),
        automationsService.getSettings(senderId),
      ]);
      setRules([...rulesRes.data].sort((a, b) => a.sortOrder - b.sortOrder));
      setSettings(settingsData);
    } catch {
      setError("Failed to load automations.");
    } finally {
      setLoading(false);
    }
  }, [senderId]);

  useEffect(() => { load(); }, [load]);

  // ── Settings: toggle global pause ─────────────────────────────────────────
  const setPaused = useCallback(async (paused: boolean) => {
    // Optimistic update
    setSettings((prev) => prev ? { ...prev, automationsPaused: paused } : prev);
    try {
      const updated = await automationsService.updateSettings(senderId, { automationsPaused: paused });
      setSettings(updated);
    } catch {
      // Revert
      setSettings((prev) => prev ? { ...prev, automationsPaused: !paused } : prev);
      throw new Error("Failed to update automation status.");
    }
  }, []);

  // ── Create rule ───────────────────────────────────────────────────────────
  const createRule = useCallback(async (payload: CreateAutomationRulePayload): Promise<AutomationRule> => {
    const newRule = await automationsService.createRule(payload);
    setRules((prev) =>
      [...prev, newRule].sort((a, b) => a.sortOrder - b.sortOrder)
    );
    return newRule;
  }, []);

  // ── Update rule (full PUT) ────────────────────────────────────────────────
  const updateRule = useCallback(async (
    ruleId: string,
    payload: UpdateAutomationRulePayload,
  ): Promise<AutomationRule> => {
    const updated = await automationsService.updateRule(ruleId, payload);
    setRules((prev) =>
      prev
        .map((r) => (r.id === ruleId ? updated : r))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );
    return updated;
  }, []);

  // ── Toggle rule enabled (optimistic PATCH) ────────────────────────────────
  const toggleRule = useCallback(async (ruleId: string, isEnabled: boolean) => {
    // Optimistic
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isEnabled } : r))
    );
    try {
      await automationsService.patchRule(ruleId, { isEnabled });
    } catch {
      // Revert
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isEnabled: !isEnabled } : r))
      );
      throw new Error("Failed to update rule status.");
    }
  }, []);

  // ── Delete rule ───────────────────────────────────────────────────────────
  const deleteRule = useCallback(async (ruleId: string) => {
    await automationsService.deleteRule(ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  // ── Duplicate rule ────────────────────────────────────────────────────────
  const duplicateRule = useCallback(async (ruleId: string): Promise<AutomationRule> => {
    const copy = await automationsService.duplicateRule(ruleId);
    setRules((prev) => [...prev, copy].sort((a, b) => a.sortOrder - b.sortOrder));
    return copy;
  }, []);

  // ── Reorder rules (optimistic) ────────────────────────────────────────────
  const reorderRules = useCallback(async (payload: ReorderRulesPayload) => {
    // Build a lookup of the new sortOrder values
    const orderMap = new Map(payload.order.map((o) => [o.id, o.sortOrder]));

    // Capture previous order for revert
    const previousRules = rules;

    // Optimistic: apply new sortOrders and re-sort
    setRules((prev) =>
      prev
        .map((r) => ({
          ...r,
          sortOrder: orderMap.has(r.id) ? (orderMap.get(r.id) as number) : r.sortOrder,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );

    try {
      await automationsService.reorderRules(payload);
    } catch {
      // Revert to previous order
      setRules(previousRules);
      throw new Error("Failed to save new order.");
    }
  }, [rules]);

  return {
    rules,
    settings,
    loading,
    error,
    refetch: load,
    setPaused,
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
    duplicateRule,
    reorderRules,
  };
}
