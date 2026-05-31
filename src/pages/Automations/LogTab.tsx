import { useState } from "react";
import {
  ChevronLeft, ChevronRight, RotateCcw,
  AlertTriangle, ClipboardList,
} from "lucide-react";
import { useAutomationLog } from "@/hooks/useAutomationLog";
import { TriggerBadge, ActionChips } from "./AutomationAtoms";
import { formatDateTime, formatRelativeTime } from "@/utils/formatters";
import type { AutomationRule, TriggerType, AutomationLogResult } from "@/types";
import type { Tag } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface LogTabProps {
  rules: AutomationRule[];
  tags:  Tag[];
}

// ── Result badge ──────────────────────────────────────────────────────────────

const RESULT_META: Record<
  AutomationLogResult,
  { cls: string; dot: string; label: string }
> = {
  SUCCESS: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Success" },
  PARTIAL: { cls: "bg-amber-50  text-amber-700  border-amber-200",    dot: "bg-amber-500",   label: "Partial" },
  FAILED:  { cls: "bg-red-50    text-red-700    border-red-200",       dot: "bg-red-500",     label: "Failed"  },
};

function ResultBadge({ result }: { result: AutomationLogResult }) {
  const { cls, dot, label } = RESULT_META[result];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ── Shared select class ───────────────────────────────────────────────────────

const SEL = [
  "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none",
  "focus:border-[#FF692E] focus:ring-2 focus:ring-[#FF692E]/20 transition-colors",
].join(" ");

// ── LogTab ────────────────────────────────────────────────────────────────────

const LIMIT = 20;

export function LogTab({ rules, tags }: LogTabProps) {
  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterRuleId,  setFilterRuleId]  = useState("");
  const [filterTrigger, setFilterTrigger] = useState<TriggerType | "">("");
  const [filterResult,  setFilterResult]  = useState<AutomationLogResult | "">("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");
  const [page,          setPage]          = useState(1);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { entries, meta, loading, error, refetch } = useAutomationLog({
    ruleId:      filterRuleId   || undefined,
    triggerType: (filterTrigger as TriggerType)       || undefined,
    result:      (filterResult  as AutomationLogResult) || undefined,
    from:        filterFrom     || undefined,
    to:          filterTo       || undefined,
    page,
    limit: LIMIT,
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function resetPage() { setPage(1); }

  function clearFilters() {
    setFilterRuleId("");
    setFilterTrigger("");
    setFilterResult("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  }

  const hasFilters = !!(filterRuleId || filterTrigger || filterResult || filterFrom || filterTo);
  const totalPages = meta?.totalPages ?? 1;
  const total      = meta?.total      ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Rule */}
        <select
          value={filterRuleId}
          onChange={(e) => { setFilterRuleId(e.target.value); resetPage(); }}
          className={SEL}
        >
          <option value="">All Rules</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {/* Trigger */}
        <select
          value={filterTrigger}
          onChange={(e) => { setFilterTrigger(e.target.value as TriggerType | ""); resetPage(); }}
          className={SEL}
        >
          <option value="">All Triggers</option>
          <option value="INBOUND_MESSAGE">Inbound Message</option>
          <option value="TOKEN_UPDATED">Token Updated</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>

        {/* Result */}
        <select
          value={filterResult}
          onChange={(e) => { setFilterResult(e.target.value as AutomationLogResult | ""); resetPage(); }}
          className={SEL}
        >
          <option value="">All Results</option>
          <option value="SUCCESS">Success</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); resetPage(); }}
            className={SEL}
            title="From date"
          />
          <span className="text-xs text-gray-400 shrink-0">→</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); resetPage(); }}
            className={SEL}
            title="To date"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        {/* Count badge */}
        {!loading && !error && meta && (
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={refetch}
            className="ml-auto text-xs text-red-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Rule
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Trigger
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Actions Taken
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Result
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* ── Loading skeleton ── */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3.5"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 w-28 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 w-36 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 w-32 bg-gray-100 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 w-44 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
                </tr>
              ))}

              {/* ── Empty state ── */}
              {!loading && !error && entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          {hasFilters ? "No entries match your filters" : "No automation log entries yet"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {hasFilters
                            ? "Try adjusting or clearing the filters above."
                            : "Log entries will appear here once your rules start firing."}
                        </p>
                      </div>
                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-xs text-[#FF692E] hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Entries ── */}
              {!loading && entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors">

                  {/* Time */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className="text-sm text-gray-700 cursor-default"
                      title={formatDateTime(entry.firedAt)}
                    >
                      {formatRelativeTime(entry.firedAt)}
                    </span>
                  </td>

                  {/* Contact phone */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      {entry.contactPhone}
                    </span>
                  </td>

                  {/* Rule name */}
                  <td className="px-4 py-3.5 max-w-[180px]">
                    <span
                      className="text-sm text-gray-800 font-medium truncate block"
                      title={entry.ruleName}
                    >
                      {entry.ruleName}
                    </span>
                  </td>

                  {/* Trigger */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <TriggerBadge trigger={entry.triggerType} />
                  </td>

                  {/* Actions taken */}
                  <td className="px-4 py-3.5">
                    {entry.actionsTaken.length > 0 ? (
                      <ActionChips actions={entry.actionsTaken} tags={tags} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Result + optional error */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <ResultBadge result={entry.result} />
                      {entry.errorMessage && (
                        <p
                          className="text-xs text-red-500 max-w-[200px] truncate"
                          title={entry.errorMessage}
                        >
                          {entry.errorMessage}
                        </p>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && meta && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">{totalPages}</span>
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
