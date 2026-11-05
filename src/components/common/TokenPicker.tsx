import { useState } from "react";
import type { ApiToken } from "@/types";

/** Searchable token list — picking one calls onPick so the caller can insert {{key}} at the cursor. */
export function TokenPicker({
  onPick,
  anchor = "down",
  tokens,
}: {
  onPick: (t: { key: string }) => void;
  anchor?: "up" | "down";
  tokens: ApiToken[];
}) {
  const [q, setQ] = useState("");
  const filtered = tokens.filter(
    (t) =>
      t.label.toLowerCase().includes(q.toLowerCase()) ||
      t.key.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div
      className={`absolute ${
        anchor === "down" ? "top-full mt-2" : "bottom-full mb-2"
      } left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden`}
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tokens…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-orange-400"
        />
      </div>
      <div className="max-h-64 overflow-auto py-1">
        {tokens.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            No tokens defined.{" "}
            <span className="text-gray-400">Add in Settings → Custom Tokens.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">No tokens match.</div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(t); }}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{t.label}</div>
                <div className="text-xs text-gray-500 font-mono truncate">{`{{${t.key}}}`}</div>
              </div>
              {t.fallback && (
                <div className="text-xs text-gray-400 truncate shrink-0">e.g. {t.fallback}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
