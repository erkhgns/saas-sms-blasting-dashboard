export interface DashboardTotals {
  sent: number;
  pending: number;
  failed: number;
}

export interface DashboardDeliveryRate {
  value: number | null;
  period: string;
  sentInPeriod: number;
  failedInPeriod: number;
}

export interface DashboardThroughput {
  sent: number;       // count of SENT messages in the last 1 hour
  period: string;     // always "last_1_hour"
}

export interface DashboardAnalytics {
  totals: DashboardTotals;
  deliveryRate: DashboardDeliveryRate;
  throughput: DashboardThroughput;
}

// ── Chart ─────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  date: string;   // "YYYY-MM-DD"
  sent: number;
}

export interface ChartPeriod {
  from: string;
  to: string;
  days: number;
}

export interface ChartResponse {
  data: ChartDataPoint[];
  period: ChartPeriod;
}
