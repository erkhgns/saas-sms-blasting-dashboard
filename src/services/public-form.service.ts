import type { FormPublicConfig, FormSubmissionPayload } from "@/types";

const BASE_URL =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? "/api";

/**
 * Unauthenticated public form service.
 * Uses raw fetch — NO Bearer token, NO x-api-key.
 * Errors are surfaced as user-friendly messages only.
 */
export const publicFormService = {
  /**
   * Fetch the public config for a form by its short code or custom slug.
   * Throws on 404 (form not found) or network errors.
   */
  getFormConfig: async (code: string): Promise<FormPublicConfig> => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/public/forms/${encodeURIComponent(code)}`);
    } catch {
      throw new Error("Unable to load the form. Please check your connection and try again.");
    }
    if (res.status === 404) throw new Error("FORM_NOT_FOUND");
    if (!res.ok) throw new Error("Unable to load the form. Please try again.");
    return res.json() as Promise<FormPublicConfig>;
  },

  /**
   * Submit a completed public form.
   * Throws a special "TOO_MANY_ATTEMPTS" error on 429 so the caller can
   * show a specific message.
   */
  submitForm: async (
    code: string,
    payload: FormSubmissionPayload,
  ): Promise<{ success: boolean }> => {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/public/forms/${encodeURIComponent(code)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Something went wrong. Please try again.");
    }
    if (res.status === 429) throw new Error("TOO_MANY_ATTEMPTS");
    // 403 = form is inactive (not a 404 — the form exists but is closed)
    if (res.status === 403) throw new Error("FORM_INACTIVE");
    // 422 = server-side validation failure — surface the message to the user
    if (res.status === 422) {
      const data = await res.json().catch(() => null) as { message?: string } | null;
      throw new Error(data?.message ?? "Please check your details and try again.");
    }
    if (!res.ok) throw new Error("Something went wrong. Please try again.");
    return res.json() as Promise<{ success: boolean }>;
  },
};
