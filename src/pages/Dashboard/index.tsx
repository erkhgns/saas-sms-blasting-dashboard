import { Send, Clock, CheckCircle, XCircle, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AvatarInitials, StatusBadge } from "@/components/common";
import { formatNumber } from "@/utils";
import { useDashboardAnalytics, useInbox, useAnalyticsChart, useCampaigns } from "@/hooks";
import { CAMPAIGN_STATUS_LABELS } from "@/types";


function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffH   < 24) return `${diffH} hr ago`;
  if (diffD   < 7)  return `${diffD}d ago`;
  return date.toLocaleDateString();
}

export function Dashboard() {
  const { data, loading } = useDashboardAnalytics();

  const { data: chartData, loading: chartLoading } = useAnalyticsChart(7);

  // Recent Campaigns — latest 4 from the Campaigns API
  const { campaigns: recentCampaigns, loading: campaignsLoading } = useCampaigns({ pageSize: 4 });

  // Recent Replies — latest inbound threads from the Inbox API (limit 4)
  const { threads, loading: inboxLoading } = useInbox();
  const recentReplies = threads.slice(0, 4);

  const deliveryRate = (() => {
    if (loading) return "—";
    const value = data?.deliveryRate.value;
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(1)}%`;
  })();

  const statCards = [
    {
      label: "Total SMS Sent",
      value: loading ? "—" : formatNumber(data?.totals.sent ?? 0),
      icon: Send,
      loading,
    },
    {
      label: "Currently Queued",
      value: loading ? "—" : formatNumber(data?.totals.pending ?? 0),
      icon: Clock,
      loading,
    },
    {
      label: "Delivery Rate",
      value: deliveryRate,
      subtitle: data?.deliveryRate.period === "last_30_days" ? "Last 30 days" : undefined,
      icon: CheckCircle,
      loading,
    },
    {
      label: "Failed Messages",
      value: loading ? "—" : formatNumber(data?.totals.failed ?? 0),
      icon: XCircle,
      loading,
    },
    {
      label: "SMS Sent (Last Hour)",
      value: loading ? "—" : formatNumber(data?.throughput.sent ?? 0),
      subtitle: "Last 1 hour",
      icon: Zap,
      loading,
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFF0E8" }}>
                <kpi.icon className="w-6 h-6" style={{ color: "#FF692E" }} />
              </div>
            </div>
            <div className={`text-3xl font-semibold mb-1 ${kpi.loading ? "text-gray-300 animate-pulse" : "text-gray-900"}`}>
              {kpi.value}
            </div>
            <div className="text-sm text-gray-600">{kpi.label}</div>
            {"subtitle" in kpi && kpi.subtitle && (
              <div className="text-xs text-gray-400 mt-1">{kpi.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">SMS Sent Over Time</h2>
        {chartLoading ? (
          <div className="h-[300px] animate-pulse bg-gray-100 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData.map((d) => ({
                ...d,
                // Convert "YYYY-MM-DD" → "Apr 25" for the X-axis labels
                date: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                labelStyle={{ color: "#374151", fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="sent" stroke="#FF692E" strokeWidth={2} dot={{ fill: "#FF692E", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h2>

          {campaignsLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-2/5" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!campaignsLoading && recentCampaigns.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No campaigns yet</p>
          )}

          {!campaignsLoading && recentCampaigns.length > 0 && (
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => {
                const statusLabel = CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status;

                const deliveryLabel =
                  campaign.deliveryRate !== null && campaign.deliveryRate !== undefined
                    ? `${campaign.deliveryRate.toFixed(1)}% delivered`
                    : campaign.status === "IN_PROGRESS" && campaign.recipients > 0
                    ? `${campaign.sent}/${campaign.recipients} sent`
                    : null;

                const dateLabel = (() => {
                  const raw = campaign.sentAt ?? campaign.scheduledAt ?? campaign.updatedAt;
                  if (!raw) return null;
                  const d = new Date(raw);
                  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-PH", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  });
                })();

                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-medium text-gray-900 truncate">{campaign.name}</div>
                      {(campaign.recipients > 0 || deliveryLabel) && (
                        <div className="text-sm text-gray-500 mt-1">
                          {campaign.recipients > 0 && (
                            <span>{formatNumber(campaign.recipients)} recipients</span>
                          )}
                          {campaign.recipients > 0 && deliveryLabel && (
                            <span> • </span>
                          )}
                          {deliveryLabel && <span>{deliveryLabel}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge label={statusLabel} />
                      {dateLabel && (
                        <div className="text-xs text-gray-500 mt-1">{dateLabel}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Replies */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Replies</h2>

          {inboxLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!inboxLoading && recentReplies.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No replies yet</p>
          )}

          {!inboxLoading && recentReplies.length > 0 && (
            <div className="space-y-4">
              {recentReplies.map((thread) => {
                const displayName = thread.contact?.name ?? thread.phone;
                return (
                  <div key={thread.phone} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <AvatarInitials name={displayName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-gray-900 truncate">{displayName}</div>
                        <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatRelativeTime(thread.lastActivityAt)}
                        </div>
                      </div>
                      {thread.contact?.name && (
                        <div className="text-sm text-gray-500 mb-1">{thread.phone}</div>
                      )}
                      <div className="text-sm text-gray-900 truncate">{thread.lastMessage.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
