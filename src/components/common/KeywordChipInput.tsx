import { useState, useRef } from "react";
import { X } from "lucide-react";

interface KeywordChipInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  hasError?: boolean;
}

export function KeywordChipInput({ keywords, onChange, hasError = false }: KeywordChipInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addKeyword() {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return;
    if (!keywords.includes(trimmed)) onChange([...keywords, trimmed]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(); }
    if (e.key === "Backspace" && !inputValue && keywords.length > 0)
      onChange(keywords.slice(0, -1));
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`flex flex-wrap gap-2 px-3 py-2.5 border rounded-lg cursor-text min-h-[44px] transition-colors focus-within:ring-2 ${
        hasError
          ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
          : "border-gray-300 focus-within:border-[#FF692E] focus-within:ring-[#FF692E]/20"
      }`}
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(keywords.filter((k) => k !== kw)); }}
            className="ml-0.5 hover:text-orange-900 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addKeyword(); }}
        placeholder={keywords.length === 0 ? "Type a keyword and press Enter…" : "Add more…"}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder:text-gray-400"
      />
    </div>
  );
}
