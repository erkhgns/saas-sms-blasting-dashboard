import { useState, useEffect, useCallback, useRef } from "react";
import { inboxService } from "@/services";
import type { InboxThread, InboxMeta } from "@/types";

interface UseInboxOptions {
  unread?: boolean;
  tagIds?: string[];
}

interface UseInboxResult {
  threads: InboxThread[];
  meta: InboxMeta | null;
  loading: boolean;        // true only on initial mount
  loadingMore: boolean;    // true while fetching the next page
  hasMore: boolean;
  error: string | null;
  refetch: () => Promise<void>; // silent background refresh — merges page 1, keeps loaded pages
  loadMore: () => void;
  updateThread: (phone: string, patch: Partial<InboxThread>) => void; // optimistic patch
}

const LIMIT = 20;

/**
 * Merge a fresh page 1 into the threads already loaded.
 * Fresh threads go on top in server order; loaded threads below keep their place.
 * A loaded thread missing from a fresh page 1 whose activity is at or above the
 * page's cutoff no longer belongs there (read under "unread only", deleted, etc.) — drop it.
 */
function mergeFirstPage(prev: InboxThread[], fresh: InboxThread[]): InboxThread[] {
  if (fresh.length < LIMIT) return fresh; // page 1 is the whole list
  const freshPhones = new Set(fresh.map((t) => t.phone));
  const cutoff = fresh[fresh.length - 1].lastActivityAt;
  const rest = prev.filter((t) => !freshPhones.has(t.phone) && t.lastActivityAt < cutoff);
  return [...fresh, ...rest];
}

export function useInbox({ unread, tagIds }: UseInboxOptions = {}): UseInboxResult {
  const [threads, setThreads]         = useState<InboxThread[]>([]);
  const [meta, setMeta]               = useState<InboxMeta | null>(null);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [tick, setTick]               = useState(0);

  const isInitialLoad = useRef(true);
  const refreshing    = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef<Promise<void> | null>(null);

  const unreadRef = useRef(unread);
  useEffect(() => {
    if (unreadRef.current !== unread) {
      unreadRef.current = unread;
      setPage(1);
      setTick((t) => t + 1);
    }
  }, [unread]);

  // Reset to page 1 when tag filter changes (compare by serialized value)
  const tagIdsRef = useRef(tagIds?.join(",") ?? "");
  useEffect(() => {
    const next = tagIds?.join(",") ?? "";
    if (tagIdsRef.current !== next) {
      tagIdsRef.current = next;
      setPage(1);
      setTick((t) => t + 1);
    }
  }, [tagIds?.join(",")]);

  // Silent background refresh — fetches page 1 and merges it, so scroll position
  // and already-loaded pages are kept. Errors are ignored; the next refresh retries.
  const refetch = useCallback(function refresh(): Promise<void> {
    if (isInitialLoad.current) return Promise.resolve();
    // One request at a time; calls made mid-request (e.g. right after sending) share
    // one follow-up refresh that runs when the current one ends
    if (refreshing.current) {
      refreshQueued.current ??= refreshing.current.then(() => {
        refreshQueued.current = null;
        return refresh();
      });
      return refreshQueued.current;
    }
    const filterKey = `${unreadRef.current}|${tagIdsRef.current}`;

    const request = inboxService
      .getInbox(1, LIMIT, unreadRef.current, tagIdsRef.current ? tagIdsRef.current.split(",") : undefined)
      .then((res) => {
        // Filters changed mid-request — this result belongs to the old list
        if (filterKey !== `${unreadRef.current}|${tagIdsRef.current}`) return;
        setThreads((prev) => mergeFirstPage(prev, res.data));
        setMeta((prev) => (prev ? { ...res.meta, page: prev.page } : res.meta));
      })
      .catch(() => {/* silent */})
      .finally(() => { refreshing.current = null; });
    refreshing.current = request;
    return request;
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
      .getInbox(page, LIMIT, unreadRef.current, tagIdsRef.current ? tagIdsRef.current.split(",") : undefined)
      .then((res) => {
        if (!cancelled) {
          setThreads((prev) => {
            if (isFirstPage) return res.data;
            // Background refreshes can shift offsets, so a later page may repeat threads
            const have = new Set(prev.map((t) => t.phone));
            return [...prev, ...res.data.filter((t) => !have.has(t.phone))];
          });
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
