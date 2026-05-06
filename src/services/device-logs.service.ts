import { api } from "./api";
import type { DeviceLogListResponse, DeviceLogFilters } from "@/types";

export const deviceLogsService = {
  /**
   * GET /device-logs — paginated viewer for ESP32 log entries.
   * Requires x-api-key + Authorization: Bearer.
   */
  getLogs: (filters: DeviceLogFilters): Promise<DeviceLogListResponse> => {
    const params: Record<string, string | number> = {
      senderId: filters.senderId,
      page:     filters.page  ?? 1,
      limit:    filters.limit ?? 50,
    };
    if (filters.level) params.level = filters.level;
    if (filters.event) params.event = filters.event;
    return api.get<DeviceLogListResponse>("/device-logs", params);
  },
};
