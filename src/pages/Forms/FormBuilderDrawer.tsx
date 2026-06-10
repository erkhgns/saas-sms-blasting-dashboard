import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, ChevronLeft, Loader2, AlertTriangle, CheckCircle2,
  Lock,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import { useTags } from "@/hooks/useTags";
import { formsService } from "@/services/forms.service";
import {
  emptyFormBuilder,
  type GabyForm,
  type FormBuilderState,
  type FormFieldConfig,
  type CreateFormPayload,
  type UpdateFormPayload,
  type TokenDataType,
} from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface FormBuilderDrawerProps {
  open: boolean;
  form: GabyForm | null;       // null = create mode
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9-]+$/;

function mapFormToState(form: GabyForm): FormBuilderState {
  return {
    name:           form.name,
    slug:           form.slug ?? "",
    headerMessage:  form.headerMessage ?? "",
    thankYouMessage: form.thankYouMessage,
    status:         form.status,
    fields: {
      birthday: { visible: form.fields.birthday.visible, required: form.fields.birthday.required },
      address:  { visible: form.fields.address.visible,  required: form.fields.address.required },
    },
    tokenFields: form.tokenFields.map((tf) => ({ tokenKey: tf.tokenKey, required: tf.required })),
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

// ── Field label ───────────────────────────────────────────────────────────────

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

// ── Field toggle row ──────────────────────────────────────────────────────────

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
          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={`text-[12px] font-medium ${show && required ? "text-gray-700" : "text-gray-300"}`}>
              Required
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={show && required}
              disabled={!show}
              onClick={() => onRequired?.(!required)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                show && required ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  show && required ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
          {/* Show toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-medium ${show ? "text-gray-700" : "text-gray-400"}`}>
              Show
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={show}
              onClick={() => onShow?.(!show)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                show ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  show ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Token include row ─────────────────────────────────────────────────────────

function TokenToggleRow({
  label, tokenKey, typeBadge, included, required, deleted,
  onInclude, onRequired,
}: {
  label: string; tokenKey: string; typeBadge: string;
  included: boolean; required: boolean; deleted?: boolean;
  onInclude: (v: boolean) => void; onRequired: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        included ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/60"
      } ${deleted ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">
          {label}
          {deleted && (
            <span className="ml-2 text-[11px] text-amber-600 font-normal">
              This token no longer exists
            </span>
          )}
        </div>
        <div className="text-[12px] text-gray-400 font-mono">{`{{${tokenKey}}}`} · {typeBadge}</div>
      </div>
      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className={`text-[12px] font-medium ${included && required ? "text-gray-700" : "text-gray-300"}`}>
            Required
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={included && required}
            disabled={!included || deleted}
            onClick={() => onRequired(!required)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
              included && required ? "bg-[#FF692E]" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                included && required ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-medium ${included ? "text-gray-700" : "text-gray-400"}`}>Add</span>
          <button
            type="button"
            role="switch"
            aria-checked={included}
            disabled={deleted}
            onClick={() => onInclude(!included)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
              included ? "bg-[#FF692E]" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                included ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export function FormBuilderDrawer({ open, form: existingForm, onClose, onSuccess }: FormBuilderDrawerProps) {
  const isEdit = existingForm !== null;
  const bodyRef = useRef<HTMLDivElement>(null);

  const { tokens } = useTokens();
  const { tags }   = useTags();

  // ── State ──────────────────────────────────────────────────────────────────
  const [state,    setState]    = useState<FormBuilderState>(emptyFormBuilder());
  const [initial,  setInitial]  = useState<FormBuilderState>(emptyFormBuilder());
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);

  // Slug availability
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSlug    = existingForm?.slug ?? "";

  // ── Populate on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const base = existingForm ? mapFormToState(existingForm) : emptyFormBuilder();
    setState(base);
    setInitial(base);
    setErrors({});
    setFormErr(null);
    setShowDiscard(false);
    setSlugStatus("idle");
  }, [open, existingForm]);

  // ── Slug check (debounced) ─────────────────────────────────────────────────
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || !SLUG_RE.test(slug) || slug === savedSlug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    try {
      // In edit mode, pass the form's own ID so the server doesn't flag the
      // form's current slug as taken when the user hasn't changed it.
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

  // ── Patch helpers ──────────────────────────────────────────────────────────
  function patch(partial: Partial<FormBuilderState>) {
    setState((s) => ({ ...s, ...partial }));
  }
  function setField(key: "birthday" | "address", p: Partial<FormFieldConfig>) {
    setState((s) => ({
      ...s,
      fields: { ...s.fields, [key]: { ...s.fields[key], ...p } },
    }));
  }

  // Token fields
  function isTokenIncluded(tokenKey: string) {
    return state.tokenFields.some((t) => t.tokenKey === tokenKey);
  }
  function toggleToken(tokenKey: string, on: boolean) {
    setState((s) => ({
      ...s,
      tokenFields: on
        ? [...s.tokenFields, { tokenKey, required: false }]
        : s.tokenFields.filter((t) => t.tokenKey !== tokenKey),
    }));
  }
  function setTokenRequired(tokenKey: string, required: boolean) {
    setState((s) => ({
      ...s,
      tokenFields: s.tokenFields.map((t) =>
        t.tokenKey === tokenKey ? { ...t, required } : t,
      ),
    }));
  }

  // Tags
  function toggleTag(id: string) {
    setState((s) => ({
      ...s,
      defaultTagIds: s.defaultTagIds.includes(id)
        ? s.defaultTagIds.filter((x) => x !== id)
        : [...s.defaultTagIds, id],
    }));
    setErrors((e) => ({ ...e, tags: "" }));
  }

  // ── Discard logic ──────────────────────────────────────────────────────────
  const isDirty = JSON.stringify(state) !== JSON.stringify(initial);

  function handleClose() {
    if (isDirty && !showDiscard) { setShowDiscard(true); return; }
    onClose();
  }
  function forceClose() { setShowDiscard(false); onClose(); }

  // ── Validate ───────────────────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!state.name.trim()) e.name = "Form name is required.";
    if (state.slug && !SLUG_RE.test(state.slug)) e.slug = "Use lowercase letters, numbers, and hyphens only.";
    if (slugStatus === "taken") e.slug = "This URL is already in use. Try another.";
    if (slugStatus === "checking") e.slug = "Please wait for slug availability check.";
    if (state.defaultTagIds.length === 0) e.tags = "Select at least one default tag.";
    return e;
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = bodyRef.current?.querySelector("[data-error-field]");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    setFormErr(null);
    try {
      // Enrich each selected token field with its label + type from the token
      // registry. Stale tokens (deleted from Settings) are silently dropped.
      const enrichedTokenFields = state.tokenFields
        .map((tf) => {
          const token = tokens.find((t) => t.key === tf.tokenKey);
          if (!token) return null; // stale — skip
          return {
            tokenKey: tf.tokenKey,
            label:    token.label,
            type:     (token.type ?? "text") as TokenDataType,
            required: tf.required,
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
          // senderId is NOT sent — the API resolves it from the Bearer JWT
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
      onClose();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // ── Stale token keys (in state but deleted from Settings) ──────────────────
  const activeTokenKeys = new Set(tokens.map((t) => t.key));
  const staleTokenKeys  = state.tokenFields
    .map((tf) => tf.tokenKey)
    .filter((k) => !activeTokenKeys.has(k));

  const inputCls = (field: string) =>
    `${baseCls} ${errors[field] ? "border-red-400" : "border-gray-300"}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-3xl bg-gray-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleClose}
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
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* ── Identity ──────────────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l-3 3 3-3zm0 0l6.768-6.768" /></svg>}
              title="Form identity"
              desc="Name it, set the message customers see, and pick its link."
            >
              <div className="space-y-5">
                {/* Name */}
                <div data-error-field={errors.name ? "name" : undefined}>
                  <FieldLabel required>Form name</FieldLabel>
                  <input
                    type="text"
                    value={state.name}
                    maxLength={100}
                    autoFocus
                    onChange={(e) => { patch({ name: e.target.value }); setErrors((er) => ({ ...er, name: "" })); }}
                    placeholder="e.g. Barbershop Walk-in Form"
                    className={inputCls("name")}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.name ? "#f87171" : "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <p className="text-[12px] text-gray-400 mt-1">Internal label — only you see this in the dashboard.</p>
                  {errors.name && <p className="text-[12px] text-red-600 mt-1">{errors.name}</p>}
                </div>

                {/* Header message */}
                <div>
                  <FieldLabel optional>Header message</FieldLabel>
                  <textarea
                    rows={2}
                    value={state.headerMessage}
                    maxLength={150}
                    onChange={(e) => patch({ headerMessage: e.target.value })}
                    placeholder="e.g. Scan to get ₱50 off your next haircut!"
                    className={`${inputCls("")} resize-none`}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-[12px] text-gray-400">Shown at the top of the public form.</p>
                    <span className={`text-[12px] ${state.headerMessage.length > 130 ? "text-[#FF692E]" : "text-gray-400"}`}>
                      {state.headerMessage.length}/150
                    </span>
                  </div>
                </div>

                {/* Custom slug */}
                <div data-error-field={errors.slug ? "slug" : undefined}>
                  <FieldLabel optional>Custom URL slug</FieldLabel>
                  <div
                    className={`flex items-stretch rounded-lg border overflow-hidden ${
                      errors.slug || slugStatus === "taken" ? "border-red-400" : "border-gray-300"
                    }`}
                  >
                    <span className="px-3 flex items-center bg-gray-50 text-[13px] text-gray-400 font-mono border-r border-gray-200 whitespace-nowrap">
                      {window.location.host}/f/
                    </span>
                    <input
                      type="text"
                      value={state.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="your-form-name"
                      className="flex-1 px-3 py-2.5 text-sm font-mono outline-none"
                    />
                    <div className="flex items-center pr-3">
                      {slugStatus === "checking" && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                      {slugStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {slugStatus === "taken" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                  {slugStatus === "available" && !errors.slug && (
                    <p className="text-[12px] text-green-600 mt-1">✓ Available</p>
                  )}
                  {(slugStatus === "taken" || errors.slug) && (
                    <p className="text-[12px] text-red-600 mt-1">{errors.slug || "This URL is already in use. Try another."}</p>
                  )}
                  {slugStatus !== "taken" && !errors.slug && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Optional vanity link. Leave blank to use the auto short code.
                    </p>
                  )}
                </div>

                {/* Thank you message */}
                <div>
                  <FieldLabel optional>Thank-you message</FieldLabel>
                  <textarea
                    rows={2}
                    value={state.thankYouMessage}
                    onChange={(e) => patch({ thankYouMessage: e.target.value })}
                    placeholder="Thank you for registering! We'll be in touch."
                    className={`${inputCls("")} resize-none`}
                    onFocus={(e) => { e.target.style.borderColor = "#FF692E"; e.target.style.boxShadow = "0 0 0 3px rgba(255,105,46,.16)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
                  />
                  <p className="text-[12px] text-gray-400 mt-1">
                    Shown after a successful submission. Defaults to "Thank you for registering! We'll be in touch."
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Standard fields ───────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              title="Form fields"
              desc="Choose what to collect. Name, mobile, and consent are always required."
            >
              <div className="space-y-2.5">
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  label="Name" locked
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                  label="Mobile number" sub="Validated as a Philippine mobile number" locked
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  label="Birthday"
                  show={state.fields.birthday.visible}
                  required={state.fields.birthday.required}
                  onShow={(v) => setField("birthday", { visible: v, required: v ? state.fields.birthday.required : false })}
                  onRequired={(v) => setField("birthday", { required: v })}
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  label="Address"
                  show={state.fields.address.visible}
                  required={state.fields.address.required}
                  onShow={(v) => setField("address", { visible: v, required: v ? state.fields.address.required : false })}
                  onRequired={(v) => setField("address", { required: v })}
                />
                <FieldToggleRow
                  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  label="Consent checkbox" sub="SMS opt-in agreement — legally required" locked
                />
              </div>
            </Section>

            {/* ── Custom token fields ───────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
              title="Custom fields"
              desc="Collect extra data using tokens defined in Settings."
            >
              {tokens.length === 0 ? (
                <div className="px-4 py-4 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-gray-500">
                  No custom fields defined yet.{" "}
                  <a href="/settings" className="text-[#FF692E] hover:underline font-medium">
                    Add tokens in Settings
                  </a>{" "}
                  to include them here.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Active tokens */}
                  {tokens.map((tok) => {
                    const included = isTokenIncluded(tok.key);
                    const tf       = state.tokenFields.find((t) => t.tokenKey === tok.key);
                    return (
                      <TokenToggleRow
                        key={tok.key}
                        label={tok.label}
                        tokenKey={tok.key}
                        typeBadge={tok.type ?? "text"}
                        included={included}
                        required={tf?.required ?? false}
                        onInclude={(v) => toggleToken(tok.key, v)}
                        onRequired={(v) => setTokenRequired(tok.key, v)}
                      />
                    );
                  })}
                  {/* Stale token rows (previously added, since deleted) */}
                  {staleTokenKeys.map((key) => {
                    const tf = state.tokenFields.find((t) => t.tokenKey === key)!;
                    return (
                      <TokenToggleRow
                        key={key}
                        label={key}
                        tokenKey={key}
                        typeBadge="unknown"
                        included={true}
                        required={tf.required}
                        deleted
                        onInclude={(v) => toggleToken(key, v)}
                        onRequired={(v) => setTokenRequired(key, v)}
                      />
                    );
                  })}
                </div>
              )}
            </Section>

            {/* ── Default tags ──────────────────────────────────────────── */}
            <Section
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
              title="Default tags"
              desc="Applied to every contact who submits — pick at least one."
            >
              {tags.length === 0 ? (
                <div className="px-4 py-4 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-gray-500">
                  No tags yet.{" "}
                  <a href="/settings" className="text-[#FF692E] hover:underline font-medium">
                    Add tags in Settings.
                  </a>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2" data-error-field={errors.tags ? "tags" : undefined}>
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
                            ? { borderColor: t.color ?? "#FF692E", backgroundColor: (t.color ?? "#FF692E") + "18", color: t.color ?? "#FF692E" }
                            : { borderColor: "#e5e7eb", color: "#6b7280", backgroundColor: "#fff" }
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: t.color ?? "#9ca3af" }}
                        />
                        {t.name}
                        {on && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
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

            {/* Form-level error */}
            {formErr && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formErr}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create form"}
          </button>
        </div>
      </div>

      {/* Discard confirm */}
      {showDiscard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Discard changes?</h3>
            <p className="text-sm text-gray-600">You have unsaved changes. Are you sure you want to close?</p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscard(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={forceClose}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
