import { api } from "./api";
import type { Conversation, Message, SendMessagePayload, SendMessageResponse, CreateSmsPayload, SmsRecord, BulkSmsPayload, BulkSmsResponse, SmsListParams, SmsListResponse } from "@/types";

export const messagesService = {
  getConversations: (search?: string) =>
    api.get<Conversation[]>("/messages/conversations", search ? { search } : {}),

  getMessages: (conversationId: number) =>
    api.get<Message[]>(`/messages/conversations/${conversationId}`),

  send: (payload: SendMessagePayload) =>
    api.post<SendMessageResponse>("/messages/send", payload),

  reply: (conversationId: number, text: string) =>
    api.post<Message>(`/messages/conversations/${conversationId}/reply`, { text }),

  createSms: (payload: CreateSmsPayload) =>
    api.post<SmsRecord>("/sms", payload),

  createBulkSms: (payload: BulkSmsPayload) =>
    api.post<BulkSmsResponse>("/sms/bulk", payload),

  getSms: ({ senderId, status, priority, search, dateFrom, dateTo, page = 1, limit = 10, sortBy }: SmsListParams) =>
    api.get<SmsListResponse>("/sms", {
      senderId,
      ...(status   !== undefined ? { status }   : {}),
      ...(priority !== undefined ? { priority }  : {}),
      ...(search   ? { search }   : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo   ? { dateTo }   : {}),
      ...(sortBy   ? { sortBy }   : {}),
      page,
      limit,
    }),

  deleteSms: (id: string) =>
    api.delete<void>(`/sms/${id}`),
};
