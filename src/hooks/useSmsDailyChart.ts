import { useState, useEffect, useCallback } from "react";
import { messagesService } from "@/services";
import { authStore } from "@/utils/auth.store";

export interface ChartDataPoint {
  date: string;  // "Apr 25"
  sent: number;
}

interface UseSmsDailyChartResult {
  chartData: ChartDataPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the most recent SMS logs and aggregates them into daily send counts
 * for the last `days` days (default 7).
 *
 * Works against the existing /sms endpoint with no backend changes needed.
 * Fetches up to 1000 recent records — accurate as long as fewer than 1000
 * messages were sent in the window. If you exceed this, ask the backend team
 * to add GET /analytics/chart?days=7.
 */
export function useSmsDailyChart(days = 7): UseSmsDailyChartResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tick, setTick]           = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const senderId = authStore.getUser()?.id ?? "";

    messagesService
      .getSms({ senderId, page: 1, limit: 1000, sortBy: "date" })
      .then(({ data: logs }) => {
        if (cancelled) return;

        // Build the last `days` date-strings (YYYY-MM-DD) as bucket keys
        const today = new Date();
        const buckets: Record<string, number> = {};
        const labels: { key: string; label: string }[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key   = d.toISOString().split("T")[0];            // "2026-05-01"
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // "May 1"
          buckets[key] = 0;
          labels.push({ key, label });
        }

        // Count each log record into its day bucket
        for (const log of logs) {
          const day = log.createdAt?.split("T")[0];
          if (day && day in buckets) buckets[day]++;
        }

        setChartData(labels.map(({ key, label }) => ({ date: label, sent: buckets[key] })));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [days, tick]);

  return { chartData, loading, error, refetch };
}
