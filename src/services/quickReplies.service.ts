import { api, ApiError } from "./api";
import type {
  QuickReply,
  CreateQuickReplyPayload,
  UpdateQuickReplyPayload,
  ReorderQuickRepliesPayload,
} from "@/types";

// The account comes from the access token — no senderId needed on these routes.
export const quickRepliesService = {
  /** All quick replies for the account, sorted by sortOrder (lowest first). */
  getAll: () =>
    api.get<QuickReply[]>("/quick-replies"),

  /** 201 — placed last. 400 validation, 409 shortcut taken, 422 limit (200) reached. */
  create: (payload: CreateQuickReplyPayload) =>
    api.post<QuickReply>("/quick-replies", payload),

  /** 400 validation, 404 not found, 409 shortcut taken. */
  update: (id: string, payload: UpdateQuickReplyPayload) =>
    api.patch<QuickReply>(`/quick-replies/${id}`, payload),

  /** 204. 404 if not found. */
  delete: (id: string) =>
    api.delete<void>(`/quick-replies/${id}`),

  /** 204. 409 when ids no longer match the account's list (another agent added/deleted one). */
  reorder: (payload: ReorderQuickRepliesPayload) =>
    api.put<void>("/quick-replies/order", payload),
};

/**
 * Per-field messages from a Quick Replies error response.
 * These endpoints use a flat format: { issues: { name: ["Name is required"] } }.
 */
export function quickReplyFieldErrors(err: unknown): Partial<Record<keyof CreateQuickReplyPayload, string>> {
  if (!(err instanceof ApiError)) return {};
  const issues = (err.data as { issues?: Record<string, unknown> } | undefined)?.issues;
  if (!issues || typeof issues !== "object") return {};
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(issues)) {
    if (Array.isArray(value) && typeof value[0] === "string") out[field] = value[0];
  }
  return out;
}
