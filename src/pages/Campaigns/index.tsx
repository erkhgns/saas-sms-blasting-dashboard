import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader, PrimaryButton } from "@/components/common";
import { formatNumber, BRAND, CAMPAIGN_STATUS_COLORS } from "@/utils";
import { useCampaigns } from "@/hooks";
import { campaignsService } from "@/services";
import { CAMPAIGN_STATUS_LABELS, LOCKED_CAMPAIGN_STATUSES } from "@/types";
import type { Campaign, CampaignStatus } from "@/types";

// ── Status filter options ─────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ label: string; value: CampaignStatus | "" }> = [
  { label: "All Statuses",  value: "" },
  { label: "Draft",        value: "DRAFT" },
  { label: "Scheduled",    value: "SCHEDULED" },
  { label: "In Progress",  value: "IN_PROGRESS" },
  { label: "Sent",         value: "SENT" },
  { label: "Failed",       value: "FAILED" },
];

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: CampaignStatus }) {
  const label = CAMPAIGN_STATUS_LABELS[status] ?? status;
  const colorClass =
    CAMPAIGN_STATUS_COLORS[label] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const isInProgress = status === "IN_PROGRESS";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {isInProgress && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {label}
    </span>
  );
}

// ── RowMenu ───────────────────────────────────────────────────────────────────

interface RowMenuProps {
  campaign: Campaign;
  onLaunch:    (id: string) => void;
  onDelete:    (id: string) => void;
  onDuplicate: (id: string) => void;
}

function RowMenu({ campaign, onLaunch, onDelete, onDuplicate }: RowMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLocked = LOCKED_CAMPAIGN_STATUSES.includes(campaign.status);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  type MenuItem = { label: string; danger?: boolean; onClick: () => void };

  const items: MenuItem[] = [
    { label: "View", onClick: () => navigate(`/campaigns/${campaign.id}`) },
    ...(!isLocked
      ? [{ label: "Edit", onClick: () => navigate(`/campaigns/${campaign.id}/edit`) }]
      : []),
    // DRAFT → launch immediately; SCHEDULED → launch early (skips auto-trigger wait)
    ...(campaign.status === "DRAFT"
      ? [{ label: "Launch", onClick: () => { setOpen(false); onLaunch(campaign.id); } }]
      : campaign.status === "SCHEDULED"
      ? [{ label: "Launch now (send early)", onClick: () => { setOpen(false); onLaunch(campaign.id); } }]
      : []),
    { label: "Duplicate", onClick: () => { setOpen(false); onDuplicate(campaign.id); } },
    ...(!isLocked
      ? [{ label: "Delete", danger: true, onClick: () => { setOpen(false); onDelete(campaign.id); } }]
      : []),
  ];

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        aria-label="Campaign actions"
      >
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campaigns page ────────────────────────────────────────────────────────────

export function Campaigns() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "">("");
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 10;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { campaigns, total, loading, error, refetch } = useCampaigns({
    page,
    pageSize: PAGE_SIZE,
    search:   debouncedSearch || undefined,
    status:   statusFilter   || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRowClick = useCallback(
    (campaign: Campaign) => {
      const isLocked = LOCKED_CAMPAIGN_STATUSES.includes(campaign.status);
      navigate(isLocked ? `/campaigns/${campaign.id}` : `/campaigns/${campaign.id}/edit`);
    },
    [navigate]
  );

  const handleLaunch = useCallback(
    async (id: string) => {
      try {
        await campaignsService.launch(id);
        refetch();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Launch failed";
        alert(msg); // TODO: replace with toast
      }
    },
    [refetch]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await campaignsService.duplicate(id);
        refetch();
      } catch {
        // TODO: toast
      }
    },
    [refetch]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this campaign? This action cannot be undone.")) return;
      try {
        await campaignsService.delete(id);
        refetch();
      } catch {
        // TODO: toast
      }
    },
    [refetch]
  );

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Campaigns"
        subtitle="Manage and track your SMS campaigns"
        actions={
          <PrimaryButton onClick={() => navigate("/campaigns/new")}>
            + New Campaign
          </PrimaryButton>
        }
      />

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search campaigns…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              style={{ outline: "none" }}
              onFocus={(e) => {
                e.target.style.borderColor = BRAND.primary;
                e.target.style.boxShadow = `0 0 0 2px rgba(255, 105, 46, 0.2)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as CampaignStatus | ""); setPage(1); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
            style={{ outline: "none" }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Campaign Name", "Status", "Recipients", "Delivery Rate", "Date / Scheduled", ""].map(
                (col, i) => (
                  <th
                    key={i}
                    className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                      i === 5 ? "w-12" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  {search || statusFilter ? "No campaigns match your filters." : "No campaigns yet."}
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const deliveryLabel =
                  campaign.deliveryRate !== null && campaign.deliveryRate !== undefined
                    ? `${campaign.deliveryRate.toFixed(1)}%`
                    : campaign.status === "IN_PROGRESS"
                    ? `${campaign.sent + campaign.failed}/${campaign.recipients}`
                    : "—";

                const dateLabel = campaign.sentAt
                  ? new Date(campaign.sentAt).toLocaleDateString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                    })
                  : campaign.status === "SCHEDULED" && campaign.scheduledAt
                  ? new Date(campaign.scheduledAt).toLocaleString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })
                  : "—";

                return (
                  <tr
                    key={campaign.id}
                    onClick={() => handleRowClick(campaign)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={campaign.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {campaign.recipients > 0 ? formatNumber(campaign.recipients) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{deliveryLabel}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{dateLabel}</td>
                    <td className="px-6 py-4 text-right">
                      <RowMenu
                        campaign={campaign}
                        onLaunch={handleLaunch}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {loading ? (
            <span className="inline-block h-4 w-40 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {Math.min((page - 1) * PAGE_SIZE + 1, total)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-900">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">{total}</span> campaigns
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
