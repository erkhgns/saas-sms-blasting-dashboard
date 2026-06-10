import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { publicFormService } from "@/services/public-form.service";
import { InactiveScreen } from "./InactiveScreen";
import { ThankYouScreen } from "./ThankYouScreen";
import type { FormPublicConfig, FormSubmissionPayload } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#FF692E";
const PH_MOBILE_RE = /^(09\d{9}|(\+63|0063)9\d{9})$/;

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct / 100;
  r = Math.round(r + (f < 0 ? r : 255 - r) * f);
  g = Math.round(g + (f < 0 ? g : 255 - g) * f);
  b = Math.round(b + (f < 0 ? b : 255 - b) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PFField({
  label, required, optional, error, hint, children,
}: {
  label: string; required?: boolean; optional?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 font-normal text-[13px] ml-1">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12.5px] text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p className="text-[12.5px] text-red-600 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Header band (shared by form + thank-you) ──────────────────────────────────

function FormHeader({ config }: { config: FormPublicConfig }) {
  // Derive initials from the form name (up to 2 words)
  const initials = config.name
    .split(" ").filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className="px-6 pt-7 pb-6 text-center"
      style={{
        background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT} 60%, ${shade(ACCENT, -12)} 100%)`,
      }}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/95 mx-auto flex items-center justify-center shadow-sm">
        <span className="text-lg font-bold" style={{ color: ACCENT }}>
          {initials}
        </span>
      </div>
      {config.headerMessage ? (
        <h1 className="mt-4 text-[19px] font-bold text-white leading-snug">
          {config.headerMessage}
        </h1>
      ) : (
        <div className="mt-3 text-white/90 text-[15px] font-semibold">{config.name}</div>
      )}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-36 bg-orange-200" />
      <div className="px-5 py-6 space-y-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
        ))}
        <div className="h-12 bg-orange-200 rounded-xl" />
      </div>
    </div>
  );
}

// ── Form not found ─────────────────────────────────────────────────────────────

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-16 bg-gray-50">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mt-5 text-xl font-bold text-gray-900">Form not found</h2>
      <p className="mt-2 text-[15px] text-gray-500 leading-relaxed max-w-xs">
        This form link doesn't exist or may have been removed.
      </p>
      <div className="mt-8 text-[12px] text-gray-300 font-medium tracking-wide">Powered by Gaby SMS</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PublicForm() {
  const { code } = useParams<{ code: string }>();

  const [config,  setConfig]  = useState<FormPublicConfig | null>(null);
  const [status,  setStatus]  = useState<"loading" | "not_found" | "error" | "ready">("loading");
  const [phase,   setPhase]   = useState<"form" | "submitting" | "thankyou">("form");
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // Field values
  const [vals, setVals]   = useState<Record<string, string>>({});
  const [errs, setErrs]   = useState<Record<string, string>>({});
  const firstErrRef = useRef<HTMLDivElement>(null);

  // ── Fetch config ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    publicFormService
      .getFormConfig(code)
      .then((cfg) => { setConfig(cfg); setStatus("ready"); })
      .catch((e: Error) => {
        setStatus(e.message === "FORM_NOT_FOUND" ? "not_found" : "error");
      });
  }, [code]);

  // ── Set page <title> ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!config) return;
    document.title = config.headerMessage || config.name || "Registration Form";
    return () => { document.title = "Gaby SMS"; };
  }, [config]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const inputBase = "w-full px-3.5 py-3 border rounded-xl text-[15px] outline-none transition-colors bg-white";

  function focusRing(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, on: boolean) {
    e.target.style.borderColor = on ? ACCENT : "#d1d5db";
    e.target.style.boxShadow   = on ? `0 0 0 3px ${ACCENT}22` : "none";
  }

  function fieldCls(key: string) {
    return `${inputBase} ${errs[key] ? "border-red-400" : "border-gray-300"}`;
  }

  function set(key: string, v: string) {
    setVals((p) => ({ ...p, [key]: v }));
    if (errs[key]) setErrs((p) => ({ ...p, [key]: "" }));
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!String(vals.name ?? "").trim()) e.name = "Please enter your name.";
    if (!String(vals.mobile ?? "").trim()) {
      e.mobile = "Please enter your mobile number.";
    } else if (!PH_MOBILE_RE.test(vals.mobile.replace(/\s/g, ""))) {
      e.mobile = "Please enter a valid Philippine mobile number.";
    }

    if (config?.fields.birthday.visible) {
      if (config.fields.birthday.required && !vals.birthday) {
        e.birthday = "Please enter your birthday.";
      } else if (vals.birthday && vals.birthday > todayISO()) {
        e.birthday = "Birthday can't be in the future.";
      }
    }

    if (config?.fields.address.visible && config.fields.address.required) {
      if (!String(vals.address ?? "").trim()) e.address = "Please enter your address.";
    }

    (config?.tokenFields ?? []).forEach((tf) => {
      const v = vals[tf.tokenKey];
      if (tf.required && (v == null || String(v).trim() === "")) {
        e[tf.tokenKey] = `Please complete ${tf.label}.`;
      } else if (
        (tf.type === "number" || tf.type === "decimal") &&
        v != null &&
        String(v).trim() !== "" &&
        isNaN(Number(v))
      ) {
        e[tf.tokenKey] = "Numbers only.";
      }
    });

    if (!vals.consent) e.consent = "You must agree to continue.";
    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length > 0) {
      // scroll to first error
      setTimeout(() => {
        firstErrRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setPhase("submitting");
    setSubmitErr(null);

    // Build token values (convert boolean Yes/No → true/false)
    const tokenValues: Record<string, string> = {};
    (config?.tokenFields ?? []).forEach((tf) => {
      const v = vals[tf.tokenKey];
      if (v !== undefined && String(v).trim() !== "") {
        tokenValues[tf.tokenKey] = tf.type === "boolean"
          ? (v === "Yes" ? "true" : "false")
          : v;
      }
    });

    const payload: FormSubmissionPayload = {
      name:    vals.name.trim(),
      phone:   vals.mobile.replace(/\s/g, ""),
      consentGiven: true,
      ...(vals.birthday  ? { birthday: vals.birthday }                : {}),
      ...(vals.address   ? { address: vals.address.trim() }           : {}),
      ...(Object.keys(tokenValues).length > 0 ? { tokenValues }       : {}),
    };

    try {
      await publicFormService.submitForm(code!, payload);
      setPhase("thankyou");
    } catch (err) {
      setPhase("form");
      const msg = (err as Error).message;
      if (msg === "TOO_MANY_ATTEMPTS") {
        setSubmitErr("Too many attempts. Please wait a moment and try again.");
      } else if (msg === "FORM_INACTIVE") {
        setSubmitErr("This form is no longer accepting submissions.");
      } else {
        // 422 messages are already user-friendly; pass them through
        setSubmitErr(msg || "Something went wrong. Please try again.");
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === "loading") return <LoadingSkeleton />;
  if (status === "not_found") return <NotFoundScreen />;
  if (status === "error") return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center bg-gray-50">
      <p className="text-gray-500">Unable to load the form. Please try again later.</p>
    </div>
  );
  if (!config) return null;
  if (config.status === "inactive") return <InactiveScreen />;

  const header = <FormHeader config={config} />;

  if (phase === "thankyou") {
    return <ThankYouScreen thankYouMessage={config.thankYouMessage} header={header} />;
  }

  const submitting = phase === "submitting";
  const consentText = "I agree to receive SMS messages from this business via Gaby SMS.";

  // Collect first error field ref
  const firstErrKey = Object.keys(errs).find((k) => errs[k]);

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">

        {/* Name */}
        <div ref={firstErrKey === "name" ? firstErrRef : undefined}>
          <PFField label="Name" required error={errs.name}>
            <input
              type="text"
              value={vals.name ?? ""}
              placeholder="Juan dela Cruz"
              onChange={(e) => set("name", e.target.value)}
              className={fieldCls("name")}
              onFocus={(e) => focusRing(e, true)}
              onBlur={(e)  => focusRing(e, false)}
            />
          </PFField>
        </div>

        {/* Mobile */}
        <div ref={firstErrKey === "mobile" ? firstErrRef : undefined}>
          <PFField label="Mobile Number" required error={errs.mobile} hint="e.g. 09171234567">
            <input
              type="tel"
              inputMode="numeric"
              value={vals.mobile ?? ""}
              placeholder="09XX XXX XXXX"
              onChange={(e) => set("mobile", e.target.value)}
              className={`${fieldCls("mobile")} font-mono`}
              onFocus={(e) => focusRing(e, true)}
              onBlur={(e)  => focusRing(e, false)}
            />
          </PFField>
        </div>

        {/* Birthday */}
        {config.fields.birthday.visible && (
          <div ref={firstErrKey === "birthday" ? firstErrRef : undefined}>
            <PFField
              label="Birthday"
              required={config.fields.birthday.required}
              optional={!config.fields.birthday.required}
              error={errs.birthday}
            >
              <input
                type="date"
                max={todayISO()}
                value={vals.birthday ?? ""}
                onChange={(e) => set("birthday", e.target.value)}
                className={fieldCls("birthday")}
                onFocus={(e) => focusRing(e, true)}
                onBlur={(e)  => focusRing(e, false)}
              />
            </PFField>
          </div>
        )}

        {/* Address */}
        {config.fields.address.visible && (
          <div ref={firstErrKey === "address" ? firstErrRef : undefined}>
            <PFField
              label="Address"
              required={config.fields.address.required}
              optional={!config.fields.address.required}
              error={errs.address}
            >
              <textarea
                rows={2}
                value={vals.address ?? ""}
                placeholder="House no., street, city"
                onChange={(e) => set("address", e.target.value)}
                className={`${fieldCls("address")} resize-none`}
                onFocus={(e) => focusRing(e, true)}
                onBlur={(e)  => focusRing(e, false)}
              />
            </PFField>
          </div>
        )}

        {/* Token fields */}
        {config.tokenFields.map((tf) => (
          <div
            key={tf.tokenKey}
            ref={firstErrKey === tf.tokenKey ? firstErrRef : undefined}
          >
            <PFField
              label={tf.label}
              required={tf.required}
              optional={!tf.required}
              error={errs[tf.tokenKey]}
            >
              {tf.type === "boolean" ? (
                <div className="flex gap-2">
                  {["Yes", "No"].map((opt) => {
                    const active = vals[tf.tokenKey] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set(tf.tokenKey, opt)}
                        className="flex-1 py-3 rounded-xl border text-[15px] font-medium transition-colors"
                        style={
                          active
                            ? { borderColor: ACCENT, backgroundColor: ACCENT + "12", color: ACCENT }
                            : { borderColor: "#d1d5db", color: "#374151", backgroundColor: "#fff" }
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : tf.type === "date" ? (
                <input
                  type="date"
                  value={vals[tf.tokenKey] ?? ""}
                  onChange={(e) => set(tf.tokenKey, e.target.value)}
                  className={fieldCls(tf.tokenKey)}
                  onFocus={(e) => focusRing(e, true)}
                  onBlur={(e)  => focusRing(e, false)}
                />
              ) : tf.type === "number" || tf.type === "decimal" ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={vals[tf.tokenKey] ?? ""}
                  placeholder={tf.type === "decimal" ? "0.00" : "0"}
                  onChange={(e) => set(tf.tokenKey, e.target.value)}
                  className={`${fieldCls(tf.tokenKey)} font-mono`}
                  onFocus={(e) => focusRing(e, true)}
                  onBlur={(e)  => focusRing(e, false)}
                />
              ) : (
                <input
                  type="text"
                  value={vals[tf.tokenKey] ?? ""}
                  placeholder={`Your ${tf.label.toLowerCase()}`}
                  onChange={(e) => set(tf.tokenKey, e.target.value)}
                  className={fieldCls(tf.tokenKey)}
                  onFocus={(e) => focusRing(e, true)}
                  onBlur={(e)  => focusRing(e, false)}
                />
              )}
            </PFField>
          </div>
        ))}

        {/* Consent */}
        <div ref={firstErrKey === "consent" ? firstErrRef : undefined}>
          <button
            type="button"
            onClick={() => set("consent", vals.consent ? "" : "yes")}
            className="flex items-start gap-3 text-left w-full"
          >
            <span
              className="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors"
              style={
                vals.consent
                  ? { backgroundColor: ACCENT, borderColor: ACCENT }
                  : { borderColor: errs.consent ? "#f87171" : "#cbd5e1", backgroundColor: "#fff" }
              }
            >
              {vals.consent && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-[13.5px] text-gray-600 leading-snug">{consentText}</span>
          </button>
          {errs.consent && (
            <p className="text-[12.5px] text-red-600 mt-1.5 ml-8 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errs.consent}
            </p>
          )}
        </div>

        {/* Submit error */}
        {submitErr && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {submitErr}
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-[16px] shadow-sm transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: ACCENT }}
        >
          {submitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Submitting…
            </>
          ) : (
            "Submit"
          )}
        </button>

        <div className="pt-1 text-center text-[12px] text-gray-300 font-medium tracking-wide">
          Powered by Gaby SMS
        </div>
      </div>
    </div>
  );
}
