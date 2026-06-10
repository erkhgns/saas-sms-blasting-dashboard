import type { TokenDataType } from "./token.types";

// ── Status ────────────────────────────────────────────────────────────────────

export type FormStatus = "active" | "inactive";

// ── Field type ────────────────────────────────────────────────────────────────

/**
 * How a token-backed custom field is rendered on the public form.
 * Stored on FormTokenFieldConfig and used by the public renderer.
 */
export type FormFieldType =
  | "text_input"
  | "multiple_choice"
  | "dropdown"
  | "star_rating"
  | "date_picker"
  | "yes_no";

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
  /** How the field is rendered on the public form. */
  fieldType: FormFieldType;
  /** Selectable options — non-empty only for multiple_choice / dropdown. */
  choices: string[];
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
  /** Token field values keyed by tokenKey. yes_no sends "true"/"false". */
  tokenValues?: Record<string, string>;
  consentGiven: boolean;
}

// ── Service payloads (authenticated) ─────────────────────────────────────────

/**
 * A token field entry in a create/update payload.
 * label, type, fieldType, and choices must all be supplied — the API uses
 * them to render the field on the public form without a separate token lookup.
 */
export interface FormTokenFieldPayload {
  tokenKey: string;
  label: string;
  type: TokenDataType;
  fieldType: FormFieldType;
  /** Required and non-empty for multiple_choice / dropdown; [] for all others. */
  choices: string[];
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

// ── Submission history ────────────────────────────────────────────────────────

export interface FormSubmission {
  id: string;
  submittedAt: string;
  phone: string;
  payload: {
    name: string;
    phone: string;
    birthday?: string;
    address?: string | null;
    tokenValues: Record<string, string | number>;
    consentGiven: boolean;
  };
}

export interface SubmissionsResponse {
  data: FormSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubmissionsExportParams {
  startDate?: string;
  endDate?: string;
}

// ── Local builder state (never sent directly to API) ──────────────────────────

/**
 * Full local form state used inside FormEditor.
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
  /** Ordered list of token fields included in the form — fieldType & choices stored locally. */
  tokenFields: {
    tokenKey: string;
    fieldType: FormFieldType;
    choices: string[];
    required: boolean;
  }[];
  defaultTagIds: string[];
}

/** Returns a blank form builder state for the "Create form" editor. */
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

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text_input:       "Text Input",
  multiple_choice:  "Multiple Choice",
  dropdown:         "Dropdown",
  star_rating:      "Star Rating",
  date_picker:      "Date Picker",
  yes_no:           "Yes / No",
};
