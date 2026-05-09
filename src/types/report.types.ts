// Legacy report types — superseded by analytics.types.ts
// Kept for backward compatibility; do not add new types here.

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
