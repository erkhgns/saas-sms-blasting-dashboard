import { useState, useEffect, useCallback } from "react";
import { messagesService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { SmsRecord, SmsListMeta, SmsStatus } from "@/types";

interface UseSmsLogsOptions {
  page?:     number;
  limit?:    number;
  status?:   SmsStatus;
  priority?: 0 | 1 | 2;
  search?:   string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?:   string; // YYYY-MM-DD
}

interface UseSmsLogsReturn {
  logs:    SmsRecord[];
  meta:    SmsListMeta | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useSmsLogs({
  page = 1,
  limit = 10,
  status,
  priority,
  search,
  dateFrom,
  dateTo,
}: UseSmsLogsOptions = {}): UseSmsLogsReturn {
  const [logs,    setLogs]    = useState<SmsRecord[]>([]);
  const [meta,    setMeta]    = useState<SmsListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const senderId = authStore.getUser()?.id ?? "";
      const result = await messagesService.getSms({
        senderId,
        page,
        limit,
        status,
        priority,
        search,
        dateFrom,
        dateTo,
        sortBy: "date",
      });
      setLogs(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SMS logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, priority, search, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, meta, loading, error, refetch: fetch };
}
