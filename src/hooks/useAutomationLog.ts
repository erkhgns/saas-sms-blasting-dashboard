import { useState, useEffect, useCallback } from "react";
import { automationsService } from "@/services/automations.service";
import { authStore } from "@/utils/auth.store";
import type {
  AutomationLogEntry,
  AutomationLogMeta,
  AutomationLogParams,
  TriggerType,
  AutomationLogResult,
} from "@/types";

interface UseAutomationLogOptions {
  /** Filter by rule ID */
  ruleId?: string;
  /** Filter by contact ID */
  contactId?: string;
  /** Filter by trigger type */
  triggerType?: TriggerType;
  /** Filter by result */
  result?: AutomationLogResult;
  /** ISO date string — lower bound for firedAt */
  from?: string;
  /** ISO date string — upper bound for firedAt */
  to?: string;
  /** 1-based page number (default 1) */
  page?: number;
  /** Records per page (default 20) */
  limit?: number;
}

interface UseAutomationLogReturn {
  entries: AutomationLogEntry[];
  meta: AutomationLogMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAutomationLog({
  ruleId,
  contactId,
  triggerType,
  result,
  from,
  to,
  page = 1,
  limit = 20,
}: UseAutomationLogOptions = {}): UseAutomationLogReturn {
  const senderId = authStore.getUser()?.id ?? "";

  const [entries, setEntries] = useState<AutomationLogEntry[]>([]);
  const [meta,    setMeta]    = useState<AutomationLogMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!senderId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params: AutomationLogParams = {
        senderId,
        page,
        limit,
        ...(ruleId      && { ruleId }),
        ...(contactId   && { contactId }),
        ...(triggerType && { triggerType }),
        ...(result      && { result }),
        ...(from        && { from }),
        ...(to          && { to }),
      };
      const res = await automationsService.getLog(params);
      setEntries(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automation log.");
    } finally {
      setLoading(false);
    }
  }, [senderId, ruleId, contactId, triggerType, result, from, to, page, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, meta, loading, error, refetch: fetch };
}
