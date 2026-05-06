import { useState, useEffect, useRef } from "react";
import { Columns3 } from "lucide-react";
import { BRAND } from "@/utils";
import { useTokens } from "@/hooks";

interface ColumnVisibilityMenuProps {
  visibleCustomCols: string[];
  setVisibleCustomCols: React.Dispatch<React.SetStateAction<string[]>>;
}

export function ColumnVisibilityMenu({
  visibleCustomCols,
  setVisibleCustomCols,
}: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { tokens } = useTokens();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (key: string) => {
    setVisibleCustomCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Columns3 className="w-4 h-4" />
        Columns
        {visibleCustomCols.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold">
            +{visibleCustomCols.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-30 overflow-hidden">
          {/* Default columns header */}
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Default columns
            </div>
          </div>
          <div className="px-4 py-2 text-xs text-gray-400">
            Name, Phone, Tags, Status (always shown)
          </div>

          {/* Custom fields header */}
          <div className="px-4 py-2.5 border-y border-gray-100 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Custom fields
            </div>
            <a
              href="#"
              className="text-[11px] hover:underline"
              style={{ color: BRAND.primary }}
            >
              Manage
            </a>
          </div>

          {/* Token list */}
          <div className="max-h-64 overflow-y-auto">
            {tokens.map((t) => (
              <label
                key={t.key}
                className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleCustomCols.includes(t.key)}
                  onChange={() => toggle(t.key)}
                  style={{ accentColor: BRAND.primary }}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">{t.label}</div>
                  <div className="text-[11px] text-gray-400 font-mono truncate">{`{{${t.key}}}`}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
