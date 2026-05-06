export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogEvent =
  | "BOOT"
  | "WIFI"
  | "MODEM"
  | "OUTBOUND"
  | "INBOUND"
  | "PATCH"
  | "HEAP"
  | "RESTART";

export interface DeviceLog {
  id: string;
  level: LogLevel;
  event: LogEvent;
  message: string;
  senderId: string;
  createdAt: string; // ISO datetime — server-assigned on receipt
}

export interface DeviceLogListResponse {
  data: DeviceLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DeviceLogFilters {
  senderId: string;
  level?: LogLevel;
  event?: LogEvent;
  page?: number;
  limit?: number;
}
