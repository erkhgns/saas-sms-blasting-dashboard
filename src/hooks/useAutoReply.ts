import { useState, useEffect, useCallback } from "react";
import { autoReplyService } from "@/services/auto-reply.service";
import type {
  AutoReplySettings,
  AutoReplyRule,
  CreateAutoReplyRulePayload,
  UpdateAutoReplyRulePayload,
} from "@/types";

interface UseAutoReplyReturn {
  /** Full settings object — enabled flag + sorted rules array. Null until loaded. */
  settings: AutoReplySettings | null;
  loading: boolean;
  error: string | null;
  /** True while the global toggle PATCH is in flight. */
  toggling: boolean;
  /** Re-fetch settings from the API. */
  refetch: () => void;
  /** Toggle the global Auto Reply on or off. Updates local state on success. */
  toggleEnabled: (enabled: boolean) => Promise<void>;
  /** Create a new rule. Appends to local state on success. */
  createRule: (payload: CreateAutoReplyRulePayload) => Promise<AutoReplyRule>;
  /** Update an existing rule. Merges into local state on success. */
  updateRule: (ruleId: string, payload: UpdateAutoReplyRulePayload) => Promise<AutoReplyRule>;
  /** Delete a rule. Removes from local state on success. */
  deleteRule: (ruleId: string) => Promise<void>;
}

export function useAutoReply(): UseAutoReplyReturn {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await autoReplyService.getSettings();
      // Ensure rules are always sorted by sortOrder ascending
      setSettings({
        ...data,
        rules: [...data.rules].sort((a, b) => a.sortOrder - b.sortOrder),
      });
    } catch {
      setError("Failed to load auto reply settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toggle global enabled ──────────────────────────────────────────────────
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    setToggling(true);
    try {
      const res = await autoReplyService.toggleEnabled({ enabled });
      setSettings((prev) => prev ? { ...prev, enabled: res.enabled } : prev);
    } finally {
      setToggling(false);
    }
  }, []);

  // ── Create rule ────────────────────────────────────────────────────────────
  const createRule = useCallback(async (payload: CreateAutoReplyRulePayload): Promise<AutoReplyRule> => {
    const newRule = await autoReplyService.createRule(payload);
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = [...prev.rules, newRule].sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...prev, rules: updated };
    });
    return newRule;
  }, []);

  // ── Update rule ────────────────────────────────────────────────────────────
  const updateRule = useCallback(async (ruleId: string, payload: UpdateAutoReplyRulePayload): Promise<AutoReplyRule> => {
    const updated = await autoReplyService.updateRule(ruleId, payload);
    setSettings((prev) => {
      if (!prev) return prev;
      const rules = prev.rules
        .map((r) => (r.id === ruleId ? updated : r))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return { ...prev, rules };
    });
    return updated;
  }, []);

  // ── Delete rule ────────────────────────────────────────────────────────────
  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    await autoReplyService.deleteRule(ruleId);
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, rules: prev.rules.filter((r) => r.id !== ruleId) };
    });
  }, []);

  return {
    settings,
    loading,
    error,
    toggling,
    refetch: load,
    toggleEnabled,
    createRule,
    updateRule,
    deleteRule,
  };
}
