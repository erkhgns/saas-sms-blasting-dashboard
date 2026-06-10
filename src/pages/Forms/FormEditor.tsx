import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, X, Plus, Loader2, AlertTriangle, CheckCircle2, Lock,
  Link, Power,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import { useTags } from "@/hooks/useTags";
import { formsService } from "@/services/forms.service";
import { formPublicUrl, formDisplayUrl } from "@/utils/form-url";
import {
  emptyFormBuilder,
  FIELD_TYPE_LABELS,
  type GabyForm,
  type FormBuilderState,
  type FormFieldConfig,
  type FormFieldType,
  type CreateFormPayload,
  type UpdateFormPayload,
  type TokenDataType,
} from "@/types";
import { PreviewDevice } from "./PreviewDevice";

// ── Props ─────────────────────────────────────────────────────────────────────

interface FormEditorProps {
  form: GabyForm | null;
  onBack: () => void;
  onSuccess: (msg: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9-]+$/;

/** Default fieldType for a given token data type. */
function getDefaultFieldType(tokenType?: TokenDataType): FormFieldType {
  if (tokenType === "boolean") return "yes_no";
  if (tokenType === "date")    return "date_picker";
  return "text_input"; // text, number, decimal
}

/** Allowed fieldType options for a token type (empty = auto / read-only). */
function fieldTypeOptions(
  tokenType?: TokenDataType,
): { value: FormFieldType; label: string }[] {
  if (tokenType === "text") {
    return [
      { value: "text_input",      label: "Text Input"      },
      { value: "multiple_choice", label: "Multiple Choice" },
      { value: "dropdown",        label: "Dropdown"        },
    ];
  }
  if (tokenType === "number") {
    return [
      { value: "text_input",  label: "Text Input"  },
      { value: "star_rating", label: "Star Rating" },
    ];
  }
  // decimal, boolean, date — single fixed value; user cannot change it
  return [];
}

function mapFormToState(form: GabyForm): FormBuilderState {
  return {
    name:            form.name,
    slug:            form.slug ?? "",
    headerMessage:   form.headerMessage ?? "",
    thankYouMessage: form.thankYouMessage,
    status:          form.status,
    fields: {
      birthday: { visible: form.fields.birthday.visible, required: form.fields.birthday.required },
      address:  { visible: form.fields.address.visible,  required: form.fields.address.required  },
    },
    tokenFields: form.tokenFields.map((tf) => ({
      tokenKey:  tf.tokenKey,
      fieldType: tf.fieldType,
      choices:   [...tf.choices],
      required:  tf.required,
    })),
    defaultTagIds: [...form.defaultTagIds],
  };
}

const baseCls =
  "w-full px-3.5 py-2.5 border rounded-lg text-sm outline-none transition-colors bg-white";

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon, title, desc, children,
}: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 text-[#FF692E]">
          {icon}
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          {desc && <p className="text-[13px] text-gray-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  children, required, optional,
}: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
    </label>
  );
}

// ── Standard field toggle row (birthday / address) ────────────────────────────

function FieldToggleRow({
  icon, label, sub, locked, show, required, onShow, onRequired,
}: {
  icon: React.ReactNode; label: string; sub?: string; locked?: boolean;
  show?: boolean; required?: boolean;
  onShow?: (v: boolean) => void; onRequired?: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        show || locked ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/60"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          show || locked ? "bg-orange-50 text-[#FF692E]" : "bg-gray-100 text-gray-400"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
          {label}
          {locked && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
              <Lock className="w-2.5 h-2.5" /> Always on
            </span>
          )}
        </div>
        {sub && <div className="text-[12px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
      {locked ? (
        <span className="text-[12px] text-gray-400 pr-1">Always shown</span>
      ) : (
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-[12px] font-medium ${show && required ? "text-gray-700" : "text-gray-300"}`}>
              Required
            </span>
            <button
              type="button" role="switch" aria-checked={show && required}
              disabled={!show}
              onClick={() => onRequired?.(!required)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                show && required ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${show && required ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-medium ${show ? "text-gray-700" : "text-gray-400"}`}>Show</span>
            <button
              type="button" role="switch" aria-checked={show}
              onClick={() => onShow?.(!show)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                show ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${show ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Token field config row (expanded) ─────────────────────────────────────────

function TokenFieldConfigRow({
  label, tokenKey, tokenType, included, required, deleted,
  fieldType, choices, choicesError,
  onInclude, onRequired, onFieldType, onChoices,
}: {
  label: string;
  tokenKey: string;
  tokenType: TokenDataType | undefined;
  included: boolean;
  required: boolean;
  deleted?: boolean;
  fieldType: FormFieldType;
  choices: string[];
  choicesError?: string;
  onInclude: (v: boolean) => void;
  onRequired: (v: boolean) => void;
  onFieldType: (ft: FormFieldType) => void;
  onChoices: (c: string[]) => void;
}) {
  const options     = fieldTypeOptions(tokenType);
  const hasSelector = options.length > 1;
  const showChoices = included && !deleted &&
    (fieldType === "multiple_choice" || fieldType === "dropdown");

  function addChoice() {
    if (choices.length >= 20) return;
    onChoices([...choices, ""]);
  }
  function removeChoice(i: number) {
    if (choices.length <= 2) return;
    onChoices(choices.filter((_, idx) => idx !== i));
  }
  function updateChoice(i: number, v: string) {
    onChoices(choices.map((c, idx) => (idx === i ? v : c)));
  }

  return (
    <div
      className={`rounded-lg border transition-colors ${
        included ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/60"
      } ${deleted ? "opacity-60" : ""}`}
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {label}
            {deleted && (
              <span className="ml-2 text-[11px] text-amber-600 font-normal">
                Token no longer exists
              </span>
            )}
          </div>
          <div className="text-[12px] text-gray-400 font-mono">
            {`{{${tokenKey}}}`} · {tokenType ?? "unknown"}
          </div>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-[12px] font-medium ${included && required ? "text-gray-700" : "text-gray-300"}`}>
              Required
            </span>
            <button
              type="button" role="switch" aria-checked={included && required}
              disabled={!included || deleted}
              onClick={() => onRequired(!required)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                included && required ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${included && required ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </label>
          {/* Add toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-medium ${included ? "text-gray-700" : "text-gray-400"}`}>Add</span>
            <button
              type="button" role="switch" aria-checked={included}
              disabled={deleted}
              onClick={() => onInclude(!included)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                included ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${included ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded config (only when included) ── */}
      {included && !deleted && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/40">

          {/* Field type selector / read-only badge */}
          <div className="flex items-start gap-3">
            <span className="text-[12px] text-gray-500 font-medium w-24 shrink-0 mt-1.5">Field type</span>
            {hasSelector ? (
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFieldType(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                      fieldType === opt.value
                        ? "border-[#FF692E] bg-orange-50 text-[#FF692E]"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-gray-400 italic mt-1.5">
                {FIELD_TYPE_LABELS[fieldType] ?? fieldType} (auto)
              </span>
            )}
          </div>

          {/* Choices builder (multiple_choice / dropdown only) */}
          {showChoices && (
            <div className="flex items-start gap-3">
              <span className="text-[12px] text-gray-500 font-medium w-24 shrink-0 mt-1">Choices</span>
              <div className="flex-1">
                <div className="space-y-1.5">
                  {choices.map((choice, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={choice}
                        maxLength={100}
                        placeholder={`Choice ${i + 1}`}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#FF692E] transition-colors bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeChoice(i)}
                        disabled={choices.length <= 2}
                        title="Remove choice"
                        className="p-1 text-gray-300 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addChoice}
                  disabled={choices.length >= 20}
                  className="mt-2 flex items-center gap-1.5 text-[12px] text-[#FF692E] font-medium hover:text-[#e55a24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add choice
                  {choices.length >= 20 && <span className="text-gray-400 font-normal">(max 20)</span>}
                </button>
                {choicesError && (
                  <p className="text-[12px] text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {choicesError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
        copied
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Link className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── FormEditor ────────────────────────────────────────────────────────────────

export function FormEditor({ form: existingForm, onBack, onSuccess }: FormEditorProps) {
  const isEdit = existingForm !== null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const { tokens } = useTokens();
  const { tags }   = useTags();

  const [state,   setState]   = useState<FormBuilderState>(emptyFormBuilder());
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Slug availability
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSlug = existingForm?.slug ?? "";

  // ── Populate on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const base = existingForm ? mapFormToState(existingForm) : emptyFormBuilder();
    setState(base);
    setErrors({});
    setFormErr(null);
    setSlugStatus("idle");
  }, [existingForm]);

  // ── Slug check (debounced 600ms) ─────────────────────────────────────────
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || !SLUG_RE.test(slug) || slug === savedSlug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    try {
      const excludeId = isEdit && existingForm ? existingForm.id : undefined;
      const res = await formsService.checkSlugAvailability(slug, excludeId);
      setSlugStatus(res.available ? "available" : "taken");
    } catch {
      setSlugStatus("idle");
    }
  }, [savedSlug, isEdit, existingForm]);

  function handleSlugChange(raw: string) {
    const slug = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setState((s) => ({ ...s, slug }));
    setErrors((e) => ({ ...e, slug: "" }));
    setSlugStatus("idle");
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    if (slug && slug !== savedSlug) {
      slugTimerRef.current = setTimeout(() => checkSlug(slug), 600);
    }
  }

  // ── Patch helpers ────────────────────────────────────────────────────────
  function patch(partial: Partial<FormBuilderState>) {
    setState((s) => ({ ...s, ...partial }));
  }
  function setField(key: "birthday" | "address", p: Partial<FormFieldConfig>) {
    setState((s) => ({
      ...s,
      fields: { ...s.fields, [key]: { ...s.fields[key], ...p } },
    }));
  }

  // ── Token helpers ────────────────────────────────────────────────────────
  function toggleToken(tokenKey: string, on: boolean) {
    setState((s) => {
      if (!on) {
        return { ...s, tokenFields: s.tokenFields.filter((t) => t.tokenKey !== tokenKey) };
      }
      const token = tokens.find((t) => t.key === tokenKey);
      const defaultFT = getDefaultFieldType(token?.type as TokenDataType | undefined);
      return {
        ...s,
        tokenFields: [
          ...s.tokenFields,
          { tokenKey, fieldType: defaultFT, choices: [], required: false },
        ],
      };
    });
  }
  function setTokenRequired(tokenKey: string, required: boolean) {
    setState((s) => ({
      ...s,
      tokenFields: s.tokenFields.map((t) =>
        t.tokenKey === tokenKey ? { ...t, required } : t,
      ),
    }));
  }
  function setTokenFieldType(tokenKey: string, fieldType: FormFieldType) {
    setState((s) => ({
      ...s,
      tokenFields: s.tokenFields.map((t) =>
        t.tokenKey === tokenKey ? { ...t, fieldType } : t,
      ),
    }));
  }
  function setTokenChoices(tokenKey: string, choices: string[]) {
    setState((s) => ({
      ...s,
      tokenFields: s.tokenFields.map((t) =>
        t.tokenKey === tokenKey ? { ...t, choices } : t,
      ),
    }));
  }

  // ── Tag helper ───────────────────────────────────────────────────────────
  function toggleTag(id: string) {
    setState((s) => ({
      ...s,
      defaultTagIds: s.defaultTagIds.includes(id)
        ? s.defaultTagIds.filter((x) => x !== id)
        : [...s.defaultTagIds, id],
    }));
    setErrors((e) => ({ ...e, tags: "" }));
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!state.name.trim()) e.name = "Form name is required.";
    if (state.slug && !SLUG_RE.test(state.slug)) e.slug = "Use lowercase letters, numbers, and hyphens only.";
    if (slugStatus === "taken")    e.slug = "This URL is already in use. Try another.";
    if (slugStatus === "checking") e.slug = "Please wait for the slug check to finish.";
    if (state.defaultTagIds.length === 0) e.tags = "Select at least one default tag.";

    // Choices validation for multiple_choice / dropdown fields
    state.tokenFields.forEach((tf) => {
      if (tf.fieldType === "multiple_choice" || tf.fieldType === "dropdown") {
        if (tf.choices.length < 2) {
          e[`choices_${tf.tokenKey}`] = "Add at least 2 choices.";
        } else if (tf.choices.some((c) => !c.trim())) {
          e[`choices_${tf.tokenKey}`] = "All choices must have a label.";
        }
      }
    });
    return e;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    setFormErr(null);
    try {
      const enrichedTokenFields = state.tokenFields
        .map((tf) => {
          const token = tokens.find((t) => t.key === tf.tokenKey);
          if (!token) return null;
          // Only send choices for types that use them
          const choices =
            tf.fieldType === "multiple_choice" || tf.fieldType === "dropdown"
              ? tf.choices.map((c) => c.trim()).filter(Boolean)
              : [];
          return {
            tokenKey:  tf.tokenKey,
            label:     token.label,
            type:      (token.type ?? "text") as TokenDataType,
            fieldType: tf.fieldType,
            choices,
            required:  tf.required,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (isEdit && existingForm) {
        const payload: UpdateFormPayload = {
          name:            state.name.trim(),
          slug:            state.slug.trim() || null,
          headerMessage:   state.headerMessage.trim() || null,
          thankYouMessage: state.thankYouMessage.trim() || undefined,
          status:          state.status,
          fields:          state.fields,
          tokenFields:     enrichedTokenFields,
          defaultTagIds:   state.defaultTagIds,
        };
        await formsService.updateForm(existingForm.id, payload);
        onSuccess("Form updated.");
      } else {
        const payload: CreateFormPayload = {
          name:            state.name.trim(),
          slug:            state.slug.trim() || undefined,
          headerMessage:   state.headerMessage.trim() || undefined,
          thankYouMessage: state.thankYouMessage.trim() || undefined,
          status:          state.status,
          fields:          state.fields,
          tokenFields:     enrichedTokenFields,
          defaultTagIds:   state.defaultTagIds,
        };
        await formsService.createForm(payload);
        onSuccess("Form created.");
      }
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Failed to save form.");
      setSaving(false);
    }
  }

  const activeTokenKeys = new Set(tokens.map((t) => t.key));
  const staleTokenKeys  = state.tokenFields
    .map((tf) => tf.tokenKey)
    .filter((k) => !activeTokenKeys.has(k));

  const inputCls = (field: string) =>
    `${baseCls} ${errors[field] ? "border-red-400" : "border-gray-300"}`;

  const shortCodeDisplay = existingForm?.shortCode;
  const slugDisplay      = state.slug.trim() || null;

  return (
    <div className="h-full flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-8 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {isEdit ? state.name || "Edit form" : "Create form"}
            </h1>
            <p className="text-[12px] text-gray-400">
              {isEdit ? "Editing an existing form" : "Set up a new registration form"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create form"
            )}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Config column */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-7">
          <div className="max-w-2xl space-y-5">

            {/* Save error banner */}
            {formErr && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formErr}
                <button
                  type="button"
                  onClick={() => setFormErr(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Identity ──────────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
              title="Form identity"
              desc="Name it, set the message customers see, and pick its link."
            >
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <FieldLabel required>Form name</FieldLabel>
                  <input
                    type="text" value={state.name} maxLength={100} autoFocus
                    onChange={(e) => { patch({ name: e.target.value }); setErrors((er) => ({ ...er, name: "" })); }}
                    placeholder="e.g. Barbershop Walk-in Form"
                    className={inputCls("name")}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = errors.name ? "#f87171" : "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <p className="text-[12px] text-gray-400 mt-1">Internal label — only you see this in the dashboard.</p>
                  {errors.name && <p className="text-[12px] text-red-600 mt-1">{errors.name}</p>}
                </div>

                {/* Header message */}
                <div>
                  <FieldLabel optional>Header message</FieldLabel>
                  <textarea
                    rows={2}
                    value={state.headerMessage} maxLength={150}
                    onChange={(e) => patch({ headerMessage: e.target.value })}
                    placeholder="e.g. Scan to get ₱50 off your next haircut!"
                    className={`${baseCls} border-gray-300 resize-none`}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-[12px] text-gray-400">Shown at the top of the public form.</p>
                    <span className={`text-[12px] ${state.headerMessage.length > 130 ? "text-orange-600" : "text-gray-400"}`}>
                      {state.headerMessage.length}/150
                    </span>
                  </div>
                </div>

                {/* Custom URL slug */}
                <div>
                  <FieldLabel optional>Custom URL slug</FieldLabel>
                  <div
                    className={`flex items-stretch rounded-lg border overflow-hidden ${
                      errors.slug ? "border-red-400" : "border-gray-300"
                    }`}
                  >
                    <span className="px-3 flex items-center bg-gray-50 text-[13px] text-gray-400 font-mono border-r border-gray-200 whitespace-nowrap">
                      gabysms.com/f/
                    </span>
                    <input
                      type="text"
                      value={state.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="juan-barbershop"
                      className="flex-1 px-3 py-2.5 text-sm font-mono outline-none"
                    />
                    {slugStatus === "checking" && (
                      <span className="px-3 flex items-center">
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      </span>
                    )}
                    {slugStatus === "available" && (
                      <span className="px-3 flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </span>
                    )}
                    {slugStatus === "taken" && (
                      <span className="px-3 flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </span>
                    )}
                  </div>
                  {errors.slug ? (
                    <p className="text-[12px] text-red-600 mt-1">{errors.slug}</p>
                  ) : slugStatus === "available" ? (
                    <p className="text-[12px] text-green-600 mt-1">This slug is available.</p>
                  ) : (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Optional vanity link. Leave blank to use the auto short code
                      {existingForm?.shortCode && (
                        <span className="font-mono text-gray-500 ml-1">{existingForm.shortCode}</span>
                      )}.
                    </p>
                  )}
                </div>

                {/* Thank-you message */}
                <div>
                  <FieldLabel optional>Thank-you message</FieldLabel>
                  <textarea
                    rows={2}
                    value={state.thankYouMessage}
                    onChange={(e) => patch({ thankYouMessage: e.target.value })}
                    placeholder="Thank you for registering! We'll be in touch."
                    className={`${baseCls} border-gray-300 resize-none`}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <p className="text-[12px] text-gray-400 mt-1">
                    Shown after a successful submission.
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Form Fields ───────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>}
              title="Form fields"
              desc="Choose what to collect. Name, mobile, and consent are always required."
            >
              <div className="space-y-2.5">
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>}
                  label="Name" locked
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                  label="Mobile number" sub="Validated as a Philippine mobile number" locked
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s1-1 4-1 4 2 8 2 4-1 4-1M2 21h20M7 8v3M12 8v3M17 8v3" /></svg>}
                  label="Birthday"
                  show={state.fields.birthday.visible}
                  required={state.fields.birthday.required}
                  onShow={(v) => setField("birthday", { visible: v, required: v ? state.fields.birthday.required : false })}
                  onRequired={(v) => setField("birthday", { required: v })}
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>}
                  label="Address"
                  show={state.fields.address.visible}
                  required={state.fields.address.required}
                  onShow={(v) => setField("address", { visible: v, required: v ? state.fields.address.required : false })}
                  onRequired={(v) => setField("address", { required: v })}
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" /></svg>}
                  label="Consent checkbox" sub="SMS opt-in agreement — legally required" locked
                />
              </div>
            </Section>

            {/* ── Custom Fields ──────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" /></svg>}
              title="Custom fields"
              desc="Collect extra data using tokens defined in Settings. Choose how each field is presented."
            >
              {tokens.length === 0 ? (
                <div className="px-4 py-4 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-gray-500">
                  No custom tokens defined yet. Add tokens in Settings → Tokens to include them here.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active tokens */}
                  {tokens.map((token) => {
                    const tf = state.tokenFields.find((t) => t.tokenKey === token.key);
                    const included = !!tf;
                    return (
                      <TokenFieldConfigRow
                        key={token.key}
                        tokenKey={token.key}
                        label={token.label}
                        tokenType={token.type as TokenDataType | undefined}
                        included={included}
                        required={tf?.required ?? false}
                        fieldType={tf?.fieldType ?? getDefaultFieldType(token.type as TokenDataType | undefined)}
                        choices={tf?.choices ?? []}
                        choicesError={errors[`choices_${token.key}`]}
                        onInclude={(v) => toggleToken(token.key, v)}
                        onRequired={(v) => setTokenRequired(token.key, v)}
                        onFieldType={(ft) => setTokenFieldType(token.key, ft)}
                        onChoices={(c) => setTokenChoices(token.key, c)}
                      />
                    );
                  })}
                  {/* Stale tokens (deleted from Settings) */}
                  {staleTokenKeys.map((key) => {
                    const tf = state.tokenFields.find((t) => t.tokenKey === key)!;
                    return (
                      <TokenFieldConfigRow
                        key={key}
                        tokenKey={key}
                        label={key}
                        tokenType={undefined}
                        included
                        required={false}
                        fieldType={tf?.fieldType ?? "text_input"}
                        choices={tf?.choices ?? []}
                        deleted
                        onInclude={() => toggleToken(key, false)}
                        onRequired={() => {}}
                        onFieldType={() => {}}
                        onChoices={() => {}}
                      />
                    );
                  })}
                </div>
              )}
            </Section>

            {/* ── Default Tags ───────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" /></svg>}
              title="Default tags"
              desc="Applied to every contact who submits — pick at least one."
            >
              {tags.length === 0 ? (
                <div className="px-4 py-4 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-gray-500">
                  No tags defined yet. Create tags in Settings → Tags first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => {
                    const on = state.defaultTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                        style={
                          on
                            ? { borderColor: t.color ?? "#FF692E", backgroundColor: (t.color ?? "#FF692E") + "12", color: t.color ?? "#FF692E" }
                            : { borderColor: "#e5e7eb", color: "#6b7280", backgroundColor: "#fff" }
                        }
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color ?? "#9ca3af" }} />
                        {t.name}
                        {on && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.tags && (
                <p className="text-[12px] text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errors.tags}
                </p>
              )}
            </Section>

            {/* ── Share ─────────────────────────────────────────────── */}
            <Section
              icon={<Link className="w-4 h-4" />}
              title="Share"
              desc="Both links stay live at the same time. The short code never changes."
            >
              <div className="space-y-3">
                {shortCodeDisplay ? (
                  <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/60 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Short</span>
                      <code className="text-[13px] text-gray-600 font-mono">{formDisplayUrl(shortCodeDisplay)}</code>
                    </div>
                    <CopyBtn url={formPublicUrl(shortCodeDisplay)} />
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-lg border border-dashed border-gray-200 text-[13px] text-gray-400">
                    Short link will be generated after you create the form.
                  </div>
                )}
                {slugDisplay ? (
                  <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/60 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Slug</span>
                      <code className="text-[13px] text-gray-600 font-mono">{formDisplayUrl(slugDisplay)}</code>
                    </div>
                    <CopyBtn url={formPublicUrl(slugDisplay)} />
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-lg border border-dashed border-gray-200 text-[13px] text-gray-400">
                    Add a custom slug above to enable a second, friendlier link.
                  </div>
                )}
              </div>
            </Section>

            {/* ── Status ────────────────────────────────────────────── */}
            <Section
              icon={<Power className="w-4 h-4" />}
              title="Status"
              desc="Inactive forms show a friendly closed message — the QR keeps working."
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.status === "active"}
                  onClick={() => patch({ status: state.status === "active" ? "inactive" : "active" })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    state.status === "active" ? "bg-[#FF692E]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      state.status === "active" ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm">
                  {state.status === "active" ? (
                    <><span className="text-green-700 font-medium">Active</span><span className="text-gray-400"> — accepting submissions</span></>
                  ) : (
                    <><span className="text-gray-500 font-medium">Inactive</span><span className="text-gray-400"> — visitors see a closed message</span></>
                  )}
                </span>
              </div>
            </Section>

            <div className="h-4" />
          </div>
        </div>

        {/* Preview column (desktop only) */}
        <div className="hidden lg:flex w-[400px] shrink-0 border-l border-gray-200 bg-gray-100/60 overflow-y-auto">
          <div className="w-full py-8 px-6 flex justify-center">
            <PreviewDevice
              state={state}
              tokens={tokens}
              shortCode={existingForm?.shortCode}
              slug={slugDisplay ?? undefined}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
