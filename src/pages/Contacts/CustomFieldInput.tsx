import type { ApiToken } from "@/types";

interface CustomFieldInputProps {
  token: ApiToken;
  value: string | undefined;
  onChange: (value: string) => void;
}

const focusOrange = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#FF692E";
  e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 46, 0.18)";
};
const blurOrange = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#d1d5db";
  e.target.style.boxShadow = "none";
};

export function CustomFieldInput({ token, value, onChange }: CustomFieldInputProps) {
  const isEmpty = !value || String(value).trim() === "";
  const hasFallback = token.fallback != null && token.fallback !== "";

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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
