import { useState, useEffect, useCallback, useRef } from "react";
import { inboxService } from "@/services";
import type { ConversationMessage, ConversationResponse } from "@/types";

interface UseConversationResult {
  messages: ConversationMessage[];
  conversation: ConversationResponse | null;
  loading: boolean;        // true only while a newly selected conversation loads
  error: string | null;
  refetch: () => Promise<void>; // silent background refresh — no loading banner
}

export function useConversation(phone: string | null): UseConversationResult {
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const phoneRef = useRef(phone);
  phoneRef.current = phone;

  // Initial load for a newly selected conversation — shows the loading banner
  useEffect(() => {
    if (!phone) {
      setConversation(null);
      return;
    }

    let cancelled = false;
    setConversation(null);
    setLoading(true);
    setError(null);

    inboxService
      .getConversation(phone)
      .then((res) => {
        if (!cancelled) setConversation(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load conversation");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [phone]);

  // Silent refresh — keeps the current state object when nothing changed,
  // so the page doesn't re-render or re-scroll. Errors are ignored; the next refresh retries.
  const refetch = useCallback((): Promise<void> => {
    const requested = phoneRef.current;
    if (!requested) return Promise.resolve();

    return inboxService
      .getConversation(requested)
      .then((res) => {
        if (phoneRef.current !== requested) return; // user switched conversations
        setConversation((prev) =>
          prev && JSON.stringify(prev) === JSON.stringify(res) ? prev : res
        );
      })
      .catch(() => {/* silent */});
  }, []);

  return {
    messages: conversation?.messages ?? [],
    conversation,
    loading,
    error,
    refetch,
  };
}
