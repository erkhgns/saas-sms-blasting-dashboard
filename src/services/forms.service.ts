import { api } from "./api";
import type {
  GabyForm,
  CreateFormPayload,
  UpdateFormPayload,
  SlugCheckResponse,
  FormStatus,
} from "@/types";

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
};
