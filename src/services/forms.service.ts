import { api } from "./api";
import { authStore } from "@/utils/auth.store";
import type {
  GabyForm,
  CreateFormPayload,
  UpdateFormPayload,
  SlugCheckResponse,
  FormStatus,
  SubmissionsResponse,
  SubmissionsExportParams,
} from "@/types";

const API_BASE =
  ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL) ?? "/api";

/**
 * Authenticated forms service — all methods require a valid session.
 * senderId is resolved by the API from the Bearer JWT; it is NOT passed
 * in request bodies or query params.
 */
export const formsService = {
  /** Fetch all forms for the current sender (ordered newest-first). */
  getForms: () =>
    api.get<GabyForm[]>("/forms"),

  /** Fetch a single form by ID. */
  getForm: (id: string) =>
    api.get<GabyForm>(`/forms/${id}`),

  /** Create a new form. senderId is inferred from the JWT on the server. */
  createForm: (payload: CreateFormPayload) =>
    api.post<GabyForm>("/forms", payload),

  /** Partially update a form. Only supplied fields are changed. */
  updateForm: (id: string, payload: UpdateFormPayload) =>
    api.patch<GabyForm>(`/forms/${id}`, payload),

  /** Hard-delete a form and its submission history. Contacts are preserved. */
  deleteForm: (id: string) =>
    api.delete<void>(`/forms/${id}`),

  /** Toggle a form between active and inactive. */
  toggleStatus: (id: string, status: FormStatus) =>
    api.patch<GabyForm>(`/forms/${id}/status`, { status }),

  /**
   * Real-time slug availability check for the form builder.
   * Pass excludeId (the current form's ID) in edit mode so the form's own
   * slug doesn't falsely appear as taken.
   */
  checkSlugAvailability: (slug: string, excludeId?: string) => {
    const params = new URLSearchParams({ slug });
    if (excludeId) params.set("excludeId", excludeId);
    return api.get<SlugCheckResponse>(`/forms/slug-check?${params.toString()}`);
  },

  /**
   * Fetch a paginated list of submissions for a specific form.
   * GET /forms/:id/submissions
   */
  getSubmissions: (
    formId: string,
    params: { page?: number; limit?: number; startDate?: string; endDate?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.page  != null) qs.set("page",  String(params.page));
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate)   qs.set("endDate",   params.endDate);
    const q = qs.toString() ? `?${qs}` : "";
    return api.get<SubmissionsResponse>(`/forms/${formId}/submissions${q}`);
  },

  /**
   * Download all submissions as a CSV blob.
   * GET /forms/:id/submissions/export
   * Returns { blob, filename } — filename is taken from the Content-Disposition
   * header so the frontend never needs to hardcode it.
   * Rate-limited to 1 request per minute per sender (API returns 429 if exceeded).
   */
  exportSubmissions: async (
    formId: string,
    params: SubmissionsExportParams,
  ): Promise<{ blob: Blob; filename: string }> => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate)   qs.set("endDate",   params.endDate);
    const q = qs.toString() ? `?${qs}` : "";

    const accessToken = authStore.getAccessToken();
    const res = await fetch(`${API_BASE}/forms/${formId}/submissions/export${q}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null) as { message?: string } | null;
      throw new Error(data?.message ?? "Export failed. Please try again.");
    }

    const blob = await res.blob();

    // Extract filename from Content-Disposition: attachment; filename="..."
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename[^;=\n]*=(['""]?)([^'";\n]*)\1/);
    const filename = match?.[2]?.trim() || `submissions-${formId}.csv`;

    return { blob, filename };
  },
};
