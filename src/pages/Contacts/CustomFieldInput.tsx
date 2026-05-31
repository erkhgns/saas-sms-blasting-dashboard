import type { ApiToken } from "@/types";

interface CustomFieldInputProps {
  token: ApiToken;
  value: string | undefined;
  onChange: (value: string) => void;
}

// ── Shared focus ring (orange brand) ─────────────────────────────────────────

const focusOrange = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#FF692E";
  e.target.style.boxShadow   = "0 0 0 2px rgba(255, 105, 46, 0.18)";
};
const blurOrange = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#d1d5db";
  e.target.style.boxShadow   = "none";
};

const baseCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none";

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomFieldInput({ token, value, onChange }: CustomFieldInputProps) {
  const isEmpty     = !value || String(value).trim() === "";
  const hasFallback = token.fallback != null && token.fallback !== "";
  const type        = token.type ?? "text";

  // ── Date picker ─────────────────────────────────────────────────────────────
  if (type === "date") {
    return (
      <div>
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseCls}
          style={{ outline: "none" }}
          onFocus={focusOrange}
          onBlur={blurOrange}
        />
        {isEmpty && hasFallback && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="text-gray-300">↳</span>
            Will use fallback:{" "}
            <span className="font-mono text-gray-500">"{token.fallback}"</span>
          </p>
        )}
      </div>
    );
  }

  // ── Number ──────────────────────────────────────────────────────────────────
  if (type === "number") {
    return (
      <div>
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasFallback ? `Fallback: "${token.fallback}"` : "0"}
          className={baseCls}
          style={{ outline: "none" }}
          onFocus={focusOrange}
          onBlur={blurOrange}
        />
        {isEmpty && hasFallback && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="text-gray-300">↳</span>
            Will use fallback:{" "}
            <span className="font-mono text-gray-500">"{token.fallback}"</span>
          </p>
        )}
      </div>
    );
  }

  // ── Decimal ─────────────────────────────────────────────────────────────────
  if (type === "decimal") {
    return (
      <div>
        <input
          type="number"
          step="0.01"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasFallback ? `Fallback: "${token.fallback}"` : "0.00"}
          className={baseCls}
          style={{ outline: "none" }}
          onFocus={focusOrange}
          onBlur={blurOrange}
        />
        {isEmpty && hasFallback && (
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="text-gray-300">↳</span>
            Will use fallback:{" "}
            <span className="font-mono text-gray-500">"{token.fallback}"</span>
          </p>
        )}
      </div>
    );
  }

  // ── Boolean — toggle switch ──────────────────────────────────────────────────
  if (type === "boolean") {
    const isOn = value === "true";
    return (
      <div>
        <div className="flex items-center gap-3 py-1">
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => onChange(isOn ? "false" : "true")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF692E]/40 ${
              isOn ? "bg-[#FF692E]" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                isOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 select-none">
            {isOn ? "True" : "False"}
          </span>
          {isEmpty && hasFallback && (
            <span className="text-[11px] text-gray-400 ml-1">
              (fallback: <span className="font-mono">"{token.fallback}"</span>)
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Text (default) ──────────────────────────────────────────────────────────
  return (
    <div>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          hasFallback
            ? `Fallback: "${token.fallback}"`
            : `Value for {{${token.key}}}`
        }
        className={baseCls}
        style={{ outline: "none" }}
        onFocus={focusOrange}
        onBlur={blurOrange}
      />
      {isEmpty && hasFallback && (
        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
          <span className="text-gray-300">↳</span>
          Will use fallback:{" "}
          <span className="font-mono text-gray-500">"{token.fallback}"</span>
        </p>
      )}
    </div>
  );
}
