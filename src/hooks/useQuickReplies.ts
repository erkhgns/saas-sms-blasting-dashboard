import { useState, useEffect, useCallback, useRef } from "react";
import { quickRepliesService, ApiError } from "@/services";
import type { QuickReply, CreateQuickReplyPayload, UpdateQuickReplyPayload } from "@/types";

interface UseQuickRepliesResult {
  /** Sorted by sortOrder — the order agents see in the Inbox picker. */
  quickReplies: QuickReply[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (payload: CreateQuickReplyPayload) => Promise<QuickReply>;
  update: (id: string, payload: UpdateQuickReplyPayload) => Promise<QuickReply>;
  /** Removes the row immediately; restores it if the request fails. */
  remove: (id: string) => Promise<void>;
  /**
   * Applies the new order immediately and saves it. If another agent changed the
   * list meanwhile (409), the list is reloaded and the returned promise rejects.
   */
  reorder: (ordered: QuickReply[]) => Promise<void>;
}

const bySortOrder = (a: QuickReply, b: QuickReply) => a.sortOrder - b.sortOrder;

export function useQuickReplies(): UseQuickRepliesResult {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Latest list for revert paths without stale closures
  const listRef = useRef(quickReplies);
  listRef.current = quickReplies;

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const data = await quickRepliesService.getAll();
      setQuickReplies([...data].sort(bySortOrder));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quick replies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const create = useCallback(async (payload: CreateQuickReplyPayload) => {
    const created = await quickRepliesService.create(payload);
    setQuickReplies((prev) => [...prev, created].sort(bySortOrder));
    return created;
  }, []);

  const update = useCallback(async (id: string, payload: UpdateQuickReplyPayload) => {
    const updated = await quickRepliesService.update(id, payload);
    setQuickReplies((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    const previous = listRef.current;
    setQuickReplies((prev) => prev.filter((r) => r.id !== id));
    try {
      await quickRepliesService.delete(id);
    } catch (err) {
      // Already gone on the server (another agent deleted it) — keep it removed
      if (err instanceof ApiError && err.status === 404) return;
      setQuickReplies(previous);
      throw err;
    }
  }, []);

  const reorder = useCallback(async (ordered: QuickReply[]) => {
    const previous = listRef.current;
    setQuickReplies(ordered.map((r, i) => ({ ...r, sortOrder: i })));
    try {
      await quickRepliesService.reorder({ ids: ordered.map((r) => r.id) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) await refetch();
      else setQuickReplies(previous);
      throw err;
    }
  }, [refetch]);

  return { quickReplies, loading, error, refetch, create, update, remove, reorder };
}
