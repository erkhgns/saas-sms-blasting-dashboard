import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Trash2, Clock, CheckCircle2, XCircle, User, Calendar, ChevronDown, Check } from "lucide-react";
import { PageHeader } from "@/components/common";
import { BRAND, PRIORITY_COLORS, SMS_STATUS_COLORS, SMS_STATUS_LABELS, TAG_COLORS, authStore } from "@/utils";
import { PRIORITY_LABELS } from "@/types";
import { useSmsLogs } from "@/hooks";
import { messagesService, contactsService } from "@/services";
import type { SmsStatus, Contact } from "@/types";

type StatusFilter   = "all" | SmsStatus;
type PriorityFilter = "all" | "0" | "1" | "2";

// ── helpers ───────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SmsStatus }) {
  if (status === "PENDING")   return <Clock className="w-3 h-3" />;
  if (status === "SENT")      return <CheckCircle2 className="w-3 h-3" />;
  if (status === "FAILED")    return <XCircle className="w-3 h-3" />;
  if (status === "CANCELLED") return <XCircle className="w-3 h-3" />;
  return null;
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

interface DateRange { from: string; to: string }

function formatDateLabel(from: string, to: string): string {
  if (!from && !to) return "Date Range";
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from)       return `From ${fmt(from)}`;
  return `Until ${fmt(to)}`;
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const apply = () => { onChange(draft); setOpen(false); };
  const clear  = () => { const empty = { from: "", to: "" }; setDraft(empty); onChange(empty); setOpen(false); };
  const hasValue = value.from || value.to;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setDraft(value); setOpen((o) => !o); }}
        className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors bg-white ${
          hasValue ? "border-orange-400 text-orange-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Calendar className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">{formatDateLabel(value.from, value.to)}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">From</label>
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={clear}
              className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!draft.from && !draft.to}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: BRAND.primary }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RecipientCell ─────────────────────────────────────────────────────────────

function RecipientCell({
  phone,
  contact,
  resolving,
}: {
  phone: string;
  contact: Contact | null | undefined;
  resolving: boolean;
}) {
  if (resolving) {
    return (
      <div className="space-y-1">
        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <span className="font-mono text-sm text-gray-700">{phone}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
        style={{ backgroundColor: BRAND.primary }}
      >
        {contact.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{contact.name}</span>
          {contact.optedOut && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
              Opted out
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-mono">{phone}</div>
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  TAG_COLORS[tag] ?? "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {tag}
              </span>
            ))}
            {contact.tags.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400">
                +{contact.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MessageCell ───────────────────────────────────────────────────────────────

function MessageCell({ content }: { content: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <div
        className="text-gray-900 truncate text-sm cursor-default select-none"
        onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e)  => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
      >
        {content}
      </div>

      {pos && (
        <div
          className="fixed z-50 max-w-sm w-max bg-gray-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl whitespace-pre-wrap break-words pointer-events-none leading-relaxed"
          style={{
            left: pos.x + 14,
            top:  pos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

// ── Logs page ─────────────────────────────────────────────────────────────────

export function Logs() {
  const senderId = authStore.getUser()?.id ?? "";

  // ── filter state ─────────────────────────────────────────────────────────
  const [page,            setPage]            = useState(1);
  const [limit,           setLimit]           = useState(10);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [committedSearch, setCommittedSearch] = useState(""); // sent to API on Enter / clear
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>("all");
  const [priorityFilter,  setPriorityFilter]  = useState<PriorityFilter>("all");
  const [dateRange,       setDateRange]       = useState<{ from: string; to: string }>({ from: "", to: "" });

  // ── resend / delete ──────────────────────────────────────────────────────
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [resendingId,  setResendingId]  = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // ── contact lookup ───────────────────────────────────────────────────────
  const [contactMap, setContactMap]     = useState<Map<string, Contact | null>>(new Map());
  const [resolving,  setResolving]      = useState(false);
  const contactCacheRef                 = useRef<Map<string, Contact | null>>(new Map());

  // ── API call — all filtering done server-side ────────────────────────────
  const { logs, meta, sendingWindow, loading, error, refetch } = useSmsLogs({
    page,
    limit,
    status:   statusFilter   === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : (Number(priorityFilter) as 0 | 1 | 2),
    search:   committedSearch || undefined,
    dateFrom: dateRange.from || undefined,
    dateTo:   dateRange.to   || undefined,
  });

  // ── resolve phones → contacts ────────────────────────────────────────────
  useEffect(() => {
    if (logs.length === 0) return;

    const unknownPhones = [...new Set(logs.map((l) => l.receiver))].filter(
      (p) => !contactCacheRef.current.has(p)
    );

    if (unknownPhones.length === 0) {
      setContactMap(new Map(contactCacheRef.current));
      return;
    }

    setResolving(true);

    Promise.allSettled(
      unknownPhones.map((phone) =>
        contactsService
          .getAll({ senderId, search: phone, limit: 1 })
          .then((res) => {
            const match = res.data.find((c) => c.phone === phone) ?? null;
            contactCacheRef.current.set(phone, match);
          })
          .catch(() => { contactCacheRef.current.set(phone, null); })
      )
    ).finally(() => {
      setContactMap(new Map(contactCacheRef.current));
      setResolving(false);
    });
  }, [logs, senderId]);

  // ── reset to page 1 whenever any filter changes ──────────────────────────
  const handleStatusChange = (v: string) => {
    setStatusFilter(v as StatusFilter);
    setPage(1);
    setSelectedLogs([]);
  };

  const handlePriorityChange = (v: string) => {
    setPriorityFilter(v as PriorityFilter);
    setPage(1);
    setSelectedLogs([]);
  };

  const handleDateChange = (v: { from: string; to: string }) => {
    setDateRange(v);
    setPage(1);
    setSelectedLogs([]);
  };

  // Search only fires to API on Enter or when field is cleared
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { setCommittedSearch(searchQuery); setPage(1); setSelectedLogs([]); }
  };
  const handleSearchClear = () => {
    setSearchQuery("");
    setCommittedSearch("");
    setPage(1);
    setSelectedLogs([]);
  };

  // ── actions ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await messagesService.deleteSms(id);
      refetch();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResend = async (id: string, content: string, receiver: string) => {
    setResendingId(id);
    try {
      await messagesService.createBulkSms({ content, receivers: [receiver], senderId });
      refetch();
    } catch (err) {
      console.error("Resend failed", err);
    } finally {
      setResendingId(null);
    }
  };

  const toggleLog = (id: string) =>
    setSelectedLogs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelectedLogs(selectedLogs.length === logs.length ? [] : logs.map((l) => l.id));

  const activeFilters =
    statusFilter !== "all" || priorityFilter !== "all" || dateRange.from || dateRange.to || committedSearch;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="SMS Logs"
        subtitle="Track and manage all SMS messages"
        actions={
          selectedLogs.length > 0 ? (
            <button className="flex items-center gap-2 px-4 py-2.5 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
              Delete ({selectedLogs.length})
            </button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">

          {/* Search — fires on Enter */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search recipient or message… (Enter)"
              className="w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm"
              style={{ outline: "none" }}
              onFocus={(e) => { e.target.style.borderColor = BRAND.primary; e.target.style.boxShadow = "0 0 0 2px rgba(255,105,46,0.2)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "#d1d5db";    e.target.style.boxShadow = "none"; }}
            />
            {searchQuery && (
              <button
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
            style={{ outline: "none" }}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
            style={{ outline: "none" }}
          >
            <option value="all">All Priority</option>
            <option value="0">Normal</option>
            <option value="1">High</option>
            <option value="2">Urgent</option>
          </select>

          {/* Date range */}
          <DateRangePicker value={dateRange} onChange={handleDateChange} />

          {/* Refresh */}
          <button
            onClick={refetch}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Active filter summary */}
        {activeFilters && (
          <div className="px-4 pb-3 flex items-center gap-2 text-xs text-gray-500">
            <Check className="w-3.5 h-3.5 text-orange-500" />
            Filters active —{" "}
            <button
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setDateRange({ from: "", to: "" });
                setSearchQuery("");
                setCommittedSearch("");
                setPage(1);
              }}
              className="text-orange-600 hover:underline font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Sending-window paused indicator — shown when PENDING filter is active and windows are closed */}
      {sendingWindow && sendingWindow.campaignsWithClosedWindows.length > 0 && (
        <div className="mb-4 space-y-2">
          {sendingWindow.campaignsWithClosedWindows.map((c) => (
            <div
              key={c.campaignId}
              className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
            >
              <Clock className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>{c.campaignName}</strong> messages are paused — currently outside the
                sending window.{" "}
                {c.opensAt && (
                  <span className="text-amber-700">Window reopens at {c.opensAt}.</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 border-gray-300 rounded"
                    style={{ accentColor: BRAND.primary }}
                    checked={logs.length > 0 && selectedLogs.length === logs.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    {activeFilters ? "No results match your filters." : "No SMS logs found."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 border-gray-300 rounded"
                        style={{ accentColor: BRAND.primary }}
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => toggleLog(log.id)}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <RecipientCell
                        phone={log.receiver}
                        contact={contactMap.get(log.receiver)}
                        resolving={resolving && !contactMap.has(log.receiver)}
                      />
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <MessageCell content={log.content} />
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${SMS_STATUS_COLORS[log.status]}`}>
                        <StatusIcon status={log.status} />
                        {SMS_STATUS_LABELS[log.status]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[PRIORITY_LABELS[log.priority]]}`}>
                        {PRIORITY_LABELS[log.priority]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit", hour12: true,
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResend(log.id, log.content, log.receiver)}
                          disabled={resendingId === log.id || log.status === "CANCELLED"}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                          title={log.status === "CANCELLED" ? "Cannot resend a cancelled message" : "Resend"}
                        >
                          <RefreshCw className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 ${resendingId === log.id ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className={`w-4 h-4 group-hover:text-red-600 ${deletingId === log.id ? "text-red-400 animate-pulse" : "text-gray-500"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {meta ? (
              <>
                Showing{" "}
                <span className="font-medium text-gray-900">
                  {(meta.page - 1) * meta.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-gray-900">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-900">{meta.total}</span> messages
              </>
            ) : (
              "Loading..."
            )}
          </div>
          {/* Rows per page */}
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none"
            style={{ outline: "none" }}
            title="Rows per page"
          >
            <option value={10}>10 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={1000}>1000 / page</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta || meta.page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta || meta.page >= meta.totalPages}
            className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
