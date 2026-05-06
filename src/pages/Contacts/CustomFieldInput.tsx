import type { PersonalizationToken } from "@/types";

interface CustomFieldInputProps {
  token: PersonalizationToken;
  value: string | undefined;
  onChange: (value: string) => void;
}

const focusOrange = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#FF5F1F";
  e.target.style.boxShadow = "0 0 0 2px rgba(255, 95, 31, 0.18)";
};
const blurOrange = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#d1d5db";
  e.target.style.boxShadow = "none";
};

const baseClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm";
const baseStyle: React.CSSProperties = { outline: "none" };

export function CustomFieldInput({ token, value, onChange }: CustomFieldInputProps) {
  if (token.type === "select") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} bg-white appearance-none`}
        style={baseStyle}
        onFocus={focusOrange}
        onBlur={blurOrange}
      >
        <option value="">— None —</option>
        {token.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={token.type === "date" ? "date" : token.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={token.fallback ? `Fallback: "${token.fallback}"` : "Empty"}
      className={`${baseClass}${token.type === "number" ? " font-mono" : ""}`}
      style={baseStyle}
      onFocus={focusOrange}
      onBlur={blurOrange}
    />
  );
}
