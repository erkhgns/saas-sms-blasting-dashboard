import { useState, useEffect, useCallback } from "react";
import { messagesService } from "@/services";
import type { Conversation, Message } from "@/types";

interface UseMessagesReturn {
  conversations: Conversation[];
  messages: Message[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  selectConversation: (id: number) => void;
  sendReply: (text: string) => Promise<void>;
}

export function useMessages(): UseMessagesReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    messagesService
      .getConversations()
      .then(setConversations)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  const selectConversation = useCallback((id: number) => {
    setSelectedId(id);
    messagesService
      .getMessages(id)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load messages"));
  }, []);

  const sendReply = useCallback(
    async (text: string) => {
      if (!selectedId) return;
      const message = await messagesService.reply(selectedId, text);
      setMessages((prev) => [...prev, message]);
    },
    [selectedId]
  );

  return { conversations, messages, loading, error, selectedId, selectConversation, sendReply };
}
