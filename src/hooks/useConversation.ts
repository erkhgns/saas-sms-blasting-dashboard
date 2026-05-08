import { useState, useEffect, useCallback } from "react";
import { inboxService } from "@/services";
import type { ConversationMessage, ConversationResponse } from "@/types";

interface UseConversationResult {
  messages: ConversationMessage[];
  conversation: ConversationResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversation(phone: string | null): UseConversationResult {
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [tick, setTick]                 = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!phone) {
      setConversation(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    inboxService
      .getConversation(phone)
      .then((res) => {
        console.log("CONVERSATION_RESP", res);
        if (!cancelled) setConversation(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load conversation");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [phone, tick]);

  return {
    messages: conversation?.messages ?? [],
    conversation,
    loading,
    error,
    refetch,
  };
}
