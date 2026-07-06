import { useState, useRef } from "react";
import { ChevronDown, Plus, Trash2, Settings2, X } from "lucide-react";
import { BRAND } from "@/utils";
import type { Tag, ApiToken } from "@/types";
import type { PancakeTokenMapping, PancakeManualFieldUpdate, PancakeTokenKey } from "@/services/pancake.service";

// ── Re-exported types ─────────────────────────────────────────────────────────

export interface AdvancedConfig {
  tagsToAdd: string[];
  tagsToRemove: string[];
  tokenMappings: PancakeTokenMapping[];
  manualFieldUpdates: PancakeManualFieldUpdate[];
}

export function emptyAdvanced(): AdvancedConfig {
  return { tagsToAdd: [], tagsToRemove: [], tokenMappings: [], manualFieldUpdates: [] };
}

export function advancedFromTemplate(t: {
  tagsToAdd?: string[];
  tagsToRemove?: string[];
  tokenMappings?: PancakeTokenMapping[];
  manualFieldUpdates?: PancakeManualFieldUpdate[];
}): AdvancedConfig {
  return {
    tagsToAdd:          t.tagsToAdd          ?? [],
    tagsToRemove:       t.tagsToRemove       ?? [],
    tokenMappings:      t.tokenMappings      ?? [],
    manualFieldUpdates: t.manualFieldUpdates ?? [],
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PANCAKE_TOKEN_OPTIONS: { value: PancakeTokenKey; label: string }[] = [
  { value: "order_id",        label: "Order ID"         },
  { value: "tracking_number", label: "Tracking Number"  },
  { value: "cod",             label: "COD Amount"       },
  { value: "first_name",      label: "First Name"       },
  { value: "last_name",       label: "Last Name"        },
  { value: "full_name",       label: "Full Name"        },
  { value: "product",         label: "Product(s)"       },
];

const FIELD_TYPES: { value: PancakeManualFieldUpdate["type"]; label: string }[] = [
  { value: "text",    label: "Text"    },
  { value: "number",  label: "Number"  },
  { value: "decimal", label: "Decimal" },
  { value: "boolean", label: "Boolean" },
  { value: "date",    label: "Date"    },
];

type ManualOperator = NonNullable<PancakeManualFieldUpdate["operator"]>;

const NUMERIC_OPERATORS: { value: ManualOperator; label: string }[] = [
  { value: "upsert",    label: "Set value"           },
  { value: "increment", label: "Add to existing"     },
  { value: "decrement", label: "Subtract from existing" },
];

const TOKEN_MAPPING_OPERATORS: { value: NonNullable<PancakeTokenMapping["operator"]>; label: string }[] = [
  { value: "upsert",    label: "Set value"           },
  { value: "increment", label: "Add to existing"     },
  { value: "decrement", label: "Subtract from existing" },
];

const DATE_OPERATORS: { value: ManualOperator; label: string }[] = [
  { value: "upsert",       label: "Set date"        },
  { value: "add_days",     label: "Add days"        },
  { value: "subtract_days", label: "Subtract days"  },
];

// ── Shared select style ───────────────────────────────────────────────────────

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent appearance-none";
const selectStyle = { "--tw-ring-color": BRAND.primary + "40" } as React.CSSProperties;

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent";

// ── TagChipInput — case-preserving with suggestions ───────────────────────────

function TagChipInput({
  values,
  onChange,
  suggestions,
  placeholder = "Type tag name and press Enter…",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [input, setInput]   = useState("");
  const [open,  setOpen]    = useState(false);
  const inputRef            = useRef<HTMLInputElement>(null);
  const blurTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s)
  );

  const add = (tag: string) => {
    const t = tag.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput("");
  };

  return (
    <div className="relative">
      <div
        onMouseDown={(e) => { if (e.target !== inputRef.current) { e.preventDefault(); if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; } inputRef.current?.focus(); } }}
        className="flex flex-wrap gap-1.5 px-3 py-2 border border-gray-300 rounded-lg min-h-[42px] cursor-text focus-within:ring-2 focus-within:border-transparent"
        style={selectStyle}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
          >
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)); }}
              className="ml-0.5 hover:text-orange-900 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
            if (e.key === "Backspace" && !input && values.length > 0) onChange(values.slice(0, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => { if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; } setOpen(true); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
          placeholder={values.length === 0 ? placeholder : "Add more…"}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden max-h-36 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TokenMappingRow ───────────────────────────────────────────────────────────

function TokenMappingRow({
  row,
  onChange,
  onDelete,
  gabyTokens,
}: {
  row: PancakeTokenMapping;
  onChange: (r: PancakeTokenMapping) => void;
  onDelete: () => void;
  gabyTokens: ApiToken[];
}) {
  const selectedToken = gabyTokens.find((t) => t.key === row.customFieldKey);
  const showOperator  = selectedToken?.type === "number" || selectedToken?.type === "decimal";

  const handleFieldChange = (key: string) => {
    const token     = gabyTokens.find((t) => t.key === key);
    const isNumeric = token?.type === "number" || token?.type === "decimal";
    onChange({ ...row, customFieldKey: key, operator: isNumeric ? (row.operator ?? "upsert") : undefined });
  };

  return (
    <div className={`grid gap-2 items-start ${showOperator ? "grid-cols-[1fr_1fr_1fr_auto]" : "grid-cols-[1fr_1fr_auto]"}`}>
      {/* Pancake token */}
      <select
        value={row.pancakeToken}
        onChange={(e) => onChange({ ...row, pancakeToken: e.target.value as PancakeTokenKey })}
        className={selectCls}
        style={selectStyle}
      >
        {PANCAKE_TOKEN_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Custom field key */}
      {gabyTokens.length > 0 ? (
        <select
          value={row.customFieldKey}
          onChange={(e) => handleFieldChange(e.target.value)}
          className={selectCls}
          style={selectStyle}
        >
          <option value="">Select field…</option>
          {gabyTokens.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={row.customFieldKey}
          onChange={(e) => onChange({ ...row, customFieldKey: e.target.value })}
          placeholder="custom_field_key"
          className={inputCls}
          style={selectStyle}
        />
      )}

      {/* Operator — only for number / decimal fields */}
      {showOperator && (
        <select
          value={row.operator ?? "upsert"}
          onChange={(e) => onChange({ ...row, operator: e.target.value as NonNullable<PancakeTokenMapping["operator"]> })}
          className={selectCls}
          style={selectStyle}
        >
          {TOKEN_MAPPING_OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
        title="Remove row"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── ManualFieldUpdateRow ──────────────────────────────────────────────────────

function ManualFieldUpdateRow({
  row,
  onChange,
  onDelete,
  gabyTokens,
}: {
  row: PancakeManualFieldUpdate;
  onChange: (r: PancakeManualFieldUpdate) => void;
  onDelete: () => void;
  gabyTokens: ApiToken[];
}) {
  const selectedToken = gabyTokens.find((t) => t.key === row.customFieldKey);
  const derivedType   = (selectedToken?.type ?? null) as PancakeManualFieldUpdate["type"] | null;
  const activeType: PancakeManualFieldUpdate["type"] = derivedType ?? row.type;
  const typeIsKnown   = gabyTokens.length > 0 && !!selectedToken;

  const showOperator  = activeType === "number" || activeType === "decimal" || activeType === "date";
  const operatorOpts  = activeType === "date" ? DATE_OPERATORS : NUMERIC_OPERATORS;
  const activeOp      = row.operator ?? "upsert";

  // For date type: "set date" shows date picker; add/subtract days shows integer input
  const isDateOffset  = activeType === "date" && (activeOp === "add_days" || activeOp === "subtract_days");

  const resetForType = (type: PancakeManualFieldUpdate["type"]): Partial<PancakeManualFieldUpdate> => {
    if (type === "boolean")                    return { value: "false",   operator: undefined };
    if (type === "text")                       return { value: "",        operator: undefined };
    if (type === "number" || type === "decimal") return { value: "",      operator: "upsert"  };
    if (type === "date")                       return { value: "",        operator: "upsert"  };
    return {};
  };

  const handleFieldChange = (key: string) => {
    const token   = gabyTokens.find((t) => t.key === key);
    const newType = (token?.type ?? row.type) as PancakeManualFieldUpdate["type"];
    onChange({ ...row, customFieldKey: key, type: newType, ...resetForType(newType) });
  };

  const handleTypeChange = (type: PancakeManualFieldUpdate["type"]) => {
    onChange({ ...row, type, ...resetForType(type) });
  };

  const handleOperatorChange = (op: ManualOperator) => {
    // Switching between date-picker and days-offset resets the value
    const wasOffset = activeOp === "add_days" || activeOp === "subtract_days";
    const nowOffset = op === "add_days" || op === "subtract_days";
    const value     = (wasOffset !== nowOffset) ? "" : row.value;
    onChange({ ...row, operator: op, value });
  };

  const gridCols = showOperator
    ? (typeIsKnown ? "grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start"
                   : "grid grid-cols-[1fr_120px_1fr_1fr_auto] gap-2 items-start")
    : (typeIsKnown ? "grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
                   : "grid grid-cols-[1fr_120px_1fr_auto] gap-2 items-start");

  return (
    <div className={gridCols}>
      {/* Custom field key */}
      {gabyTokens.length > 0 ? (
        <select
          value={row.customFieldKey}
          onChange={(e) => handleFieldChange(e.target.value)}
          className={selectCls}
          style={selectStyle}
        >
          <option value="">Select field…</option>
          {gabyTokens.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={row.customFieldKey}
          onChange={(e) => onChange({ ...row, customFieldKey: e.target.value })}
          placeholder="custom_field_key"
          className={inputCls}
          style={selectStyle}
        />
      )}

      {/* Type — only shown when cannot be derived from the field definition */}
      {!typeIsKnown && (
        <select
          value={row.type}
          onChange={(e) => handleTypeChange(e.target.value as PancakeManualFieldUpdate["type"])}
          className={selectCls}
          style={selectStyle}
        >
          {FIELD_TYPES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Value — shape depends on type + operator */}
      <div>
        {activeType === "boolean" ? (
          <div className="flex items-center gap-2 py-2 px-1">
            <button
              type="button"
              role="switch"
              aria-checked={row.value === "true"}
              onClick={() => onChange({ ...row, value: row.value === "true" ? "false" : "true" })}
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none"
              style={{ backgroundColor: row.value === "true" ? BRAND.primary : "#d1d5db" }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: row.value === "true" ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
            <span className="text-sm text-gray-700 select-none">{row.value === "true" ? "True" : "False"}</span>
          </div>
        ) : activeType === "date" && !isDateOffset ? (
          /* Set date — date picker + Today shortcut */
          <div className="flex gap-1">
            <input
              type={row.value === "today" ? "text" : "date"}
              value={row.value === "today" ? "" : String(row.value)}
              onChange={(e) => onChange({ ...row, value: e.target.value })}
              placeholder="Pick a date"
              disabled={row.value === "today"}
              className={`${inputCls} flex-1`}
              style={selectStyle}
            />
            <button
              type="button"
              onClick={() => onChange({ ...row, value: row.value === "today" ? "" : "today" })}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                row.value === "today"
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
              title="Resolved to today's date at send time"
            >
              Today
            </button>
          </div>
        ) : (
          /* text / number / decimal / date-offset — plain input */
          <input
            type="text"
            inputMode={activeType === "number" || activeType === "decimal" || activeType === "date" ? "decimal" : undefined}
            value={String(row.value)}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            placeholder={isDateOffset ? "Number of days" : "Value"}
            className={inputCls}
            style={selectStyle}
          />
        )}
      </div>

      {/* Operator — only for number / decimal / date */}
      {showOperator && (
        <select
          value={activeOp}
          onChange={(e) => handleOperatorChange(e.target.value as ManualOperator)}
          className={selectCls}
          style={selectStyle}
        >
          {operatorOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
        title="Remove row"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── AdvancedSection ───────────────────────────────────────────────────────────

interface AdvancedSectionProps {
  value: AdvancedConfig;
  onChange: (v: AdvancedConfig) => void;
  gabyTags: Tag[];
  gabyTokens: ApiToken[];
}

export function AdvancedSection({ value, onChange, gabyTags, gabyTokens }: AdvancedSectionProps) {
  const hasData =
    value.tagsToAdd.length > 0 ||
    value.tagsToRemove.length > 0 ||
    value.tokenMappings.length > 0 ||
    value.manualFieldUpdates.length > 0;

  const [open, setOpen] = useState(hasData);

  const tagSuggestions = gabyTags.map((t) => t.name);

  const addTokenMapping = () =>
    onChange({
      ...value,
      tokenMappings: [
        ...value.tokenMappings,
        { pancakeToken: "order_id", customFieldKey: "" },
      ],
    });

  const addManualUpdate = () =>
    onChange({
      ...value,
      manualFieldUpdates: [
        ...value.manualFieldUpdates,
        { customFieldKey: "", type: "text", value: "", operator: "upsert" },
      ],
    });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Advanced options</span>
          {hasData && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: BRAND.primary }}
            >
              {value.tagsToAdd.length + value.tagsToRemove.length + value.tokenMappings.length + value.manualFieldUpdates.length}
            </span>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5">

          {/* ── Section 1: Contact Tags ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Tags</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Add Tags</label>
                <TagChipInput
                  values={value.tagsToAdd}
                  onChange={(v) => onChange({ ...value, tagsToAdd: v })}
                  suggestions={tagSuggestions}
                  placeholder="Tag to add…"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Remove Tags</label>
                <TagChipInput
                  values={value.tagsToRemove}
                  onChange={(v) => onChange({ ...value, tagsToRemove: v })}
                  suggestions={tagSuggestions}
                  placeholder="Tag to remove…"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Token Mappings ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Token Mappings <span className="font-normal normal-case">(Pancake → Custom Field)</span>
            </h4>


            <div className="space-y-2">
              {value.tokenMappings.map((row, i) => (
                <TokenMappingRow
                  key={i}
                  row={row}
                  onChange={(r) =>
                    onChange({
                      ...value,
                      tokenMappings: value.tokenMappings.map((x, j) => j === i ? r : x),
                    })
                  }
                  onDelete={() =>
                    onChange({
                      ...value,
                      tokenMappings: value.tokenMappings.filter((_, j) => j !== i),
                    })
                  }
                  gabyTokens={gabyTokens}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addTokenMapping}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add mapping
            </button>
          </div>

          {/* ── Section 3: Manual Field Updates ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Manual Field Updates</h4>


            <div className="space-y-2">
              {value.manualFieldUpdates.map((row, i) => (
                <ManualFieldUpdateRow
                  key={i}
                  row={row}
                  onChange={(r) =>
                    onChange({
                      ...value,
                      manualFieldUpdates: value.manualFieldUpdates.map((x, j) => j === i ? r : x),
                    })
                  }
                  onDelete={() =>
                    onChange({
                      ...value,
                      manualFieldUpdates: value.manualFieldUpdates.filter((_, j) => j !== i),
                    })
                  }
                  gabyTokens={gabyTokens}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addManualUpdate}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add update
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
