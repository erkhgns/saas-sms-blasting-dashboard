import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import { BRAND } from "@/utils";
import type { Contact } from "@/types";
import type { ApiToken, TokenDataType } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectiveType(type: TokenDataType | null): TokenDataType {
  return type ?? "text";
}

function displayValue(raw: string | undefined, type: TokenDataType | null): string {
  if (!raw && raw !== "0") return "—";
  if (effectiveType(type) === "date") {
    try {
      return new Date(raw + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch {
      return raw;
    }
  }
  return raw;
}

// ── Boolean switch ────────────────────────────────────────────────────────────

function BooleanSwitch({
  tokenKey,
  label,
  raw,
  onToggle,
  toggling,
}: {
  tokenKey: string;
  label: string;
  raw: string;
  onToggle: (key: string, next: string) => void;
  toggling: boolean;
}) {
  const isOn = raw === "true";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] text-gray-500">{label}:</span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        disabled={toggling}
        onClick={() => onToggle(tokenKey, isOn ? "false" : "true")}
        className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: isOn ? BRAND.primary : "#d1d5db" }}
      >
        <span
          className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: isOn ? "translateX(14px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

// ── Inline text/number/date editor ────────────────────────────────────────────

interface TokenFieldEditorProps {
  token: ApiToken;
  currentValue: string;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}

function TokenFieldEditor({ token, currentValue, onSave, onCancel }: TokenFieldEditorProps) {
  const [draft, setDraft]   = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commit = useCallback(async (value: string) => {
    setSaving(true);
    try { await onSave(value.trim()); }
    finally { setSaving(false); }
  }, [onSave]);

  const type = effectiveType(token.type);

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type={type === "date" ? "date" : "text"}
        inputMode={type === "number" || type === "decimal" ? "decimal" : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter")  { e.preventDefault(); commit(draft); }
          if (e.key === "Escape") { onCancel(); }
        }}
        disabled={saving}
        className="w-28 px-2 py-0.5 text-xs border rounded outline-none disabled:opacity-50 bg-white"
        style={{ borderColor: BRAND.primary, boxShadow: `0 0 0 2px ${BRAND.primary}22` }}
      />
      <button
        type="button"
        onClick={() => commit(draft)}
        disabled={saving}
        className="text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
        title="Save"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ConversationTokenBar ──────────────────────────────────────────────────────

interface ConversationTokenBarProps {
  /** Contact from ConversationResponse — includes customFields (CR-01) */
  contact: Contact | null;
  tokens: ApiToken[];
  onTokenUpdate: (key: string, value: string) => Promise<void>;
}

export function ConversationTokenBar({
  contact,
  tokens,
  onTokenUpdate,
}: ConversationTokenBarProps) {
  const [editingKey, setEditingKey]   = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  if (!contact || tokens.length === 0) return null;

  const customFields = contact.customFields ?? {};

  const handleToggle = async (key: string, next: string) => {
    setTogglingKey(key);
    try { await onTokenUpdate(key, next); }
    finally { setTogglingKey(null); }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-t border-gray-100 overflow-x-auto flex-shrink-0 min-h-[38px]">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
        Fields
      </span>

      <div className="flex items-center gap-3 flex-nowrap">
        {tokens.map((token, i) => {
          const raw      = customFields[token.key] ?? "";
          const isEditing = editingKey === token.key;
          const isBool   = effectiveType(token.type) === "boolean";

          return (
            <div key={token.key} className="flex items-center gap-1.5 shrink-0">
              {isBool ? (
                <BooleanSwitch
                  tokenKey={token.key}
                  label={token.label}
                  raw={raw}
                  onToggle={handleToggle}
                  toggling={togglingKey === token.key}
                />
              ) : isEditing ? (
                <>
                  <span className="text-[11px] text-gray-500">{token.label}:</span>
                  <TokenFieldEditor
                    token={token}
                    currentValue={raw}
                    onSave={async (v) => {
                      await onTokenUpdate(token.key, v);
                      setEditingKey(null);
                    }}
                    onCancel={() => setEditingKey(null)}
                  />
                </>
              ) : (
                <>
                  <span className="text-[11px] text-gray-500">{token.label}:</span>
                  <button
                    type="button"
                    onClick={() => setEditingKey(token.key)}
                    title={`Edit ${token.label}`}
                    className="text-[11px] font-semibold transition-colors hover:underline decoration-dashed underline-offset-2"
                    style={{ color: raw ? BRAND.primary : "#9ca3af" }}
                  >
                    {displayValue(raw, token.type)}
                  </button>
                </>
              )}

              {i < tokens.length - 1 && (
                <span className="text-gray-200 select-none">·</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
