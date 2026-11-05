import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Zap, ArrowRight } from "lucide-react";
import { BRAND } from "@/utils";
import { resolveTemplateParts, smsInfo } from "@/utils/quickReplies";
import type { ApiToken, QuickReply } from "@/types";

const ROW_HEIGHT   = 48;
const VISIBLE_ROWS = 6;
const PREVIEW_WIDTH = 320;

// ── Picker ────────────────────────────────────────────────────────────────────
// Opens above the reply box while the reply starts with "/". Keyboard handling
// (↑ ↓ Enter Esc) lives on the textarea in the Inbox page so focus never moves here.

export function QuickReplyPicker({
  items,
  total,
  query,
  highlight,
  onHighlight,
  onSelect,
  values,
  tokens,
  pickerRef,
}: {
  items: QuickReply[];
  /** All quick replies on the account — 0 shows the "create one" empty state. */
  total: number;
  query: string;
  highlight: number;
  onHighlight: (index: number) => void;
  onSelect: (reply: QuickReply) => void;
  values: Record<string, unknown> | null | undefined;
  tokens: ApiToken[];
  pickerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<"right" | "left">("right");

  // Preview goes right of the picker unless it would run off-screen
  useLayoutEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSide(rect.right + 12 + PREVIEW_WIDTH > window.innerWidth ? "left" : "right");
  });

  // Keep the highlighted row in view
  useEffect(() => {
    const el = listRef.current;
    if (!el || highlight < 0) return;
    const top = highlight * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
  }, [highlight]);

  const active = highlight >= 0 ? items[highlight] ?? null : null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 z-40"
      style={{ width: 520, maxWidth: "100%" }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-gray-100 bg-gray-50/70">
          <Zap className="w-3.5 h-3.5" style={{ color: BRAND.primary }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick replies</span>
          {query && <span className="text-xs text-gray-400 font-mono truncate">/{query}</span>}
        </div>

        {total === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-sm text-gray-600">No quick replies yet.</div>
            <Link
              to="/settings#quick-replies"
              onMouseDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1.5 text-sm font-semibold hover:underline"
              style={{ color: BRAND.primaryHover }}
            >
              Create one in Settings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No results for ‘/{query}’</div>
        ) : (
          <div
            ref={listRef}
            role="listbox"
            aria-label="Quick replies"
            className="overflow-y-auto"
            style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}
          >
            {items.map((r, i) => {
              const on = i === highlight;
              const preview = r.message.length > 50 ? r.message.slice(0, 50).trimEnd() + "…" : r.message;
              return (
                <div
                  key={r.id}
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => onHighlight(i)}
                  // mousedown + preventDefault keeps focus in the reply textarea
                  onMouseDown={(e) => { e.preventDefault(); onSelect(r); }}
                  className="flex items-center gap-3 px-3 cursor-pointer"
                  style={{
                    height: ROW_HEIGHT,
                    backgroundColor: on ? BRAND.primaryLight : undefined,
                    boxShadow: on ? `inset 3px 0 0 ${BRAND.primary}` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 shrink-0" style={{ maxWidth: 230 }}>
                    <span className="text-sm font-semibold text-gray-900 truncate">{r.name}</span>
                    {r.shortcut && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[11px] font-mono">/{r.shortcut}</span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-right text-xs text-gray-400 truncate">{preview}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 px-3 h-8 border-t border-gray-100 text-[11px] text-gray-400">
          <span>↑ ↓ navigate</span>
          <span>Enter insert</span>
          <span>Esc close</span>
        </div>
      </div>

      {active && (
        <PreviewCard reply={active} values={values} tokens={tokens} side={side} />
      )}
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({
  reply,
  values,
  tokens,
  side,
}: {
  reply: QuickReply;
  values: Record<string, unknown> | null | undefined;
  tokens: ApiToken[];
  side: "right" | "left";
}) {
  const parts = resolveTemplateParts(reply.message, values, tokens);
  const resolved = parts.map((p) => p.text).join("");
  const info = smsInfo(resolved);
  const hasTokens = parts.some((p) => p.kind !== "text");

  return (
    <div
      className="absolute bottom-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 hidden md:block"
      style={{ width: PREVIEW_WIDTH, ...(side === "right" ? { left: "calc(100% + 8px)" } : { right: "calc(100% + 8px)" }) }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preview</div>
      <div className="text-sm font-semibold text-gray-900 mt-1 truncate">{reply.name}</div>
      <div className="mt-2 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
        {parts.map((p, i) =>
          p.kind === "text" ? (
            <span key={i}>{p.text}</span>
          ) : p.kind === "contact" ? (
            <span key={i} title={`{{${p.token}}}`} className="rounded px-0.5 bg-orange-50 text-orange-800">{p.text}</span>
          ) : p.kind === "fallback" ? (
            <span key={i} title={`{{${p.token}}} — fallback`} className="rounded px-0.5 bg-gray-100 text-gray-700 underline decoration-dashed decoration-gray-400 underline-offset-2">{p.text}</span>
          ) : (
            <span key={i} title="No value or fallback — edit before sending" className="rounded px-0.5 bg-red-50 text-red-700 font-mono text-xs">{p.text}</span>
          ),
        )}
      </div>
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className={`text-xs tabular-nums ${info.segments > 1 ? "text-amber-700 font-medium" : "text-gray-500"}`}>
          {info.segments} segment{info.segments > 1 ? "s" : ""} · {info.length} chars
        </span>
        {hasTokens && (
          <span className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-100" />Contact</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200" />Fallback</span>
          </span>
        )}
      </div>
    </div>
  );
}
