export interface DailyStat {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface FailureStat {
  date: string;
  failed: number;
  rate: number;
}

export interface UsageStat {
  day: string;
  messages: number;
  credits: number;
}

export interface ReportSummary {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  creditsUsed: number;
  deliveryRate: string;
  failureRate: string;
  changeVsLastWeek: string;
  creditsRemaining: number;
}

export interface ReportsResponse {
  summary: ReportSummary;
  dailyStats: DailyStat[];
  failureStats: FailureStat[];
  usageStats: UsageStat[];
}
