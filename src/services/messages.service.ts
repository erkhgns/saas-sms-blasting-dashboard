import { api } from "./api";
import type { Conversation, Message, SendMessagePayload, SendMessageResponse } from "@/types";

export const messagesService = {
  getConversations: (search?: string) =>
    api.get<Conversation[]>("/messages/conversations", search ? { search } : {}),

  getMessages: (conversationId: number) =>
    api.get<Message[]>(`/messages/conversations/${conversationId}`),

  send: (payload: SendMessagePayload) =>
    api.post<SendMessageResponse>("/messages/send", payload),

  reply: (conversationId: number, text: string) =>
    api.post<Message>(`/messages/conversations/${conversationId}/reply`, { text }),
};
