import { useState, useEffect, useRef } from "react";
import { Search, Calendar, RefreshCw, Trash2, Clock, CheckCircle2, XCircle, User } from "lucide-react";
import { PageHeader } from "@/components/common";
import { BRAND, PRIORITY_COLORS, SMS_STATUS_COLORS, SMS_STATUS_LABELS, TAG_COLORS, authStore } from "@/utils";
import { PRIORITY_LABELS } from "@/types";
import { useSmsLogs } from "@/hooks";
import { messagesService, contactsService } from "@/services";
import type { SmsStatus, Contact } from "@/types";

type StatusFilter = "all" | SmsStatus;

// ── helpers ───────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SmsStatus }) {
  if (status === "PENDING") return <Clock className="w-3 h-3" />;
  if (status === "SENT")    return <CheckCircle2 className="w-3 h-3" />;
  if (status === "FAILED")  return <XCircle className="w-3 h-3" />;
  return null;
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
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
        style={{ backgroundColor: BRAND.primary }}
      >
        {contact.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        {/* Name + opted-out badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{contact.name}</span>
          {contact.optedOut && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
              Opted out
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="text-xs text-gray-500 font-mono">{phone}</div>

        {/* Tags */}
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

// ── Logs page ─────────────────────────────────────────────────────────────────

export function Logs() {
  const senderId = authStore.getUser()?.id ?? "";

  const [page, setPage]                   = useState(1);
  const [searchQuery, setSearchQuery]     = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [selectedLogs, setSelectedLogs]   = useState<string[]>([]);
  const [resendingId, setResendingId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  // contact lookup: phone → Contact (null = confirmed not found)
  const [contactMap, setContactMap]       = useState<Map<string, Contact | null>>(new Map());
  const [resolving, setResolving]         = useState(false);
  // cache persists across page changes so we don't re-fetch known phones
  const contactCacheRef                   = useRef<Map<string, Contact | null>>(new Map());

  const statusParam = statusFilter === "all" ? undefined : statusFilter;
  const { logs, meta, loading, error, refetch } = useSmsLogs({ page, limit: 10, status: statusParam });

  // ── resolve phones → contacts whenever the page's logs change ──────────────
  useEffect(() => {
    if (logs.length === 0) return;

    const unknownPhones = [
      ...new Set(logs.map((l) => l.receiver)),
    ].filter((p) => !contactCacheRef.current.has(p));

    if (unknownPhones.length === 0) {
      // All phones already cached — just refresh the map from cache
      setContactMap(new Map(contactCacheRef.current));
      return;
    }

    setResolving(true);

    Promise.allSettled(
      unknownPhones.map((phone) =>
        contactsService
          .getAll({ senderId, search: phone, limit: 1 })
          .then((res) => {
            // Only accept if the phone matches exactly
            const match = res.data.find((c) => c.phone === phone) ?? null;
            contactCacheRef.current.set(phone, match);
          })
          .catch(() => {
            contactCacheRef.current.set(phone, null);
          })
      )
    ).finally(() => {
      setContactMap(new Map(contactCacheRef.current));
      setResolving(false);
    });
  }, [logs, senderId]);

  // ── client-side filter — matches phone, message content, or contact name ───
  const filteredLogs = searchQuery.trim()
    ? logs.filter((log) => {
        const q = searchQuery.toLowerCase();
        if (log.receiver.toLowerCase().includes(q)) return true;
        if (log.content.toLowerCase().includes(q))  return true;
        const contact = contactMap.get(log.receiver);
        if (contact?.name.toLowerCase().includes(q)) return true;
        return false;
      })
    : logs;

  // ── actions ───────────────────────────────────────────────────────────────
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSelectedLogs([]);
  };

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

  const toggleLog  = (id: string) => setSelectedLogs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll  = () => setSelectedLogs(selectedLogs.length === filteredLogs.length ? [] : filteredLogs.map((l) => l.id));

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
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by recipient, name, or message…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
              onFocus={(e) => { e.target.style.borderColor = BRAND.primary; e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 46, 0.2)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "#d1d5db";    e.target.style.boxShadow = "none"; }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white"
            style={{ outline: "none" }}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Date Range</span>
          </button>
          <button
            onClick={refetch}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

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
                  checked={filteredLogs.length > 0 && selectedLogs.length === filteredLogs.length}
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
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                  {searchQuery ? `No results for "${searchQuery}".` : "No SMS logs found."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
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

                  {/* Recipient — resolves to contact name/tags if found */}
                  <td className="px-6 py-4">
                    <RecipientCell
                      phone={log.receiver}
                      contact={contactMap.get(log.receiver)}
                      resolving={resolving && !contactMap.has(log.receiver)}
                    />
                  </td>

                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-gray-900 truncate text-sm">{log.content}</div>
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
                        disabled={resendingId === log.id}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Resend"
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
      <div className="mt-6 flex items-center justify-between">
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
