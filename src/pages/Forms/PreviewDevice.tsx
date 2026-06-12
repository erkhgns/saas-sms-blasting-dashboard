import { useState } from "react";
import { Eye } from "lucide-react";
import { formDisplayUrl } from "@/utils/form-url";
import type { FormBuilderState, ApiToken } from "@/types";

const ACCENT = "#FF692E";

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct / 100;
  r = Math.round(r + (f < 0 ? r : 255 - r) * Math.abs(f));
  g = Math.round(g + (f < 0 ? g : 255 - g) * Math.abs(f));
  b = Math.round(b + (f < 0 ? b : 255 - b) * Math.abs(f));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ── Mini field placeholders ───────────────────────────────────────────────────

function MiniField({
  label, required, optional,
}: {
  label: string; required?: boolean; optional?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 font-normal ml-1">(opt.)</span>}
      </div>
      <div className="w-full h-7 border border-gray-200 rounded-lg bg-white" />
    </div>
  );
}

function MiniStarField({ label, required }: { label: string; required?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map((s) => (
          <span key={s} className="text-[18px] leading-none text-gray-200">★</span>
        ))}
      </div>
    </div>
  );
}

function MiniChoiceField({
  label, required, choices, type,
}: {
  label: string; required?: boolean; choices: string[]; type: "radio" | "select";
}) {
  if (type === "select") {
    return (
      <div>
        <div className="text-[11px] font-semibold text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
        <div className="w-full h-7 border border-gray-200 rounded-lg bg-white flex items-center justify-between px-2">
          <span className="text-[10px] text-gray-300 truncate">Select an option</span>
          <span className="text-gray-300 text-[10px]">▾</span>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      <div className="space-y-1">
        {(choices.length > 0 ? choices.slice(0, 4) : ["Option 1", "Option 2"]).map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
            <span className="text-[10px] text-gray-500 truncate">{c || `Option ${i + 1}`}</span>
          </div>
        ))}
        {choices.length > 4 && (
          <div className="text-[10px] text-gray-400 pl-4">+{choices.length - 4} more</div>
        )}
      </div>
    </div>
  );
}

function MiniYesNoField({ label, required }: { label: string; required?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      <div className="flex gap-1.5">
        {["Yes", "No"].map((opt) => (
          <div
            key={opt}
            className="flex-1 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-[11px] text-gray-400 font-medium"
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline public form preview ────────────────────────────────────────────────

interface MiniFormProps {
  state: FormBuilderState;
  tokens: ApiToken[];
  view: "form" | "thankyou" | "inactive";
}

function MiniPublicForm({ state, tokens, view }: MiniFormProps) {
  const resolvedTokenFields = state.tokenFields
    .map((tf) => {
      const token = tokens.find((t) => t.key === tf.tokenKey);
      return token
        ? { tokenKey: tf.tokenKey, label: token.label, required: tf.required, fieldType: tf.fieldType, choices: tf.choices }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const header = (
    <div
      className="px-5 pt-6 pb-5 text-center shrink-0"
      style={{
        background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT} 60%, ${shade(ACCENT, -12)} 100%)`,
      }}
    >
      <div className="w-fit mx-auto max-w-[90%] px-3 py-1.5 rounded-lg bg-white/95 flex items-center justify-center shadow-sm">
        <span className="text-[11px] font-bold truncate" style={{ color: ACCENT }}>
          {state.name || "Form name"}
        </span>
      </div>
      {state.headerMessage ? (
        <h1 className="mt-3 text-[13px] font-bold text-white leading-snug line-clamp-2">
          {state.headerMessage}
        </h1>
      ) : (
        <div className="mt-2.5 text-white/90 text-[12px] font-semibold truncate">
          {state.name || "Form name"}
        </div>
      )}
    </div>
  );

  if (view === "inactive") {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col">
        <div
          className="px-5 pt-6 pb-5 text-center shrink-0"
          style={{
            background: `linear-gradient(160deg, ${ACCENT} 0%, ${ACCENT} 60%, ${shade(ACCENT, -12)} 100%)`,
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 mx-auto flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-8">
          <p className="text-[12px] font-semibold text-gray-800">This form is no longer active</p>
          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
            This registration form has been closed by the business.
          </p>
        </div>
        <div className="pb-5 text-center text-[9px] text-gray-300 font-medium tracking-wide">
          Powered by Gaby SMS
        </div>
      </div>
    );
  }

  if (view === "thankyou") {
    const msg = state.thankYouMessage?.trim() || "Thank you for registering! We'll be in touch.";
    return (
      <div className="min-h-full bg-gray-50 flex flex-col">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: ACCENT + "1A" }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={ACCENT} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-[13px] font-bold text-gray-900">You're all set!</h2>
          <p className="mt-2 text-[10px] text-gray-600 leading-relaxed max-w-[180px]">{msg}</p>
        </div>
        <div className="pb-5 text-center text-[9px] text-gray-300 font-medium tracking-wide">
          Powered by Gaby SMS
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-5">
      {header}
      <div className="px-4 py-4 space-y-3">
        <MiniField label="Name" required />
        <MiniField label="Mobile Number" required />

        {state.fields.birthday.visible && (
          <MiniField
            label="Birthday"
            required={state.fields.birthday.required}
            optional={!state.fields.birthday.required}
          />
        )}
        {state.fields.address.visible && (
          <MiniField
            label="Address"
            required={state.fields.address.required}
            optional={!state.fields.address.required}
          />
        )}

        {resolvedTokenFields.map((tf) => {
          switch (tf.fieldType) {
            case "star_rating":
              return <MiniStarField key={tf.tokenKey} label={tf.label} required={tf.required} />;
            case "multiple_choice":
              return (
                <MiniChoiceField
                  key={tf.tokenKey} label={tf.label} required={tf.required}
                  choices={tf.choices} type="radio"
                />
              );
            case "dropdown":
              return (
                <MiniChoiceField
                  key={tf.tokenKey} label={tf.label} required={tf.required}
                  choices={tf.choices} type="select"
                />
              );
            case "yes_no":
              return <MiniYesNoField key={tf.tokenKey} label={tf.label} required={tf.required} />;
            default:
              // text_input, date_picker
              return (
                <MiniField
                  key={tf.tokenKey}
                  label={tf.label}
                  required={tf.required}
                  optional={!tf.required}
                />
              );
          }
        })}

        {/* Consent */}
        <div className="flex items-start gap-2 pt-1">
          <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white shrink-0 mt-0.5" />
          <span className="text-[9.5px] text-gray-500 leading-snug">
            I agree to receive SMS messages from this business via Gaby SMS.
          </span>
        </div>
        {/* Submit */}
        <div className="pt-1">
          <div
            className="w-full py-2.5 rounded-xl text-center text-[12px] font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            Submit
          </div>
        </div>
        <div className="pt-1 text-center text-[9px] text-gray-300 font-medium tracking-wide">
          Powered by Gaby SMS
        </div>
      </div>
    </div>
  );
}

// ── PreviewDevice ─────────────────────────────────────────────────────────────

interface PreviewDeviceProps {
  state: FormBuilderState;
  tokens: ApiToken[];
  shortCode?: string;
  slug?: string;
}

const VIEWS = [
  { v: "form",     label: "Form"      },
  { v: "thankyou", label: "Thank you" },
  { v: "inactive", label: "Inactive"  },
] as const;

export function PreviewDevice({ state, tokens, shortCode, slug }: PreviewDeviceProps) {
  const [view, setView] = useState<"form" | "thankyou" | "inactive">("form");
  const displayCode = slug || shortCode || "";

  return (
    <div className="flex flex-col items-center">
      {/* State switcher */}
      <div className="inline-flex p-0.5 bg-gray-100 rounded-lg mb-4">
        {VIEWS.map((s) => {
          const active = view === s.v;
          return (
            <button
              key={s.v}
              type="button"
              onClick={() => setView(s.v)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                active ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Phone frame */}
      <div className="relative" style={{ width: 300 }}>
        <div className="rounded-[2.4rem] bg-gray-900 p-[11px] shadow-2xl">
          <div
            className="rounded-[1.9rem] overflow-hidden bg-white relative"
            style={{ height: 600 }}
          >
            {/* Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-20" />
            {/* Scrollable form content */}
            <div className="h-full overflow-y-auto">
              <MiniPublicForm state={state} tokens={tokens} view={view} />
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="mt-3 text-[12px] text-gray-400 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        {displayCode ? `Live preview · ${formDisplayUrl(displayCode)}` : "Live preview"}
      </div>
    </div>
  );
}
