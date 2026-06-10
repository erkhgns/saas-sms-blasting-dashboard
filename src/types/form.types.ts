import type { TokenDataType } from "./token.types";

// ── Status ────────────────────────────────────────────────────────────────────

export type FormStatus = "active" | "inactive";

// ── Field configs ─────────────────────────────────────────────────────────────

/** Config for a standard configurable form field (birthday / address). */
export interface FormFieldConfig {
  visible: boolean;
  required: boolean;
}

/** Config for a token-backed custom field added to the form. */
export interface FormTokenFieldConfig {
  tokenKey: string;
  label: string;
  type: TokenDataType;
  required: boolean;
}

// ── Core model (dashboard / authenticated) ────────────────────────────────────

export interface GabyForm {
  id: string;
  senderId: string;
  name: string;
  /** Custom vanity slug, e.g. "juan-barbershop". Null if not set. */
  slug: string | null;
  /** Auto-generated short code, never changes. e.g. "xk3p" */
  shortCode: string;
  headerMessage: string | null;
  thankYouMessage: string;
  status: FormStatus;
  fields: {
    birthday: FormFieldConfig;
    address: FormFieldConfig;
  };
  /** Token-backed custom fields included in the public form. */
  tokenFields: FormTokenFieldConfig[];
  /** Tag IDs applied to every contact who submits. */
  defaultTagIds: string[];
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Public config (unauthenticated) ──────────────────────────────────────────

/**
 * Shape returned by GET /public/forms/:code — contains only what the
 * customer-facing form needs. No sensitive business data.
 *
 * ⚠️  id, senderId, shortCode, slug, senderName, submissionCount, and
 *     defaultTagIds are NEVER included in this response (API release notes).
 */
export interface FormPublicConfig {
  name: string;
  headerMessage: string | null;
  thankYouMessage: string;
  status: FormStatus;
  fields: {
    birthday: FormFieldConfig;
    address: FormFieldConfig;
  };
  tokenFields: FormTokenFieldConfig[];
}

// ── Submission payload (public form → API) ────────────────────────────────────

export interface FormSubmissionPayload {
  name: string;
  phone: string;
  birthday?: string;   // YYYY-MM-DD, only when birthday field is visible
  address?: string;    // only when address field is visible
  /** Token field values keyed by tokenKey. Boolean fields send "true"/"false". */
  tokenValues?: Record<string, string>;
  consentGiven: boolean;
}

// ── Service payloads (authenticated) ─────────────────────────────────────────

/**
 * A token field entry in a create/update payload.
 * label and type must be supplied — the API uses them to render the field
 * on the public form without needing a separate token lookup.
 */
export interface FormTokenFieldPayload {
  tokenKey: string;
  label: string;
  type: TokenDataType;
  required: boolean;
}

export interface CreateFormPayload {
  /** senderId is NOT sent — the API resolves it from the Bearer JWT. */
  name: string;
  slug?: string;
  headerMessage?: string;
  thankYouMessage?: string;
  status?: FormStatus;
  fields?: {
    birthday?: Partial<FormFieldConfig>;
    address?: Partial<FormFieldConfig>;
  };
  tokenFields?: FormTokenFieldPayload[];
  defaultTagIds: string[];
}

export interface UpdateFormPayload {
  name?: string;
  slug?: string | null;
  headerMessage?: string | null;
  thankYouMessage?: string;
  status?: FormStatus;
  fields?: {
    birthday?: Partial<FormFieldConfig>;
    address?: Partial<FormFieldConfig>;
  };
  /** Replaces the entire tokenFields list. Omit to leave unchanged. */
  tokenFields?: FormTokenFieldPayload[];
  defaultTagIds?: string[];
}

export interface SlugCheckResponse {
  available: boolean;
}

// ── Local builder state (never sent directly to API) ──────────────────────────

/**
 * Full local form state used inside FormBuilderDrawer.
 * Converted to CreateFormPayload / UpdateFormPayload on save.
 */
export interface FormBuilderState {
  name: string;
  slug: string;
  headerMessage: string;
  thankYouMessage: string;
  status: FormStatus;
  fields: {
    birthday: FormFieldConfig;
    address: FormFieldConfig;
  };
  /** Ordered list of token keys included in the form + their required flags. */
  tokenFields: { tokenKey: string; required: boolean }[];
  defaultTagIds: string[];
}

/** Returns a blank form builder state for the "Create form" drawer. */
export function emptyFormBuilder(): FormBuilderState {
  return {
    name: "",
    slug: "",
    headerMessage: "",
    thankYouMessage: "",
    status: "active",
    fields: {
      birthday: { visible: false, required: false },
      address:  { visible: false, required: false },
    },
    tokenFields: [],
    defaultTagIds: [],
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  active:   "Active",
  inactive: "Inactive",
};
