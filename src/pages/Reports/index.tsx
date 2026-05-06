import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Calendar, Download, RefreshCw, ChevronLeft, ChevronRight,
  Cpu, AlertTriangle, Info, XCircle,
} from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/common";
import { BRAND, formatNumber } from "@/utils";
import { useDeviceLogs } from "@/hooks";
import type { LogLevel, LogEvent } from "@/types";

// ─── Static chart data (kept as-is until a real /reports endpoint exists) ──────
const deliveryData = [
  { date: "Apr 18", sent: 4200, delivered: 4150 },
  { date: "Apr 19", sent: 3800, delivered: 3750 },
  { date: "Apr 20", sent: 5100, delivered: 5040 },
  { date: "Apr 21", sent: 4600, delivered: 4550 },
  { date: "Apr 22", sent: 6200, delivered: 6130 },
  { date: "Apr 23", sent: 5800, delivered: 5720 },
  { date: "Apr 24", sent: 4100, delivered: 4050 },
];

const failureData = [
  { date: "Apr 18", rate: 1.2 },
  { date: "Apr 19", rate: 1.3 },
  { date: "Apr 20", rate: 1.2 },
  { date: "Apr 21", rate: 1.1 },
  { date: "Apr 22", rate: 1.1 },
  { date: "Apr 23", rate: 1.4 },
  { date: "Apr 24", rate: 1.2 },
];

const summary = [
  { label: "Total Sent",      value: "33,800", sub: "+15.3% vs last week",  subColor: "text-green-600" },
  { label: "Total Delivered", value: "33,390", sub: "98.8% delivery rate",  subColor: "text-green-600" },
  { label: "Total Failed",    value: "410",    sub: "1.2% failure rate",    subColor: "text-red-600"   },
  { label: "Credits Used",    value: "33,800", sub: "12,450 remaining",     subColor: "text-gray-600"  },
];

const CHART_STYLE = {
  contentStyle: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" },
  labelStyle:   { color: "#374151", fontWeight: 600 },
};

// ─── Level badge ─────────────────────────────────────────────────────────────
const LEVEL_META: Record<LogLevel, { label: string; icon: React.ReactNode; cls: string }> = {
  INFO:  { label: "INFO",  icon: <Info       className="w-3 h-3" />, cls: "bg-blue-50  text-blue-700  border-blue-200"  },
  WARN:  { label: "WARN",  icon: <AlertTriangle className="w-3 h-3" />, cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ERROR: { label: "ERROR", icon: <XCircle    className="w-3 h-3" />, cls: "bg-red-50   text-red-700   border-red-200"   },
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
    hour:  "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

// ─── Log levels and event options ─────────────────────────────────────────────
const LOG_LEVELS: Array<LogLevel | ""> = ["", "INFO", "WARN", "ERROR"];
const LOG_EVENTS: Array<LogEvent | ""> = [
  "", "BOOT", "WIFI", "MODEM", "OUTBOUND", "INBOUND", "PATCH", "HEAP", "RESTART",
];

const POLL_OPTIONS = [
  { label: "Off",    value: 0     },
  { label: "5 s",   value: 5000  },
  { label: "15 s",  value: 15000 },
  { label: "30 s",  value: 30000 },
];

// ─── Reports page ─────────────────────────────────────────────────────────────
export function Reports() {
  // System Logs filters
  const [logPage,    setLogPage]    = useState(1);
  const [logLevel,   setLogLevel]   = useState<LogLevel | "">("");
  const [logEvent,   setLogEvent]   = useState<LogEvent | "">("");
  const [pollMs,     setPollMs]     = useState(0);

  const { logs, meta, loading, error, refetch } = useDeviceLogs({
    page:   logPage,
    limit:  50,
    level:  logLevel  || undefined,
    event:  logEvent  || undefined,
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
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Last 7 Days</span>
            </button>
            <PrimaryButton>
              <Download className="w-5 h-5" />
              Export
            </PrimaryButton>
          </>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">{s.label}</div>
            <div className="text-3xl font-semibold text-gray-900">{s.value}</div>
            <div className={`text-sm mt-2 ${s.subColor}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Sent vs Delivered ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Sent vs Delivered</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={deliveryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip {...CHART_STYLE} />
            <Legend />
            <Bar dataKey="sent"      fill={BRAND.primary} name="Sent"      radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" fill="#FCD34D"        name="Delivered" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Failure Rate ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Failure Rate</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={failureData}>
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
      </div>

      {/* ── System Logs ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header + controls */}
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

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Level filter */}
            <select
              value={logLevel}
              onChange={(e) => handleLevelChange(e.target.value)}
              className={selectCls}
              style={{ outline: "none" }}
            >
              <option value="">All levels</option>
              {LOG_LEVELS.filter(Boolean).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Event filter */}
            <select
              value={logEvent}
              onChange={(e) => handleEventChange(e.target.value)}
              className={selectCls}
              style={{ outline: "none" }}
            >
              <option value="">All events</option>
              {LOG_EVENTS.filter(Boolean).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {/* Auto-refresh */}
            <select
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              className={selectCls}
              style={{ outline: "none" }}
              title="Auto-refresh interval"
            >
              {POLL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label === "Off" ? "Auto-refresh: Off" : `Refresh: ${o.label}`}
                </option>
              ))}
            </select>

            {/* Manual refresh */}
            <button
              onClick={refetch}
              disabled={loading}
              title="Refresh now"
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Message
                </th>
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
                    <td className="px-6 py-3 text-[12px] text-gray-500 whitespace-nowrap">
                      {formatLogTs(log.createdAt)}
                    </td>
                    <td className="px-6 py-3 font-sans">
                      <LevelBadge level={log.level} />
                    </td>
                    <td className="px-6 py-3 font-sans">
                      <EventTag event={log.event as LogEvent} />
                    </td>
                    <td className="px-6 py-3 text-[12px] text-gray-800 break-all">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages}
              <span className="ml-2 text-gray-400">
                ({formatNumber((meta.page - 1) * meta.limit + 1)}–
                {formatNumber(Math.min(meta.page * meta.limit, meta.total))} of{" "}
                {formatNumber(meta.total)})
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
