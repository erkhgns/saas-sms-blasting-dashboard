import { useState, useEffect, useCallback } from "react";
import { campaignsService } from "@/services";
import type { Campaign, CampaignsResponse } from "@/types";

interface UseCampaignsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

interface UseCampaignsReturn {
  campaigns: Campaign[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsReturn {
  const { page = 1, pageSize = 10, search } = options;
  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await campaignsService.getAll(page, pageSize, search);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    campaigns: data?.data ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch: fetch,
  };
}
