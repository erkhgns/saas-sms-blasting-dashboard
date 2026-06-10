// ── Enums / unions ────────────────────────────────────────────────────────────

export type TriggerType = "INBOUND_MESSAGE" | "TOKEN_UPDATED" | "SCHEDULED" | "FORM_SUBMITTED";

export type AutomationFrequency =
  | "EVERY_TIME"
  | "ONCE_PER_24H"
  | "ONCE_PER_7D"
  | "ONCE_PER_30D"
  | "ONCE_PER_CONTACT";

export type ActionType = "SEND_SMS" | "APPLY_TAG" | "REMOVE_TAG" | "OPT_OUT";

export type ConditionSubjectType = "TOKEN" | "TAG";

/** Operators valid for TOKEN conditions — upper-case to match API. */
export type TokenOperator =
  | "EQUALS" | "NOT_EQUALS"
  | "GT" | "LT" | "GTE" | "LTE"
  | "CONTAINS" | "NOT_CONTAINS" | "STARTS_WITH"
  | "IS_EMPTY" | "IS_NOT_EMPTY"
  | "IS_TRUE" | "IS_FALSE"
  | "IS_TODAY"
  | "DAYS_AGO" | "DAYS_FROM_NOW" | "WITHIN_NEXT_DAYS"
  | "BEFORE" | "AFTER";

/** Operators valid for TAG conditions. */
export type TagOperator = "HAS_TAG" | "NOT_HAS_TAG";

// ── API shapes — conditions ───────────────────────────────────────────────────

export type AutomationCondition =
  | { type: "TOKEN"; tokenKey: string; operator: TokenOperator; value: string }
  | { type: "TAG";   tagId: string;   operator: TagOperator;   value?: string };

// ── API shapes — actions ──────────────────────────────────────────────────────

/** SMS priority: 0 = normal, 1 = high, 2 = urgent */
export type SmsPriority = 0 | 1 | 2;

export type AutomationAction =
  | { type: "SEND_SMS";   message: string; priority: SmsPriority }
  | { type: "APPLY_TAG";  tagId: string }
  | { type: "REMOVE_TAG"; tagId: string }
  | { type: "OPT_OUT" };

// ── API shapes — trigger config ───────────────────────────────────────────────

export type TriggerConfig =
  | { keywords: string[] }           // INBOUND_MESSAGE
  | { tokenKey: string }             // TOKEN_UPDATED
  | Record<string, never>            // SCHEDULED (empty object)
  | { formId: string | null };       // FORM_SUBMITTED (null = any form)

// ── Core model ────────────────────────────────────────────────────────────────

export interface AutomationRule {
  id: string;
  senderId: string;
  name: string;
  isEnabled: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: AutomationCondition[];
  frequency: AutomationFrequency;
  actions: AutomationAction[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSettings {
  automationsPaused: boolean;
}

// ── API payloads ──────────────────────────────────────────────────────────────

export interface CreateAutomationRulePayload {
  senderId: string;
  name: string;
  isEnabled: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: AutomationCondition[];
  frequency: AutomationFrequency;
  actions: AutomationAction[];
  sortOrder?: number;
}

export interface UpdateAutomationRulePayload {
  name?: string;
  isEnabled?: boolean;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  conditions?: AutomationCondition[];
  frequency?: AutomationFrequency;
  actions?: AutomationAction[];
  sortOrder?: number;
}

export interface ReorderRulesPayload {
  senderId: string;
  order: { id: string; sortOrder: number }[];
}

export interface GetRulesResponse {
  data:  AutomationRule[];
  total: number;
}

// ── Preview ───────────────────────────────────────────────────────────────────

export interface AutomationPreviewResult {
  matched: number;
  total: number;
  sample: { id: string; phone: string; name: string }[];
  cachedAt: string;
}

// ── Log ───────────────────────────────────────────────────────────────────────

export type AutomationLogResult = "SUCCESS" | "PARTIAL" | "FAILED";

export interface AutomationLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  senderId: string;
  contactId: string;
  contactPhone: string;
  triggerType: TriggerType;
  actionsTaken: AutomationAction[];
  result: AutomationLogResult;
  errorMessage: string | null;
  firedAt: string;
}

export interface AutomationLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AutomationLogResponse {
  data: AutomationLogEntry[];
  meta: AutomationLogMeta;
}

export interface AutomationLogParams {
  senderId:     string;
  ruleId?:      string;
  contactId?:   string;
  triggerType?: TriggerType;
  result?:      AutomationLogResult;
  from?:        string;
  to?:          string;
  page?:        number;
  limit?:       number;
}

// ── Local form state (never sent directly to API) ─────────────────────────────

/**
 * Flat form row for a single condition inside the drawer.
 * Converted to AutomationCondition on save.
 */
export interface ConditionFormRow {
  _localId: string;
  subjectType: ConditionSubjectType | null;
  tokenKey: string | null;    // set when subjectType === "TOKEN"
  tagId: string | null;       // set when subjectType === "TAG"
  operator: string | null;    // TokenOperator | TagOperator | null until chosen
  value: string;              // empty string for no-value operators
}

/**
 * Flat form row for a single action inside the drawer.
 * Converted to AutomationAction on save.
 */
export interface ActionFormRow {
  _localId: string;
  type: ActionType;
  // SEND_SMS
  message?: string;
  smsPriority?: SmsPriority;   // default 1 (Normal)
  // APPLY_TAG | REMOVE_TAG
  tagId?: string | null;
}

/** Full form state for the create/edit drawer. */
export interface AutomationFormState {
  name: string;
  triggerType: TriggerType | null;
  keywords: string[];           // INBOUND_MESSAGE trigger config
  tokenKey: string | null;      // TOKEN_UPDATED trigger config
  formId: string | null;        // FORM_SUBMITTED trigger config (null = any form)
  conditions: ConditionFormRow[];
  actions: ActionFormRow[];
  frequency: AutomationFrequency;
  isEnabled: boolean;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  INBOUND_MESSAGE: "Inbound Message",
  TOKEN_UPDATED:   "Token Updated",
  SCHEDULED:       "Scheduled",
  FORM_SUBMITTED:  "Form Submitted",
};

export const AUTOMATION_FREQUENCY_LABELS: Record<AutomationFrequency, string> = {
  EVERY_TIME:       "Every time",
  ONCE_PER_24H:     "Once every 24 hours",
  ONCE_PER_7D:      "Once every 7 days",
  ONCE_PER_30D:     "Once every 30 days",
  ONCE_PER_CONTACT: "Once per contact",
};

export const AUTOMATION_FREQUENCY_OPTIONS: {
  value: AutomationFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "EVERY_TIME",
    label: "Every time (no limit)",
    description: "No limit. The rule fires every time the trigger and conditions are met.",
  },
  {
    value: "ONCE_PER_CONTACT",
    label: "Once per contact",
    description: "This rule fires once per contact and never again, even if conditions are met again.",
  },
  {
    value: "ONCE_PER_24H",
    label: "Once every 24 hours",
    description: "This rule can fire for the same contact once per day at most.",
  },
  {
    value: "ONCE_PER_7D",
    label: "Once every 7 days",
    description: "This rule can fire for the same contact once every 7 days at most.",
  },
  {
    value: "ONCE_PER_30D",
    label: "Once every 30 days",
    description: "This rule can fire for the same contact once every 30 days at most.",
  },
];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  SEND_SMS:   "Send SMS",
  APPLY_TAG:  "Apply Tag",
  REMOVE_TAG: "Remove Tag",
  OPT_OUT:    "Mark as Opted Out",
};

export const AUTOMATION_LOG_RESULT_LABELS: Record<AutomationLogResult, string> = {
  SUCCESS: "Success",
  PARTIAL: "Partial",
  FAILED:  "Failed",
};

export const SMS_PRIORITY_LABELS: Record<SmsPriority, string> = {
  0: "Low",
  1: "Normal",
  2: "High",
};

// ── Factory ───────────────────────────────────────────────────────────────────

/** Returns a blank form state for the "Create rule" drawer. */
export function emptyAutomationForm(): AutomationFormState {
  return {
    name: "",
    triggerType: null,
    keywords: [],
    tokenKey: null,
    formId: null,
    conditions: [],
    actions: [],
    frequency: "EVERY_TIME",
    isEnabled: true,
  };
}

/** Default frequency to pre-select based on the chosen trigger type. */
export function defaultFrequencyFor(trigger: TriggerType): AutomationFrequency {
  if (trigger === "INBOUND_MESSAGE") return "EVERY_TIME";
  if (trigger === "TOKEN_UPDATED")   return "ONCE_PER_CONTACT";
  if (trigger === "FORM_SUBMITTED")  return "ONCE_PER_CONTACT";
  return "ONCE_PER_24H"; // SCHEDULED
}
