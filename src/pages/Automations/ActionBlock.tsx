import { useState, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { ActionFormRow, SmsPriority } from "@/types";
import type { ApiToken, Tag } from "@/types";

interface ActionBlockProps {
  row: ActionFormRow;
  index: number;          // 1-based display number
  tokens: ApiToken[];
  tags: Tag[];
  onChange: (updated: ActionFormRow) => void;
  onRemove: () => void;
  errors: { msg?: string; tag?: string };
}

const PRIORITIES: { value: SmsPriority; label: string }[] = [
  { value: 0, label: "Low"    },
  { value: 1, label: "Normal" },
  { value: 2, label: "High"   },
];

const inputCls = (hasErr: boolean) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors focus:ring-2 ${
    hasErr
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
  }`;

// ── Token picker dropdown ─────────────────────────────────────────────────────

function TokenPickerDropdown({
  tokens,
  onPick,
}: {
  tokens: ApiToken[];
  onPick: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = tokens.filter(
    (t) =>
      t.label.toLowerCase().includes(q.toLowerCase()) ||
      t.key.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="absolute bottom-full mb-2 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tokens…"
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-orange-400"
        />
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {tokens.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-gray-500">
            No tokens defined.{" "}
            <span className="text-gray-400">Add in Settings → Custom Tokens.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-gray-500">No tokens match.</div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(t.key); }}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{t.label}</div>
                <div className="text-xs text-gray-500 font-mono truncate">{`{{${t.key}}}`}</div>
              </div>
              {t.fallback && (
                <div className="text-xs text-gray-400 shrink-0 truncate">e.g. {t.fallback}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── ActionBlock ───────────────────────────────────────────────────────────────

export function ActionBlock({
  row,
  index,
  tokens,
  tags,
  onChange,
  onRemove,
  errors,
}: ActionBlockProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertToken(key: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start  = el.selectionStart ?? (row.message?.length ?? 0);
    const end    = el.selectionEnd   ?? (row.message?.length ?? 0);
    const msg    = row.message ?? "";
    const insert = `{{${key}}}`;
    onChange({ ...row, message: msg.slice(0, start) + insert + msg.slice(end) });
    setPickerOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  // ── Header accent color per type ──────────────────────────────────────────
  const headerCls =
    row.type === "OPT_OUT"    ? "border-red-100 bg-red-50/60"
    : row.type === "REMOVE_TAG" ? "border-amber-100 bg-amber-50/60"
    : "border-gray-100 bg-gray-50/60";

  const TYPE_LABELS: Record<string, string> = {
    SEND_SMS:   "Send SMS",
    APPLY_TAG:  "Apply Tag",
    REMOVE_TAG: "Remove Tag",
    OPT_OUT:    "Mark as Opted Out",
  };

  const charCount = row.message?.length ?? 0;
  const segCount  = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      data-error-field={`action_${index - 1}`}
    >
      {/* ── Action header ── */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${headerCls}`}>
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
            {index}
          </span>
          <span className="text-sm font-semibold text-gray-700">{TYPE_LABELS[row.type]}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Remove action"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Action body ── */}
      <div className="p-4">
        {row.type === "SEND_SMS" && (
          <div className="space-y-3">
            {/* Message textarea */}
            <div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={row.message ?? ""}
                  onChange={(e) => onChange({ ...row, message: e.target.value })}
                  rows={3}
                  placeholder="Type the SMS message…"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm resize-none outline-none transition-colors focus:ring-2 ${
                    errors.msg
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
                  }`}
                />
                {/* Token picker button */}
                <div className="absolute right-2 bottom-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPickerOpen((p) => !p)}
                      className="px-2.5 py-1 text-xs font-medium border border-gray-200 bg-white rounded-md hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 7h16M4 12h16M4 17h7" />
                      </svg>
                      Insert token
                    </button>
                    {pickerOpen && (
                      <TokenPickerDropdown tokens={tokens} onPick={insertToken} />
                    )}
                  </div>
                </div>
              </div>
              {errors.msg && (
                <p className="text-xs text-red-600 mt-1">{errors.msg}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                <span className={charCount > 160 ? "text-orange-600 font-medium" : "text-gray-700 font-medium"}>
                  {charCount}
                </span>
                <span>/ 160 chars ·</span>
                <span className="font-medium text-gray-700">{segCount}</span>
                <span>{segCount === 1 ? "segment" : "segments"}</span>
              </div>
            </div>

            {/* Priority segmented control */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {PRIORITIES.map((p) => {
                  const active = (row.smsPriority ?? 1) === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onChange({ ...row, smsPriority: p.value })}
                      className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-[#FF692E] text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      } ${p.value !== 0 ? "border-l border-gray-200" : ""}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(row.type === "APPLY_TAG" || row.type === "REMOVE_TAG") && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Tag <span className="text-[#FF692E]">*</span>
            </label>
            <select
              value={row.tagId ?? ""}
              onChange={(e) => onChange({ ...row, tagId: e.target.value || null })}
              className={inputCls(!!errors.tag)}
            >
              <option value="">Select a tag…</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
            {/* Color dot preview next to selected tag */}
            {row.tagId && (() => {
              const t = tags.find((x) => x.id === row.tagId);
              if (!t) return null;
              return (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: t.color ?? "#d1d5db" }}
                  />
                  <span className="text-xs text-gray-500">{t.name}</span>
                </div>
              );
            })()}
            {errors.tag && (
              <p className="text-xs text-red-600 mt-1">{errors.tag}</p>
            )}
          </div>
        )}

        {row.type === "OPT_OUT" && (
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span>
              The contact will be marked as <strong>opted out</strong> and will no longer
              receive messages. This cannot be undone per contact.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
