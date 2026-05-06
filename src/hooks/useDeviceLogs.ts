import { useState, useEffect, useCallback, useRef } from "react";
import { deviceLogsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { DeviceLog, DeviceLogListResponse, LogLevel, LogEvent } from "@/types";

interface UseDeviceLogsOptions {
  page?: number;
  limit?: number;
  level?: LogLevel;
  event?: LogEvent;
  /** Poll interval in ms. Pass 0 to disable auto-refresh. Default: 0 */
  pollMs?: number;
}

interface UseDeviceLogsReturn {
  logs: DeviceLog[];
  meta: DeviceLogListResponse["meta"] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeviceLogs({
  page   = 1,
  limit  = 50,
  level,
  event,
  pollMs = 0,
}: UseDeviceLogsOptions = {}): UseDeviceLogsReturn {
  const [logs, setLogs]     = useState<DeviceLog[]>([]);
  const [meta, setMeta]     = useState<DeviceLogListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const senderId = authStore.getUser()?.id ?? "";
      const result = await deviceLogsService.getLogs({ senderId, page, limit, level, event });
      setLogs(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load device logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit, level, event]);

  useEffect(() => {
    fetch();

    if (pollMs > 0) {
      pollRef.current = setInterval(fetch, pollMs);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetch, pollMs]);

  return { logs, meta, loading, error, refetch: fetch };
}
