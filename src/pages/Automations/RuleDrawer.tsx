import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, MessageSquare, RefreshCw, CalendarDays, Plus,
  ChevronDown, Users, AlertTriangle, Loader2, Info,
} from "lucide-react";
import { KeywordChipInput } from "@/components/common";
import { ToggleSwitch } from "./AutomationAtoms";
import { ConditionRow } from "./ConditionRow";
import { ActionBlock } from "./ActionBlock";
import { automationsService } from "@/services/automations.service";
import { AUTOMATION_FREQUENCY_OPTIONS, defaultFrequencyFor, emptyAutomationForm } from "@/types";
import {
  localId,
  ruleToForm,
  formToCreatePayload,
  formToUpdatePayload,
  validateForm,
  isFormDirty,
  TRIGGER_CARDS,
} from "./drawerUtils";
import type {
  AutomationRule,
  AutomationFormState,
  ConditionFormRow,
  ActionFormRow,
  ActionType,
  TriggerType,
  CreateAutomationRulePayload,
  UpdateAutomationRulePayload,
  AutomationPreviewResult,
} from "@/types";
import type { ApiToken, Tag } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface RuleDrawerProps {
  open: boolean;
  rule: AutomationRule | null;       // null = create mode
  tokens: ApiToken[];
  tags: Tag[];
  senderId: string;
  onClose: () => void;
  onCreate: (payload: CreateAutomationRulePayload) => Promise<AutomationRule>;
  onUpdate: (ruleId: string, payload: UpdateAutomationRulePayload) => Promise<AutomationRule>;
  pushToast: (msg: string, kind?: "success" | "error") => void;
}

// ── Trigger icon map ──────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  message:  MessageSquare,
  refresh:  RefreshCw,
  calendar: CalendarDays,
};

// ── Drawer ────────────────────────────────────────────────────────────────────

export function RuleDrawer({
  open,
  rule,
  tokens,
  tags,
  senderId,
  onClose,
  onCreate,
  onUpdate,
  pushToast,
}: RuleDrawerProps) {
  const isEdit = rule !== null;
  const bodyRef = useRef<HTMLDivElement>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form,    setForm]    = useState<AutomationFormState>(emptyAutomationForm());
  const [initial, setInitial] = useState<AutomationFormState>(emptyAutomationForm());
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Discard confirm (shown when backdrop/X clicked with dirty form) ─────────
  const [showDiscard, setShowDiscard] = useState(false);

  // ── Trigger reset confirm ──────────────────────────────────────────────────
  const [pendingTrigger, setPendingTrigger] = useState<TriggerType | null>(null);

  // ── Add-action dropdown ────────────────────────────────────────────────────
  const [addActionOpen, setAddActionOpen] = useState(false);
  const addActionRef = useRef<HTMLDivElement>(null);

  // ── Preview (edit mode, SCHEDULED/TOKEN_UPDATED only) ──────────────────────
  const [preview, setPreview] = useState<AutomationPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Token type map for validation ─────────────────────────────────────────
  const tokenTypeMap = new Map(
    tokens.map((t) => [t.key, t.type ?? "text"] as const),
  );

  // ── Populate form when drawer opens ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const base = rule ? ruleToForm(rule) : emptyAutomationForm();
    setForm(base);
    setInitial(base);
    setErrors({});
    setFormError(null);
    setShowDiscard(false);
    setPendingTrigger(null);
    setAddActionOpen(false);
    setPreview(null);
  }, [open, rule]);

  // ── Fetch preview (edit mode) ──────────────────────────────────────────────
  const fetchPreview = useCallback(async () => {
    if (!rule?.id) return;
    setPreviewLoading(true);
    try {
      const res = await automationsService.preview(rule.id, senderId);
      setPreview(res);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [rule?.id]);

  useEffect(() => {
    if (
      open &&
      isEdit &&
      form.triggerType &&
      form.triggerType !== "INBOUND_MESSAGE"
    ) {
      fetchPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, form.triggerType]);

  // ── Close add-action dropdown on outside click ─────────────────────────────
  useEffect(() => {
    if (!addActionOpen) return;
    function handleOutside(e: MouseEvent) {
      if (addActionRef.current && !addActionRef.current.contains(e.target as Node)) {
        setAddActionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [addActionOpen]);

  // ── Helpers: update a single form field ───────────────────────────────────
  function patch(partial: Partial<AutomationFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function clearError(key: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // ── Trigger selection ──────────────────────────────────────────────────────
  function handleTriggerSelect(t: TriggerType) {
    if (t === form.triggerType) return;
    // If there are existing conditions (non-empty), confirm reset
    const hasConditions = form.conditions.length > 0;
    if (hasConditions) {
      setPendingTrigger(t);
      return;
    }
    applyTriggerChange(t);
  }

  function applyTriggerChange(t: TriggerType) {
    patch({
      triggerType: t,
      keywords:    [],
      tokenKey:    null,
      conditions:  [],
      frequency:   defaultFrequencyFor(t),
    });
    clearError("trigger");
    clearError("keywords");
    clearError("tokenKey");
    clearError("conditionsBlock");
    setPendingTrigger(null);
  }

  // ── Conditions ─────────────────────────────────────────────────────────────
  function addCondition() {
    if (form.conditions.length >= 5) return;
    const newRow: ConditionFormRow = {
      _localId: localId(), subjectType: null,
      tokenKey: null, tagId: null, operator: null, value: "",
    };
    patch({ conditions: [...form.conditions, newRow] });
    clearError("conditionsBlock");
  }

  function updateCondition(idx: number, updated: ConditionFormRow) {
    const next = form.conditions.map((c, i) => (i === idx ? updated : c));
    patch({ conditions: next });
    // Clear related field errors
    ["subject", "op", "value"].forEach((k) => clearError(`cond_${idx}_${k}`));
  }

  function removeCondition(idx: number) {
    patch({ conditions: form.conditions.filter((_, i) => i !== idx) });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function addAction(type: ActionType) {
    if (form.actions.length >= 4) return;
    const newRow: ActionFormRow = {
      _localId:    localId(),
      type,
      message:     type === "SEND_SMS" ? "" : undefined,
      smsPriority: type === "SEND_SMS" ? 1 : undefined,
      tagId:       (type === "APPLY_TAG" || type === "REMOVE_TAG") ? null : undefined,
    };
    patch({ actions: [...form.actions, newRow] });
    setAddActionOpen(false);
    clearError("actionsBlock");
  }

  function updateAction(idx: number, updated: ActionFormRow) {
    const next = form.actions.map((a, i) => (i === idx ? updated : a));
    patch({ actions: next });
    clearError(`action_${idx}_msg`);
    clearError(`action_${idx}_tag`);
  }

  function removeAction(idx: number) {
    patch({ actions: form.actions.filter((_, i) => i !== idx) });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = validateForm(form, tokenTypeMap);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      setTimeout(() => {
        const el = bodyRef.current?.querySelector("[data-error-field]");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (isEdit && rule) {
        await onUpdate(rule.id, formToUpdatePayload(form));
        pushToast("Rule updated successfully.");
      } else {
        await onCreate(formToCreatePayload(form, senderId, 0));
        pushToast("Automation rule created.");
      }
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save rule. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Close with dirty check ─────────────────────────────────────────────────
  function requestClose() {
    if (isFormDirty(form, initial) && !saving) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  }

  // ── Condition label adapts to trigger ─────────────────────────────────────
  const conditionLabel =
    form.triggerType === "SCHEDULED"
      ? "Conditions (required — at least 1)"
      : "Conditions (optional)";

  // ── Render helpers ─────────────────────────────────────────────────────────
  const inpCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
    }`;

  const showPreviewSection =
    isEdit &&
    form.triggerType &&
    form.triggerType !== "INBOUND_MESSAGE" &&
    form.conditions.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${open ? "" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={!saving ? requestClose : undefined}
      />

      {/* Drawer panel */}
      <div
        className={`relative w-full max-w-2xl bg-white shadow-xl flex flex-col h-full transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Automation Rule" : "Create Automation Rule"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Define what triggers this rule, the conditions, and what actions to take.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 ml-4 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Discard confirm overlay ── */}
        {showDiscard && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-sm w-full space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Discard changes?</h3>
              <p className="text-sm text-gray-500">
                You have unsaved changes. If you leave now, they will be lost.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiscard(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDiscard(false); onClose(); }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Trigger-reset confirm overlay ── */}
        {pendingTrigger && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-sm w-full space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Change trigger type?</h3>
              <p className="text-sm text-gray-500">
                Changing the trigger type will reset your existing conditions. Continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setPendingTrigger(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => applyTriggerChange(pendingTrigger)}
                  className="px-4 py-2 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ─── a. Rule Name ─────────────────────────────────────────────── */}
          <div data-error-field="name">
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
              Rule Name <span className="text-[#FF692E]">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={form.name}
              maxLength={105}
              onChange={(e) => { patch({ name: e.target.value }); clearError("name"); }}
              placeholder="e.g. VIP Threshold"
              className={inpCls("name")}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.name ? (
                <p className="text-xs text-red-600">{errors.name}</p>
              ) : (
                <span />
              )}
              {form.name.length > 80 && (
                <span className="text-xs text-gray-400">{form.name.length}/100</span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ─── b. Trigger ───────────────────────────────────────────────── */}
          <div data-error-field="trigger">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Trigger <span className="text-[#FF692E]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {TRIGGER_CARDS.map((card) => {
                const Icon    = TRIGGER_ICONS[card.icon];
                const active  = form.triggerType === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => { handleTriggerSelect(card.value); clearError("trigger"); }}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      active
                        ? "border-[#FF692E] bg-[#FFF4EF]"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mb-2 ${
                        active ? "text-[#FF692E]" : "text-gray-400"
                      }`}
                    />
                    <div className={`text-sm font-semibold ${active ? "text-[#FF692E]" : "text-gray-800"}`}>
                      {card.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                      {card.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.trigger && (
              <p className="text-xs text-red-600 mt-1.5">{errors.trigger}</p>
            )}

            {/* Trigger-specific config */}
            {form.triggerType === "INBOUND_MESSAGE" && (
              <div className="mt-3" data-error-field="keywords">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Keywords <span className="text-[#FF692E]">*</span>
                </label>
                <KeywordChipInput
                  keywords={form.keywords}
                  hasError={!!errors.keywords}
                  onChange={(kws) => { patch({ keywords: kws }); clearError("keywords"); }}
                />
                {errors.keywords ? (
                  <p className="text-xs text-red-600 mt-1">{errors.keywords}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    Matches incoming messages containing any of these keywords
                    (case-insensitive). Press{" "}
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd>{" "}
                    or{" "}
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">,</kbd>{" "}
                    to add.
                  </p>
                )}
              </div>
            )}

            {form.triggerType === "TOKEN_UPDATED" && (
              <div className="mt-3" data-error-field="tokenKey">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Token <span className="text-[#FF692E]">*</span>
                </label>
                <select
                  value={form.tokenKey ?? ""}
                  onChange={(e) => { patch({ tokenKey: e.target.value || null }); clearError("tokenKey"); }}
                  className={inpCls("tokenKey")}
                >
                  <option value="">Select a token…</option>
                  {tokens.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} — {`{{${t.key}}}`}
                    </option>
                  ))}
                </select>
                {errors.tokenKey && (
                  <p className="text-xs text-red-600 mt-1">{errors.tokenKey}</p>
                )}
              </div>
            )}

            {form.triggerType === "SCHEDULED" && (
              <div className="mt-3 flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                <div>
                  <span className="font-semibold">Daily at 8:00 AM PH Time (UTC+8).</span>{" "}
                  This rule runs once a day for every contact that matches your
                  conditions below. At least one condition is required.
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ─── c. Conditions ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                {conditionLabel}
              </label>
              {form.conditions.length < 5 && (
                <button
                  type="button"
                  onClick={addCondition}
                  className="text-xs font-medium text-[#FF692E] hover:text-[#e55a24] flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add condition
                </button>
              )}
            </div>

            {errors.conditionsBlock && (
              <p className="text-xs text-red-600 mb-2" data-error-field="conditionsBlock">
                {errors.conditionsBlock}
              </p>
            )}

            {form.conditions.length === 0 ? (
              <p className="text-xs text-gray-400">
                {form.triggerType === "SCHEDULED"
                  ? "Add a condition above to define which contacts this rule targets."
                  : "No conditions — this rule applies to all contacts."}
              </p>
            ) : (
              <div className="space-y-2">
                {form.conditions.map((row, i) => (
                  <div key={row._localId}>
                    {i > 0 && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                          AND
                        </span>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>
                    )}
                    <ConditionRow
                      row={row}
                      tokens={tokens}
                      tags={tags}
                      index={i}
                      onChange={(updated) => updateCondition(i, updated)}
                      onRemove={() => removeCondition(i)}
                      errors={{
                        subject: errors[`cond_${i}_subject`],
                        op:      errors[`cond_${i}_op`],
                        value:   errors[`cond_${i}_value`],
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ─── d. Actions ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                Actions <span className="text-[#FF692E]">*</span>
              </label>
              {form.actions.length < 4 && (
                <div className="relative" ref={addActionRef}>
                  <button
                    type="button"
                    onClick={() => setAddActionOpen((p) => !p)}
                    className="text-xs font-medium text-[#FF692E] hover:text-[#e55a24] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add action
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {addActionOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      {(
                        ["SEND_SMS", "APPLY_TAG", "REMOVE_TAG", "OPT_OUT"] as ActionType[]
                      ).map((type) => {
                        const labels: Record<ActionType, string> = {
                          SEND_SMS:   "Send SMS",
                          APPLY_TAG:  "Apply Tag",
                          REMOVE_TAG: "Remove Tag",
                          OPT_OUT:    "Mark as Opted Out",
                        };
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => addAction(type)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                          >
                            {labels[type]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.actionsBlock && (
              <p className="text-xs text-red-600 mb-2" data-error-field="actionsBlock">
                {errors.actionsBlock}
              </p>
            )}

            {form.actions.length === 0 ? (
              <p className="text-xs text-gray-400">
                Click "Add action" above to define what happens when this rule triggers.
              </p>
            ) : (
              <div className="space-y-3">
                {form.actions.map((row, i) => (
                  <ActionBlock
                    key={row._localId}
                    row={row}
                    index={i + 1}
                    tokens={tokens}
                    tags={tags}
                    onChange={(updated) => updateAction(i, updated)}
                    onRemove={() => removeAction(i)}
                    errors={{
                      msg: errors[`action_${i}_msg`],
                      tag: errors[`action_${i}_tag`],
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ─── e. Frequency ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
              Frequency
            </label>
            <select
              value={form.frequency}
              onChange={(e) =>
                patch({ frequency: e.target.value as typeof form.frequency })
              }
              className={inpCls("frequency") + " bg-white"}
            >
              {AUTOMATION_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {form.triggerType === "TOKEN_UPDATED" && opt.value === "ONCE_PER_CONTACT"
                    ? " (Recommended)"
                    : ""}
                </option>
              ))}
            </select>
            {AUTOMATION_FREQUENCY_OPTIONS.find((o) => o.value === form.frequency)?.description && (
              <p className="text-xs text-gray-400 mt-1">
                {AUTOMATION_FREQUENCY_OPTIONS.find((o) => o.value === form.frequency)!.description}
              </p>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ─── f. Status ────────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Status
            </label>
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={form.isEnabled}
                onChange={(v) => patch({ isEnabled: v })}
              />
              <span className="text-sm text-gray-700">
                {form.isEnabled ? (
                  <span className="text-green-700 font-medium">Enabled</span>
                ) : (
                  <span className="text-gray-500">Disabled</span>
                )}
                <span className="text-gray-400 ml-1.5">
                  — {form.isEnabled
                    ? "rule is active and will trigger when conditions are met"
                    : "rule is saved but will not trigger"}
                </span>
              </span>
            </div>
          </div>

          {/* ─── g. Preview ───────────────────────────────────────────────── */}
          {showPreviewSection && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    Preview
                  </label>
                  <button
                    type="button"
                    onClick={fetchPreview}
                    className="text-xs text-[#FF692E] hover:text-[#e55a24] font-medium transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {previewLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking contacts…
                  </div>
                ) : preview ? (
                  <div
                    className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${
                      preview.matched === 0
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : preview.matched > 100
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-green-50 border-green-200 text-green-800"
                    }`}
                  >
                    <Users className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <span>
                        Matches{" "}
                        <strong>
                          {preview.matched.toLocaleString()}
                        </strong>{" "}
                        of {preview.total.toLocaleString()} contacts
                      </span>
                      {preview.matched === 0 && (
                        <p className="text-xs mt-0.5 text-amber-700">
                          No contacts match these conditions. Check your condition values.
                        </p>
                      )}
                      {preview.matched > 100 && (
                        <p className="text-xs mt-0.5 text-amber-700">
                          Large audience — ensure this rule should fire for all these contacts.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Preview is based on the last saved version of this rule.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Form-level error */}
          {formError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving
              ? isEdit ? "Saving…" : "Creating…"
              : isEdit ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
