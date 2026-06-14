import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type { InboxResponse, ConversationResponse, MarkReadResponse, MarkReadPayload } from "@/types";

export const inboxService = {
  getInbox: (page = 1, limit = 20, unread?: boolean): Promise<InboxResponse> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.get<InboxResponse>("/inbox", {
      senderId, page, limit,
      ...(unread ? { unread: "true" } : {}),
    });
  },

  getConversation: (phone: string, page = 1, limit = 50): Promise<ConversationResponse> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.get<ConversationResponse>("/inbox/conversation", { senderId, phone, page, limit });
  },

  markRead: (phone: string): Promise<MarkReadResponse> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    const payload: MarkReadPayload = { senderId, phone };
    return api.patch<MarkReadResponse>("/inbox/read", payload);
  },
};
