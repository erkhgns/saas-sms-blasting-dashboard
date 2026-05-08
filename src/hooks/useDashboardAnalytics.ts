import { useState, useEffect, useCallback } from "react";
import { analyticsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { DashboardAnalytics } from "@/types";

interface UseDashboardAnalyticsReturn {
  data: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardAnalytics(): UseDashboardAnalyticsReturn {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const senderId = authStore.getUser()?.id ?? "";
      const result = await analyticsService.getDashboard(senderId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
