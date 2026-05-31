import { X } from "lucide-react";
import { operatorsForType, valueKindForOperator } from "./drawerUtils";
import type { ConditionFormRow } from "@/types";
import type { ApiToken, Tag, TokenDataType } from "@/types";

interface ConditionRowProps {
  row: ConditionFormRow;
  tokens: ApiToken[];
  tags: Tag[];
  onChange: (updated: ConditionFormRow) => void;
  onRemove: () => void;
  errors: { subject?: string; op?: string; value?: string };
  index: number;
}

const selectCls = (hasErr: boolean) =>
  `w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none transition-colors focus:ring-2 ${
    hasErr
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
  }`;

const inputCls = (hasErr: boolean) =>
  `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors focus:ring-2 ${
    hasErr
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-gray-300 focus:border-[#FF692E] focus:ring-[#FF692E]/20"
  }`;

export function ConditionRow({
  row,
  tokens,
  tags,
  onChange,
  onRemove,
  errors,
  index,
}: ConditionRowProps) {
  // ── Subject selection ────────────────────────────────────────────────────
  function handleSubjectChange(subjectValue: string) {
    if (subjectValue === "") {
      onChange({ ...row, subjectType: null, tokenKey: null, tagId: null, operator: null, value: "" });
      return;
    }
    if (subjectValue.startsWith("TAG:")) {
      const tagId = subjectValue.slice(4);
      onChange({ ...row, subjectType: "TAG", tagId, tokenKey: null, operator: "HAS_TAG", value: "" });
    } else {
      // TOKEN:<key>
      const tokenKey = subjectValue.slice(6);
      onChange({ ...row, subjectType: "TOKEN", tokenKey, tagId: null, operator: null, value: "" });
    }
  }

  // Current subject value for the select
  function currentSubjectValue(): string {
    if (row.subjectType === "TAG" && row.tagId)     return `TAG:${row.tagId}`;
    if (row.subjectType === "TOKEN" && row.tokenKey) return `TOKEN:${row.tokenKey}`;
    return "";
  }

  // Token type for the selected token
  function currentTokenType(): TokenDataType {
    if (!row.tokenKey) return "text";
    return tokens.find((t) => t.key === row.tokenKey)?.type ?? "text";
  }

  // Operator options
  const subjectKind = row.subjectType === "TAG" ? "tag" : currentTokenType();
  const operatorOptions = operatorsForType(subjectKind);

  // Value kind
  const vk = row.operator
    ? valueKindForOperator(subjectKind, row.operator)
    : "text";
  const needsValue = vk !== "none";
  const isTagRow   = row.subjectType === "TAG";

  return (
    <div data-error-field={`cond_${index}`}>
      {/* Row layout: [Subject] [Operator] [Value?] [Remove] */}
      <div className={`flex items-start gap-2 ${isTagRow ? "" : ""}`}>
        {/* Subject */}
        <div className="flex-1 min-w-0">
          <select
            value={currentSubjectValue()}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className={selectCls(!!errors.subject)}
          >
            <option value="">Select subject…</option>
            {tokens.length > 0 && (
              <optgroup label="TOKENS">
                {tokens.map((t) => (
                  <option key={t.key} value={`TOKEN:${t.key}`}>
                    {t.label} ({t.type ?? "text"})
                  </option>
                ))}
              </optgroup>
            )}
            {tags.length > 0 && (
              <optgroup label="TAGS">
                {tags.map((tag) => (
                  <option key={tag.id} value={`TAG:${tag.id}`}>
                    ● {tag.name}
                  </option>
                ))}
              </optgroup>
            )}
            {tokens.length === 0 && tags.length === 0 && (
              <option disabled>No tokens or tags defined yet. Add them in Settings.</option>
            )}
          </select>
          {errors.subject && (
            <p className="text-xs text-red-600 mt-1">{errors.subject}</p>
          )}
        </div>

        {/* Operator */}
        <div className={isTagRow ? "flex-1 min-w-0" : "w-44 shrink-0"}>
          <select
            value={row.operator ?? ""}
            onChange={(e) =>
              onChange({ ...row, operator: e.target.value || null, value: "" })
            }
            disabled={!row.subjectType}
            className={selectCls(!!errors.op)}
          >
            <option value="">Operator…</option>
            {operatorOptions.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          {errors.op && (
            <p className="text-xs text-red-600 mt-1">{errors.op}</p>
          )}
        </div>

        {/* Value input (hidden for tag rows or no-value operators) */}
        {!isTagRow && (
          <div className="w-44 shrink-0">
            {needsValue ? (
              <>
                {vk === "date" ? (
                  <input
                    type="date"
                    value={row.value}
                    onChange={(e) => onChange({ ...row, value: e.target.value })}
                    disabled={!row.operator}
                    className={inputCls(!!errors.value)}
                  />
                ) : vk === "days" ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={row.value}
                      onChange={(e) => onChange({ ...row, value: e.target.value })}
                      disabled={!row.operator}
                      placeholder="0"
                      className={inputCls(!!errors.value) + " w-20 shrink-0"}
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">days</span>
                  </div>
                ) : vk === "number" ? (
                  <input
                    type="number"
                    value={row.value}
                    onChange={(e) => onChange({ ...row, value: e.target.value })}
                    disabled={!row.operator}
                    placeholder="0"
                    className={inputCls(!!errors.value)}
                  />
                ) : vk === "decimal" ? (
                  <input
                    type="number"
                    step="0.01"
                    value={row.value}
                    onChange={(e) => onChange({ ...row, value: e.target.value })}
                    disabled={!row.operator}
                    placeholder="0.00"
                    className={inputCls(!!errors.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => onChange({ ...row, value: e.target.value })}
                    disabled={!row.operator}
                    placeholder="Value…"
                    className={inputCls(!!errors.value)}
                  />
                )}
                {errors.value && (
                  <p className="text-xs text-red-600 mt-1">{errors.value}</p>
                )}
              </>
            ) : (
              /* Spacer so layout stays consistent */
              <div className="h-9" />
            )}
          </div>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
          title="Remove condition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
