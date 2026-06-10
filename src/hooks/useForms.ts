import { useState, useEffect, useCallback } from "react";
import { formsService } from "@/services/forms.service";
import { authStore } from "@/utils/auth.store";
import type { GabyForm, CreateFormPayload, UpdateFormPayload, FormStatus } from "@/types";

interface UseFormsReturn {
  forms: GabyForm[];
  loading: boolean;
  error: string | null;
  /** ID of the form whose status is currently being toggled (in-flight). */
  togglingId: string | null;
  refetch: () => void;
  createForm: (payload: CreateFormPayload) => Promise<GabyForm>;
  updateForm: (id: string, payload: UpdateFormPayload) => Promise<GabyForm>;
  deleteForm: (id: string) => Promise<void>;
  /**
   * Optimistically flip a form's status. Reverts on API failure.
   */
  toggleStatus: (id: string, newStatus: FormStatus) => Promise<void>;
}

export function useForms(): UseFormsReturn {
  const [forms,      setForms]      = useState<GabyForm[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const senderId = authStore.getUser()?.id ?? "";

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!senderId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await formsService.getForms();
      // Sort descending by createdAt
      setForms([...data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch {
      setError("Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, [senderId]);

  useEffect(() => { load(); }, [load]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const createForm = useCallback(async (payload: CreateFormPayload): Promise<GabyForm> => {
    const created = await formsService.createForm(payload);
    setForms((prev) => [created, ...prev]);
    return created;
  }, []);

  // ── Update ─────────────────────────────────────────────────────────────────
  const updateForm = useCallback(async (
    id: string,
    payload: UpdateFormPayload,
  ): Promise<GabyForm> => {
    const updated = await formsService.updateForm(id, payload);
    setForms((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteForm = useCallback(async (id: string): Promise<void> => {
    await formsService.deleteForm(id);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── Toggle status (optimistic) ─────────────────────────────────────────────
  const toggleStatus = useCallback(async (id: string, newStatus: FormStatus): Promise<void> => {
    // Optimistic flip
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)));
    setTogglingId(id);
    try {
      const updated = await formsService.toggleStatus(id, newStatus);
      setForms((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch {
      // Revert
      const reverted: FormStatus = newStatus === "active" ? "inactive" : "active";
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, status: reverted } : f)));
      throw new Error("Failed to update form status.");
    } finally {
      setTogglingId(null);
    }
  }, []);

  return {
    forms,
    loading,
    error,
    togglingId,
    refetch: load,
    createForm,
    updateForm,
    deleteForm,
    toggleStatus,
  };
}
