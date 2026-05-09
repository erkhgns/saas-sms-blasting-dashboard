import { useState, useEffect, useMemo } from "react";
import { reportsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type {
  ReportDateRange,
  ReportSummary,
  DeliveryTrendPoint,
  FailureTrendPoint,
  CampaignReportRow,
  TagReplyReport,
} from "@/types";

// ── Date range → YYYY-MM-DD params ───────────────────────────────────────────

function toDateParams(range: ReportDateRange): { from: string; to: string } {
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const today = new Date();

  if (range.type === "custom") return { from: range.from, to: range.to };

  switch (range.preset) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "yesterday": {
      const d = new Date(today);
      d.setDate(today.getDate() - 1);
      return { from: fmt(d), to: fmt(d) };
    }
    case "last7": {
      const d = new Date(today);
      d.setDate(today.getDate() - 6);
      return { from: fmt(d), to: fmt(today) };
    }
    case "last30": {
      const d = new Date(today);
      d.setDate(today.getDate() - 29);
      return { from: fmt(d), to: fmt(today) };
    }
  }
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseReportsReturn {
  summary:             ReportSummary        | null;
  deliveryTrend:       DeliveryTrendPoint[];
  failureTrend:        FailureTrendPoint[];
  campaignPerformance: CampaignReportRow[];
  tagReplies:          TagReplyReport       | null;
  loading:             boolean;
  error:               string | null;
  refetch:             () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useReports(dateRange: ReportDateRange): UseReportsReturn {
  const senderId = authStore.getUser()?.id ?? "";

  const [summary,             setSummary]             = useState<ReportSummary        | null>(null);
  const [deliveryTrend,       setDeliveryTrend]       = useState<DeliveryTrendPoint[]>([]);
  const [failureTrend,        setFailureTrend]        = useState<FailureTrendPoint[]>([]);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignReportRow[]>([]);
  const [tagReplies,          setTagReplies]          = useState<TagReplyReport | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState<string | null>(null);
  const [tick,                setTick]                = useState(0);

  // Stable string key so the effect only re-runs when the range truly changes
  const rangeKey = useMemo(
    () =>
      dateRange.type === "preset"
        ? dateRange.preset
        : `${dateRange.from}:${dateRange.to}`,
    [dateRange]
  );

  useEffect(() => {
    if (!senderId) return;
    setLoading(true);
    setError(null);

    const params = { senderId, ...toDateParams(dateRange) };

    reportsService
      .getReports(params)
      .then((data) => {
        setSummary(data.summary);
        setDeliveryTrend(data.deliveryTrend);
        setFailureTrend(data.failureTrend);
        setCampaignPerformance(data.campaignPerformance);
        setTagReplies(data.tagReplies);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report data.");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderId, rangeKey, tick]);

  const refetch = () => setTick((t) => t + 1);

  return {
    summary,
    deliveryTrend,
    failureTrend,
    campaignPerformance,
    tagReplies,
    loading,
    error,
    refetch,
  };
}
