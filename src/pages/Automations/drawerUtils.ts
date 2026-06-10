/**
 * Conversion helpers + operator/value metadata for the Rule Drawer.
 * Pure functions — no React imports.
 */
import type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationFormState,
  ConditionFormRow,
  ActionFormRow,
  TriggerType,
  TriggerConfig,
  TokenDataType,
  CreateAutomationRulePayload,
  UpdateAutomationRulePayload,
} from "@/types";

// ── Local ID generator ────────────────────────────────────────────────────────

export function localId(): string {
  return Math.random().toString(36).slice(2);
}

// ── Operator metadata ─────────────────────────────────────────────────────────

export interface OperatorOption {
  value: string;
  label: string;
  /** How to render the value input. */
  valueKind: "text" | "number" | "decimal" | "date" | "days" | "none";
}

const TEXT_OPS: OperatorOption[] = [
  { value: "EQUALS",       label: "Equals",            valueKind: "text"    },
  { value: "NOT_EQUALS",   label: "Not equals",        valueKind: "text"    },
  { value: "CONTAINS",     label: "Contains",          valueKind: "text"    },
  { value: "NOT_CONTAINS", label: "Does not contain",  valueKind: "text"    },
  { value: "STARTS_WITH",  label: "Starts with",       valueKind: "text"    },
  { value: "IS_EMPTY",     label: "Is empty",          valueKind: "none"    },
  { value: "IS_NOT_EMPTY", label: "Is not empty",      valueKind: "none"    },
];

const NUMBER_OPS: OperatorOption[] = [
  { value: "EQUALS",     label: "= (Equals)",          valueKind: "number"  },
  { value: "NOT_EQUALS", label: "≠ (Not equals)",      valueKind: "number"  },
  { value: "GT",         label: "> (Greater than)",    valueKind: "number"  },
  { value: "LT",         label: "< (Less than)",       valueKind: "number"  },
  { value: "GTE",        label: "≥ (Greater or equal)",valueKind: "number"  },
  { value: "LTE",        label: "≤ (Less or equal)",   valueKind: "number"  },
];

const DECIMAL_OPS: OperatorOption[] = NUMBER_OPS.map((o) => ({ ...o, valueKind: "decimal" as const }));

const BOOLEAN_OPS: OperatorOption[] = [
  { value: "IS_TRUE",  label: "Is true",  valueKind: "none" },
  { value: "IS_FALSE", label: "Is false", valueKind: "none" },
];

const DATE_OPS: OperatorOption[] = [
  { value: "IS_TODAY",         label: "Is today",                  valueKind: "none"  },
  { value: "DAYS_AGO",         label: "Is X days ago",             valueKind: "days"  },
  { value: "DAYS_FROM_NOW",    label: "Is X days from now",        valueKind: "days"  },
  { value: "WITHIN_NEXT_DAYS", label: "Within the next X days",    valueKind: "days"  },
  { value: "BEFORE",           label: "Is before",                 valueKind: "date"  },
  { value: "AFTER",            label: "Is after",                  valueKind: "date"  },
];

const TAG_OPS: OperatorOption[] = [
  { value: "HAS_TAG",     label: "Has this tag",            valueKind: "none" },
  { value: "NOT_HAS_TAG", label: "Does not have this tag",  valueKind: "none" },
];

export function operatorsForType(type: TokenDataType | "tag"): OperatorOption[] {
  switch (type) {
    case "text":    return TEXT_OPS;
    case "number":  return NUMBER_OPS;
    case "decimal": return DECIMAL_OPS;
    case "boolean": return BOOLEAN_OPS;
    case "date":    return DATE_OPS;
    case "tag":     return TAG_OPS;
    default:        return TEXT_OPS;
  }
}

export function valueKindForOperator(
  type: TokenDataType | "tag",
  operator: string,
): OperatorOption["valueKind"] {
  const ops = operatorsForType(type);
  return ops.find((o) => o.value === operator)?.valueKind ?? "text";
}

// ── Form ↔ API conversions ────────────────────────────────────────────────────

export function conditionToRow(c: AutomationCondition): ConditionFormRow {
  if (c.type === "TOKEN") {
    return {
      _localId:    localId(),
      subjectType: "TOKEN",
      tokenKey:    c.tokenKey,
      tagId:       null,
      operator:    c.operator,
      value:       c.value ?? "",
    };
  }
  return {
    _localId:    localId(),
    subjectType: "TAG",
    tokenKey:    null,
    tagId:       c.tagId,
    operator:    c.operator,
    value:       "",
  };
}

export function actionToRow(a: AutomationAction): ActionFormRow {
  if (a.type === "SEND_SMS") {
    return { _localId: localId(), type: "SEND_SMS", message: a.message, smsPriority: a.priority };
  }
  if (a.type === "APPLY_TAG") {
    return { _localId: localId(), type: "APPLY_TAG", tagId: a.tagId };
  }
  if (a.type === "REMOVE_TAG") {
    return { _localId: localId(), type: "REMOVE_TAG", tagId: a.tagId };
  }
  return { _localId: localId(), type: "OPT_OUT" };
}

export function ruleToForm(rule: AutomationRule): AutomationFormState {
  const config = rule.triggerConfig as Record<string, unknown>;
  return {
    name:        rule.name,
    triggerType: rule.triggerType,
    keywords:    Array.isArray(config.keywords) ? (config.keywords as string[]) : [],
    tokenKey:    typeof config.tokenKey === "string" ? config.tokenKey : null,
    formId:      typeof config.formId === "string"   ? config.formId   : null,
    conditions:  rule.conditions.map(conditionToRow),
    actions:     rule.actions.map(actionToRow),
    frequency:   rule.frequency,
    isEnabled:   rule.isEnabled,
  };
}

export function formToTriggerConfig(form: AutomationFormState): TriggerConfig {
  if (form.triggerType === "INBOUND_MESSAGE") return { keywords: form.keywords };
  if (form.triggerType === "TOKEN_UPDATED")   return { tokenKey: form.tokenKey! };
  if (form.triggerType === "FORM_SUBMITTED")  return { formId: form.formId };
  return {};
}

export function rowToCondition(row: ConditionFormRow): AutomationCondition | null {
  if (row.subjectType === "TOKEN" && row.tokenKey && row.operator) {
    return { type: "TOKEN", tokenKey: row.tokenKey, operator: row.operator as never, value: row.value };
  }
  if (row.subjectType === "TAG" && row.tagId && row.operator) {
    return { type: "TAG", tagId: row.tagId, operator: row.operator as never };
  }
  return null;
}

export function rowToAction(row: ActionFormRow): AutomationAction | null {
  if (row.type === "SEND_SMS" && row.message?.trim()) {
    return { type: "SEND_SMS", message: row.message.trim(), priority: row.smsPriority ?? 1 };
  }
  if ((row.type === "APPLY_TAG" || row.type === "REMOVE_TAG") && row.tagId) {
    return { type: row.type, tagId: row.tagId };
  }
  if (row.type === "OPT_OUT") {
    return { type: "OPT_OUT" };
  }
  return null;
}

export function formToCreatePayload(
  form: AutomationFormState,
  senderId: string,
  sortOrder = 0,
): CreateAutomationRulePayload {
  return {
    senderId,
    name:          form.name.trim(),
    isEnabled:     form.isEnabled,
    triggerType:   form.triggerType!,
    triggerConfig: formToTriggerConfig(form),
    conditions:    form.conditions.map(rowToCondition).filter(Boolean) as AutomationCondition[],
    frequency:     form.frequency,
    actions:       form.actions.map(rowToAction).filter(Boolean) as AutomationAction[],
    sortOrder,
  };
}

export function formToUpdatePayload(form: AutomationFormState): UpdateAutomationRulePayload {
  return {
    name:          form.name.trim(),
    isEnabled:     form.isEnabled,
    triggerType:   form.triggerType!,
    triggerConfig: formToTriggerConfig(form),
    conditions:    form.conditions.map(rowToCondition).filter(Boolean) as AutomationCondition[],
    frequency:     form.frequency,
    actions:       form.actions.map(rowToAction).filter(Boolean) as AutomationAction[],
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export function validateForm(
  form: AutomationFormState,
  tokenTypeMap: Map<string, TokenDataType>,
): FormErrors {
  const e: FormErrors = {};

  // Name
  if (!form.name.trim())            e.name = "Rule name is required.";
  else if (form.name.trim().length > 100) e.name = "Must be 100 characters or less.";

  // Trigger
  if (!form.triggerType) {
    e.trigger = "Please select a trigger type.";
  } else {
    if (form.triggerType === "INBOUND_MESSAGE" && form.keywords.length === 0) {
      e.keywords = "At least one keyword is required.";
    }
    if (form.triggerType === "TOKEN_UPDATED" && !form.tokenKey) {
      e.tokenKey = "Please select a token.";
    }
    if (form.triggerType === "SCHEDULED" && form.conditions.length === 0) {
      e.conditionsBlock = "Scheduled rules require at least one condition.";
    }
  }

  // Conditions
  form.conditions.forEach((row, i) => {
    if (!row.subjectType) { e[`cond_${i}_subject`] = "Select a subject."; return; }
    if (!row.operator)    { e[`cond_${i}_op`]      = "Select an operator."; return; }
    if (row.subjectType === "TOKEN" && row.tokenKey) {
      const type = tokenTypeMap.get(row.tokenKey) ?? "text";
      const vk   = valueKindForOperator(type, row.operator);
      if (vk !== "none" && !row.value.trim()) {
        e[`cond_${i}_value`] = "Value is required.";
      }
    }
  });

  // Actions
  if (form.actions.length === 0) {
    e.actionsBlock = "At least one action is required.";
  }
  form.actions.forEach((row, i) => {
    if (row.type === "SEND_SMS" && !row.message?.trim()) {
      e[`action_${i}_msg`] = "Message is required.";
    }
    if ((row.type === "APPLY_TAG" || row.type === "REMOVE_TAG") && !row.tagId) {
      e[`action_${i}_tag`] = "Please select a tag.";
    }
  });

  return e;
}

// ── Dirty check ───────────────────────────────────────────────────────────────

export function isFormDirty(
  current: AutomationFormState,
  initial: AutomationFormState,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

// ── Trigger type ──────────────────────────────────────────────────────────────

export const TRIGGER_CARDS: {
  value: TriggerType;
  label: string;
  description: string;
  icon: string; // lucide icon name key used by caller
}[] = [
  {
    value: "INBOUND_MESSAGE",
    label: "Inbound Message",
    description: "When an inbound SMS is received matching your keywords.",
    icon: "message",
  },
  {
    value: "TOKEN_UPDATED",
    label: "Token Updated",
    description: "When a custom token value is created or changed.",
    icon: "refresh",
  },
  {
    value: "SCHEDULED",
    label: "Scheduled",
    description: "Runs once daily at 8:00 AM PH Time based on conditions.",
    icon: "calendar",
  },
  {
    value: "FORM_SUBMITTED",
    label: "Form Submitted",
    description: "When a customer submits one of your Gaby Forms.",
    icon: "clipboard",
  },
];
