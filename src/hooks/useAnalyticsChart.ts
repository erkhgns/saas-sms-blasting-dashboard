import { useState, useEffect, useCallback } from "react";
import { analyticsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { ChartDataPoint, ChartPeriod } from "@/types";

interface UseAnalyticsChartResult {
  data: ChartDataPoint[];
  period: ChartPeriod | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnalyticsChart(days = 7): UseAnalyticsChartResult {
  const [data, setData]       = useState<ChartDataPoint[]>([]);
  const [period, setPeriod]   = useState<ChartPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const senderId = authStore.getUser()?.id;
    if (!senderId) {
      setLoading(false);
      return;
    }

    analyticsService
      .getChart(senderId, days)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setPeriod(res.period);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [days, tick]);

  return { data, period, loading, error, refetch };
}
