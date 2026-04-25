import { useState, useEffect, useCallback } from "react";
import { reportsService } from "@/services";
import type { ReportsResponse } from "@/types";

type DateRange = "7d" | "30d" | "90d";

interface UseReportsReturn {
  data: ReportsResponse | null;
  loading: boolean;
  error: string | null;
  range: DateRange;
  setRange: (range: DateRange) => void;
  exportCsv: () => Promise<void>;
}

export function useReports(): UseReportsReturn {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("7d");

  useEffect(() => {
    setLoading(true);
    setError(null);
    reportsService
      .get(range)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [range]);

  const exportCsv = useCallback(() => reportsService.exportCsv(range), [range]);

  return { data, loading, error, range, setRange, exportCsv };
}
