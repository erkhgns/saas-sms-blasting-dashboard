import { api } from "./api";
import { authStore } from "@/utils/auth.store";

// ── Shared advanced-config types ──────────────────────────────────────────────

export type PancakeTokenKey =
  | "order_id" | "tracking_number" | "cod"
  | "first_name" | "last_name" | "full_name" | "product";

export interface PancakeTokenMapping {
  pancakeToken:   PancakeTokenKey;
  customFieldKey: string;
  operator?:      "upsert" | "increment" | "decrement";
}

export interface PancakeManualFieldUpdate {
  customFieldKey: string;
  type:           "text" | "number" | "decimal" | "boolean" | "date";
  value:          string | number | boolean;
  operator?:      "upsert" | "increment" | "decrement" | "add_days" | "subtract_days";
}

// ── Status templates ──────────────────────────────────────────────────────────

export interface PancakeTemplate {
  id: string;
  senderId: string;
  effectiveStatus: string;
  statusLabel: string;
  message: string;
  isEnabled: boolean;
  tagsToAdd: string[];
  tagsToRemove: string[];
  tokenMappings: PancakeTokenMapping[];
  manualFieldUpdates: PancakeManualFieldUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePancakeTemplatePayload {
  senderId: string;
  effectiveStatus: string;
  message: string;
  isEnabled: boolean;
  tagsToAdd: string[];
  tagsToRemove: string[];
  tokenMappings: PancakeTokenMapping[];
  manualFieldUpdates: PancakeManualFieldUpdate[];
}

export interface UpdatePancakeTemplatePayload {
  message?: string;
  isEnabled?: boolean;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
  tokenMappings?: PancakeTokenMapping[];
  manualFieldUpdates?: PancakeManualFieldUpdate[];
}

// ── Tag templates ─────────────────────────────────────────────────────────────

export interface PancakeTagTemplate {
  id: string;
  senderId: string;
  tagName: string;
  message: string;
  isEnabled: boolean;
  tagsToAdd: string[];
  tagsToRemove: string[];
  tokenMappings: PancakeTokenMapping[];
  manualFieldUpdates: PancakeManualFieldUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePancakeTagTemplatePayload {
  senderId: string;
  tagName: string;
  message: string;
  isEnabled: boolean;
  tagsToAdd: string[];
  tagsToRemove: string[];
  tokenMappings: PancakeTokenMapping[];
  manualFieldUpdates: PancakeManualFieldUpdate[];
}

export interface UpdatePancakeTagTemplatePayload {
  message?: string;
  isEnabled?: boolean;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
  tokenMappings?: PancakeTokenMapping[];
  manualFieldUpdates?: PancakeManualFieldUpdate[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const pancakeService = {
  // Status templates
  getTemplates: (): Promise<PancakeTemplate[]> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.get<PancakeTemplate[]>("/pancake/templates", { senderId });
  },

  createTemplate: (payload: CreatePancakeTemplatePayload): Promise<PancakeTemplate> =>
    api.post<PancakeTemplate>("/pancake/templates", payload),

  updateTemplate: (id: string, payload: UpdatePancakeTemplatePayload): Promise<PancakeTemplate> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.put<PancakeTemplate>(`/pancake/templates/${id}?senderId=${senderId}`, payload);
  },

  deleteTemplate: (id: string): Promise<void> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.delete<void>(`/pancake/templates/${id}?senderId=${senderId}`);
  },

  // Tag templates
  getTagTemplates: (): Promise<PancakeTagTemplate[]> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.get<PancakeTagTemplate[]>("/pancake/tag-templates", { senderId });
  },

  createTagTemplate: (payload: CreatePancakeTagTemplatePayload): Promise<PancakeTagTemplate> =>
    api.post<PancakeTagTemplate>("/pancake/tag-templates", payload),

  updateTagTemplate: (id: string, payload: UpdatePancakeTagTemplatePayload): Promise<PancakeTagTemplate> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.put<PancakeTagTemplate>(`/pancake/tag-templates/${id}?senderId=${senderId}`, payload);
  },

  deleteTagTemplate: (id: string): Promise<void> => {
    const senderId = authStore.getUser()?.id;
    if (!senderId) return Promise.reject(new Error("Not authenticated"));
    return api.delete<void>(`/pancake/tag-templates/${id}?senderId=${senderId}`);
  },
};
