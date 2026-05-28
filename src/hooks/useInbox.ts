import { useState, useEffect, useCallback } from "react";
import { inboxService } from "@/services";
import type { InboxThread, InboxMeta } from "@/types";

interface UseInboxResult {
  threads: InboxThread[];
  meta: InboxMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInbox(page = 1, limit = 20): UseInboxResult {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [meta, setMeta]       = useState<InboxMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    inboxService
      .getInbox(page, limit)
      .then((res) => {
        if (!cancelled) {
          setThreads(res.data);
          setMeta(res.meta);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load inbox");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, limit, tick]);

  return { threads, meta, loading, error, refetch };
}
