import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Calendar, Info, ChevronDown, Check, MessageSquare, BarChart2,
} from "lucide-react";
import { PageHeader } from "@/components/common";
import { BRAND, formatNumber } from "@/utils";
import { useReports } from "@/hooks";
import type {
  ReportDateRange, ReportDatePreset,
  CampaignReportStatus,
} from "@/types";

// ─── Chart style ──────────────────────────────────────────────────────────────
const CHART_STYLE = {
  contentStyle: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" },
  labelStyle:   { color: "#374151", fontWeight: 600 },
};

const DEFAULT_DOT_COLOR = "#d1d5db";

// ─── Campaign status badge colours ───────────────────────────────────────────
const STATUS_STYLE: Record<CampaignReportStatus, string> = {
  Sent:          "bg-green-50  text-green-700  border-green-200",
  "In Progress": "bg-blue-50   text-blue-700   border-blue-200",
  Failed:        "bg-red-50    text-red-700    border-red-200",
};

// ─── Date range picker ────────────────────────────────────────────────────────
type DateRangeValue = ReportDateRange;

const PRESET_OPTIONS: { value: ReportDatePreset; label: string }[] = [
  { value: "today",     label: "Today"        },
  { value: "yesterday", label: "Yesterday"    },
  { value: "last7",     label: "Last 7 Days"  },
  { value: "last30",    label: "Last 30 Days" },
];

function formatCustomLabel(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  return "Custom Range";
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const openCustom = () => {
    if (value.type === "custom") {
      setCustomFrom(value.from);
      setCustomTo(value.to);
    } else {
      setCustomFrom("");
      setCustomTo("");
    }
    setShowCustom(true);
  };

  useEffect(() => {
    if (!open) { setShowCustom(false); return; }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange({ type: "custom", from: customFrom, to: customTo });
    setOpen(false);
  };

  const triggerLabel =
    value.type === "preset"
      ? PRESET_OPTIONS.find((o) => o.value === value.preset)!.label
      : formatCustomLabel(value.from, value.to);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors bg-white"
      >
        <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="font-medium text-sm">{triggerLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
          {!showCustom ? (
            <>
              {PRESET_OPTIONS.map((opt) => {
                const active = value.type === "preset" && value.preset === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange({ type: "preset", preset: opt.value }); setOpen(false); }}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-orange-50 transition-colors"
                    style={active ? { color: "#FF692E" } : { color: "#374151" }}
                  >
                    {opt.label}
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  type="button"
                  onClick={openCustom}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-orange-50 transition-colors"
                  style={value.type === "custom" ? { color: "#FF692E" } : { color: "#374151" }}
                >
                  Custom Range
                  {value.type === "custom"
                    ? <Check className="w-4 h-4 shrink-0" />
                    : <ChevronDown className="w-4 h-4 shrink-0 -rotate-90 text-gray-400" />
                  }
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 space-y-3">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-1"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                Back
              </button>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">From</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#FF692E" }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state for charts / tables ─────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <BarChart2 className="w-8 h-8 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Reports page ─────────────────────────────────────────────────────────────
export function Reports() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({ type: "preset", preset: "last7" });

  const report = useReports(dateRange);

  // ── Summary cards ────────────────────────────────────────────────────────
  const s = report.summary;
  const deliveryRatePct = s && s.totalSent > 0
    ? ((s.totalDelivered / s.totalSent) * 100).toFixed(1)
    : "0.0";
  const failureRatePct = s && s.totalSent > 0
    ? ((s.totalFailed / s.totalSent) * 100).toFixed(1)
    : "0.0";

  const summaryCards = [
    {
      label:    "Total Sent",
      value:    s ? formatNumber(s.totalSent)      : "0",
      sub:      s ? `${deliveryRatePct}% delivery rate` : "No data for this period",
      subColor: s ? "text-green-600" : "text-gray-400",
    },
    {
      label:    "Total Delivered",
      value:    s ? formatNumber(s.totalDelivered) : "0",
      sub:      s ? `${deliveryRatePct}% delivery rate` : "No data for this period",
      subColor: s ? "text-green-600" : "text-gray-400",
    },
    {
      label:    "Total Failed",
      value:    s ? formatNumber(s.totalFailed)    : "0",
      sub:      s ? `${failureRatePct}% failure rate`   : "No data for this period",
      subColor: s ? "text-red-600"   : "text-gray-400",
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Reports"
        subtitle="Analytics and device diagnostics for your SMS system"
        actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">{card.label}</div>
            <div className={`text-3xl font-semibold text-gray-900 ${report.loading ? "animate-pulse text-gray-300" : ""}`}>
              {card.value}
            </div>
            <div className={`text-sm mt-2 ${card.subColor}`}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Sent vs Delivered ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Sent vs Delivered</h2>
        {report.deliveryTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.deliveryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip {...CHART_STYLE} />
              <Legend />
              <Bar dataKey="sent"      fill={BRAND.primary} name="Sent"      radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" fill="#FCD34D"        name="Delivered" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No delivery data for this period" />
        )}
      </div>

      {/* ── Failure Rate ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Failure Rate</h2>
        {report.failureTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.failureTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date"  stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip {...CHART_STYLE} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 4 }}
                name="Failure Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No failure data for this period" />
        )}
      </div>

      {/* ── Campaign Performance ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
            <p className="text-sm text-gray-500 mt-0.5">Delivery results broken down by campaign</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {report.campaignPerformance.length} campaigns
          </span>
        </div>

        {report.campaignPerformance.length === 0 ? (
          <EmptyState message="No campaigns found for this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Campaign", "Status", "Date", "Recipients", "Delivered", "Failed", "Delivery Rate"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.campaignPerformance.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {row.sentAt}
                    </td>
                    <td className="px-6 py-4 text-gray-700 tabular-nums">
                      {formatNumber(row.recipients)}
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      <span className={row.delivered > 0 ? "text-green-700 font-medium" : "text-gray-400"}>
                        {row.delivered > 0 ? formatNumber(row.delivered) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      <span className={row.failed > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                        {row.failed > 0 ? formatNumber(row.failed) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.status === "Sent" ? (
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.deliveryRate}%`,
                                backgroundColor: row.deliveryRate >= 98 ? "#16a34a" : row.deliveryRate >= 95 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-semibold tabular-nums w-10 shrink-0"
                            style={{
                              color: row.deliveryRate >= 98 ? "#15803d" : row.deliveryRate >= 95 ? "#b45309" : "#dc2626",
                            }}
                          >
                            {row.deliveryRate.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total (sent only)
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-900 tabular-nums">
                    {formatNumber(report.campaignPerformance.filter(r => r.status === "Sent").reduce((a, r) => a + r.recipients, 0))}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-green-700 tabular-nums">
                    {formatNumber(report.campaignPerformance.filter(r => r.status === "Sent").reduce((a, r) => a + r.delivered, 0))}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-red-600 tabular-nums">
                    {formatNumber(report.campaignPerformance.filter(r => r.status === "Sent").reduce((a, r) => a + r.failed, 0))}
                  </td>
                  <td className="px-6 py-3.5">
                    {(() => {
                      const sent = report.campaignPerformance.filter(r => r.status === "Sent");
                      const totalRecipients = sent.reduce((a, r) => a + r.recipients, 0);
                      const totalDelivered  = sent.reduce((a, r) => a + r.delivered,  0);
                      const avg = totalRecipients > 0 ? (totalDelivered / totalRecipients) * 100 : 0;
                      return (
                        <span className="text-sm font-semibold" style={{ color: avg >= 98 ? "#15803d" : "#b45309" }}>
                          {avg.toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Tag Reply Report ──────────────────────────────────────────────── */}
      {(() => {
        const rows           = report.tagReplies?.rows ?? [];
        const unknownReplies = report.tagReplies?.unknownNumberReplies ?? 0;
        const chartRows      = [...rows].sort((a, b) => b.replyRate - a.replyRate);
        const totalReplies   = rows.reduce((a, r) => a + r.totalReplies, 0) + unknownReplies;
        const avgRate        = rows.length > 0
          ? rows.reduce((a, r) => a + r.replyRate, 0) / rows.length
          : 0;

        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND.primaryLight }}>
                    <MessageSquare className="w-4 h-4" style={{ color: BRAND.primary }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-none">Tag Reply Report</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Reply engagement broken down by contact tag</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total replies</div>
                    <div className="text-sm font-semibold text-gray-900">{formatNumber(totalReplies)}</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Avg. reply rate</div>
                    <div className="text-sm font-semibold" style={{ color: BRAND.primary }}>
                      {avgRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState message="No tag reply data for this period" />
            ) : (
              <>
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] divide-x divide-gray-100">
                  {/* Reply Rate */}
                  <div className="p-6">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Reply Rate by Tag
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false}
                        />
                        <YAxis
                          type="category" dataKey="tag"
                          stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={110}
                        />
                        <Tooltip {...CHART_STYLE} formatter={(v: number) => [`${v.toFixed(1)}%`, "Reply Rate"]} />
                        <Bar dataKey="replyRate" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {chartRows.map((row) => (
                            <Cell key={row.tag} fill={row.color ?? DEFAULT_DOT_COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gray-100 hidden lg:block" />

                  {/* Total Replies */}
                  <div className="p-6">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      Total Replies by Tag
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                        <XAxis
                          type="number"
                          stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false}
                        />
                        <YAxis
                          type="category" dataKey="tag"
                          stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={110}
                        />
                        <Tooltip {...CHART_STYLE} formatter={(v: number) => [formatNumber(v), "Replies"]} />
                        <Bar dataKey="totalReplies" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {chartRows.map((row) => (
                            <Cell key={row.tag} fill={row.color ?? DEFAULT_DOT_COLOR} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Breakdown table */}
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Tag", "Contacts", "Campaigns Sent", "Total Replies", "Known", "Unknown", "Reply Rate", "Avg. Replies / Campaign"].map((h) => (
                          <th key={h} className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <tr key={row.tag} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                style={{ backgroundColor: row.color ?? DEFAULT_DOT_COLOR }}
                              />
                              <span className="font-medium text-gray-900">{row.tag}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 tabular-nums">{formatNumber(row.contacts)}</td>
                          <td className="px-6 py-4 text-gray-600 tabular-nums">{row.campaignsSent}</td>
                          <td className="px-6 py-4 font-medium text-gray-900 tabular-nums">{formatNumber(row.totalReplies)}</td>
                          <td className="px-6 py-4 tabular-nums">
                            <span className="text-green-700 font-medium">{formatNumber(row.knownReplies ?? 0)}</span>
                          </td>
                          <td className="px-6 py-4 tabular-nums">
                            {(row.unknownReplies ?? 0) > 0
                              ? <span className="text-orange-600 font-medium">{formatNumber(row.unknownReplies!)}</span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 min-w-[130px]">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${row.replyRate}%`, backgroundColor: row.color ?? DEFAULT_DOT_COLOR }}
                                />
                              </div>
                              <span
                                className="text-xs font-semibold tabular-nums w-10 shrink-0"
                                style={{ color: row.replyRate >= 50 ? "#15803d" : row.replyRate >= 25 ? "#b45309" : "#6b7280" }}
                              >
                                {row.replyRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 tabular-nums">{row.avgRepliesPerCampaign.toFixed(1)}</td>
                        </tr>
                      ))}

                      {/* Unknown Numbers row */}
                      {unknownReplies > 0 && (
                        <tr className="bg-orange-50/40 border-t border-dashed border-orange-200 hover:bg-orange-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 bg-gray-400" />
                              <span className="font-medium text-gray-500 italic">Unknown Numbers</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs">Not saved</td>
                          <td className="px-6 py-4 text-gray-400">—</td>
                          <td className="px-6 py-4 font-medium text-gray-700 tabular-nums">{formatNumber(unknownReplies)}</td>
                          <td className="px-6 py-4 text-gray-400">—</td>
                          <td className="px-6 py-4 tabular-nums">
                            <span className="text-orange-600 font-semibold">{formatNumber(unknownReplies)}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">—</td>
                          <td className="px-6 py-4 text-gray-400">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Insight footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-orange-50/40 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Tags with higher reply rates are more engaged — consider sending to them more frequently or with
                    more personalized content. Tags with low reply rates may benefit from a re-engagement campaign
                    before your next blast.
                  </p>
                </div>
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
}
