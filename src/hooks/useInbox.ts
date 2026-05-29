import { useState, useEffect, useCallback, useRef } from "react";
import { inboxService } from "@/services";
import type { InboxThread, InboxMeta } from "@/types";

interface UseInboxResult {
  threads: InboxThread[];
  meta: InboxMeta | null;
  loading: boolean;        // true only on initial mount
  loadingMore: boolean;    // true while fetching the next page
  hasMore: boolean;
  error: string | null;
  refetch: () => void;     // silent background refresh — no loading flash
  loadMore: () => void;
  updateThread: (phone: string, patch: Partial<InboxThread>) => void; // optimistic patch
}

const LIMIT = 20;

export function useInbox(): UseInboxResult {
  const [threads, setThreads]         = useState<InboxThread[]>([]);
  const [meta, setMeta]               = useState<InboxMeta | null>(null);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [tick, setTick]               = useState(0);

  // Only show the full loading state on the very first fetch
  const isInitialLoad = useRef(true);

  // Silent background refresh — resets to page 1, keeps list visible
  const refetch = useCallback(() => {
    setPage(1);
    setTick((t) => t + 1);
  }, []);

  // Append next page
  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  // Optimistic single-thread patch (e.g. mark as read)
  const updateThread = useCallback((phone: string, patch: Partial<InboxThread>) => {
    setThreads((prev) =>
      prev.map((t) => (t.phone === phone ? { ...t, ...patch } : t))
    );
  }, []);

  const hasMore = meta ? meta.page < meta.totalPages : false;

  useEffect(() => {
    let cancelled = false;
    const isFirstPage = page === 1;

    // Show full loading spinner only on initial mount; subsequent refetches are silent
    if (isFirstPage && isInitialLoad.current) {
      setLoading(true);
    } else if (!isFirstPage) {
      setLoadingMore(true);
    }

    setError(null);

    inboxService
      .getInbox(page, LIMIT)
      .then((res) => {
        if (!cancelled) {
          setThreads((prev) => (isFirstPage ? res.data : [...prev, ...res.data]));
          setMeta(res.meta);
          if (isFirstPage) isInitialLoad.current = false;
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load inbox");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => { cancelled = true; };
  }, [page, tick]);

  return { threads, meta, loading, loadingMore, hasMore, error, refetch, loadMore, updateThread };
}
