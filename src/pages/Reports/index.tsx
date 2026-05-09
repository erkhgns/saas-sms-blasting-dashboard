import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import {
  Calendar, Download, RefreshCw, ChevronLeft, ChevronRight,
  Cpu, AlertTriangle, Info, XCircle, ChevronDown, Check, MessageSquare,
  BarChart2,
} from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND, formatNumber } from "@/utils";
import { useDeviceLogs, useReports } from "@/hooks";
import type {
  LogLevel, LogEvent,
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

// ─── Level badge ─────────────────────────────────────────────────────────────
const LEVEL_META: Record<LogLevel, { label: string; icon: React.ReactNode; cls: string }> = {
  INFO:  { label: "INFO",  icon: <Info          className="w-3 h-3" />, cls: "bg-blue-50  text-blue-700  border-blue-200"  },
  WARN:  { label: "WARN",  icon: <AlertTriangle className="w-3 h-3" />, cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ERROR: { label: "ERROR", icon: <XCircle       className="w-3 h-3" />, cls: "bg-red-50   text-red-700   border-red-200"   },
};

function LevelBadge({ level }: { level: LogLevel }) {
  const m = LEVEL_META[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

// ─── Event tag ───────────────────────────────────────────────────────────────
const EVENT_COLORS: Record<LogEvent, string> = {
  BOOT:     "bg-purple-50 text-purple-700 border-purple-200",
  WIFI:     "bg-sky-50    text-sky-700    border-sky-200",
  MODEM:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  OUTBOUND: "bg-orange-50 text-orange-700 border-orange-200",
  INBOUND:  "bg-teal-50   text-teal-700   border-teal-200",
  PATCH:    "bg-red-50    text-red-700    border-red-200",
  HEAP:     "bg-gray-50   text-gray-600   border-gray-200",
  RESTART:  "bg-yellow-50 text-yellow-700 border-yellow-200",
};

function EventTag({ event }: { event: LogEvent }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${EVENT_COLORS[event]}`}>
      {event}
    </span>
  );
}

// ─── Timestamp ───────────────────────────────────────────────────────────────
function formatLogTs(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

// ─── Log filter options ───────────────────────────────────────────────────────
const LOG_LEVELS: Array<LogLevel | ""> = ["", "INFO", "WARN", "ERROR"];
const LOG_EVENTS: Array<LogEvent | ""> = [
  "", "BOOT", "WIFI", "MODEM", "OUTBOUND", "INBOUND", "PATCH", "HEAP", "RESTART",
];

const POLL_OPTIONS = [
  { label: "Off",   value: 0     },
  { label: "5 s",   value: 5000  },
  { label: "15 s",  value: 15000 },
  { label: "30 s",  value: 30000 },
];

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
    {
      label:    "Avg. Send Time",
      value:    s ? `${(s.avgSendTimeMs / 1000).toFixed(1)}s` : "N/A",
      sub:      s ? `per SMS · ~${formatNumber(s.throughputPerHour)}/hr` : "No data for this period",
      subColor: s ? "text-gray-600"  : "text-gray-400",
    },
  ];

  // ── System Logs ──────────────────────────────────────────────────────────
  const [logPage,  setLogPage]  = useState(1);
  const [logLevel, setLogLevel] = useState<LogLevel | "">("");
  const [logEvent, setLogEvent] = useState<LogEvent | "">("");
  const [pollMs,   setPollMs]   = useState(0);

  const { logs, meta, loading, error, refetch } = useDeviceLogs({
    page:  logPage,
    limit: 50,
    level: logLevel || undefined,
    event: logEvent || undefined,
    pollMs,
  });

  const handleLevelChange = (v: string) => { setLogLevel(v as LogLevel | ""); setLogPage(1); };
  const handleEventChange = (v: string) => { setLogEvent(v as LogEvent | ""); setLogPage(1); };

  const selectCls = "px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none";

  return (
    <div className="p-8">
      <PageHeader
        title="Reports"
        subtitle="Analytics and device diagnostics for your SMS system"
        actions={
          <>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <PrimaryButton>
              <Download className="w-5 h-5" />
              Export
            </PrimaryButton>
          </>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6 mb-8">
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
                <div className="grid grid-cols-[1fr_1px_1fr] divide-x divide-gray-100">
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

                  <div className="bg-gray-100" />

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

      {/* ── System Logs ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 leading-none">System Logs</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time logs from the ESP32 device
                {meta && (
                  <span className="ml-1 font-medium text-gray-700">
                    — {formatNumber(meta.total)} entr{meta.total === 1 ? "y" : "ies"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={logLevel} onChange={(e) => handleLevelChange(e.target.value)} className={selectCls} style={{ outline: "none" }}>
              <option value="">All levels</option>
              {LOG_LEVELS.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={logEvent} onChange={(e) => handleEventChange(e.target.value)} className={selectCls} style={{ outline: "none" }}>
              <option value="">All events</option>
              {LOG_EVENTS.filter(Boolean).map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={pollMs} onChange={(e) => setPollMs(Number(e.target.value))} className={selectCls} style={{ outline: "none" }} title="Auto-refresh interval">
              {POLL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label === "Off" ? "Auto-refresh: Off" : `Refresh: ${o.label}`}
                </option>
              ))}
            </select>
            <button onClick={refetch} disabled={loading} title="Refresh now" className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[48, 16, 20, 64].map((w, j) => (
                      <td key={j} className="px-6 py-3.5">
                        <div className={`h-3.5 bg-gray-100 rounded animate-pulse w-${w}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-400 text-sm font-sans">
                    <Cpu className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No log entries found
                    {(logLevel || logEvent) && (
                      <span className="block text-xs mt-1">Try clearing the filters</span>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`transition-colors ${
                      log.level === "ERROR"
                        ? "bg-red-50/40 hover:bg-red-50"
                        : log.level === "WARN"
                        ? "bg-yellow-50/30 hover:bg-yellow-50/60"
                        : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="px-6 py-3 text-[12px] text-gray-500 whitespace-nowrap">{formatLogTs(log.createdAt)}</td>
                    <td className="px-6 py-3 font-sans"><LevelBadge level={log.level} /></td>
                    <td className="px-6 py-3 font-sans"><EventTag event={log.event as LogEvent} /></td>
                    <td className="px-6 py-3 text-[12px] text-gray-800 break-all">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages}
              <span className="ml-2 text-gray-400">
                ({formatNumber((meta.page - 1) * meta.limit + 1)}–
                {formatNumber(Math.min(meta.page * meta.limit, meta.total))} of {formatNumber(meta.total)})
              </span>
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setLogPage((p) => p - 1)}
                disabled={meta.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                onClick={() => setLogPage((p) => p + 1)}
                disabled={meta.page >= meta.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: BRAND.primary }}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
