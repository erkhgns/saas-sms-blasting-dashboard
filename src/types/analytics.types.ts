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

// ── Reports date range ────────────────────────────────────────────────────────

export type ReportDatePreset = "today" | "yesterday" | "last7" | "last30";

export type ReportDateRange =
  | { type: "preset"; preset: ReportDatePreset }
  | { type: "custom"; from: string; to: string };  // YYYY-MM-DD

export interface ReportParams {
  senderId: string;
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
}

// ── GET /analytics/summary ───────────────────────────────────────────────────

export interface ReportSummary {
  totalSent:         number;
  totalDelivered:    number;
  totalFailed:       number;
  avgSendTimeMs:     number;    // ms per SMS
  throughputPerHour: number;    // estimated SMS/hour
}

// ── GET /analytics/delivery-trend ────────────────────────────────────────────

export interface DeliveryTrendPoint {
  date:      string;  // e.g. "Apr 18"
  sent:      number;
  delivered: number;
}

// ── GET /analytics/failure-trend ─────────────────────────────────────────────

export interface FailureTrendPoint {
  date: string;   // e.g. "Apr 18"
  rate: number;   // failure % e.g. 1.2
}

// ── GET /analytics/campaign-performance ──────────────────────────────────────

export type CampaignReportStatus = "Sent" | "Failed" | "In Progress";

export interface CampaignReportRow {
  id:           string;
  name:         string;
  status:       CampaignReportStatus;
  sentAt:       string;   // display string e.g. "Apr 24, 2025"
  recipients:   number;
  delivered:    number;
  failed:       number;
  deliveryRate: number;   // 0–100
}

// ── GET /analytics/tag-replies ────────────────────────────────────────────────

export interface TagReplyRow {
  tag:                   string;
  color:                 string | null;   // hex color from tag definition
  contacts:              number;          // total contacts with this tag
  campaignsSent:         number;
  totalReplies:          number;          // knownReplies + unknownReplies
  knownReplies:          number;          // replies from numbers saved as contacts
  unknownReplies:        number;          // replies from numbers NOT in contacts
  replyRate:             number;          // % of contacts that replied (0–100)
  avgRepliesPerCampaign: number;
}

export interface TagReplyReport {
  rows:                 TagReplyRow[];
  unknownNumberReplies: number;   // total replies from numbers not saved as any contact
}

// ── GET /analytics/reports (combined) ────────────────────────────────────────

export interface ReportsApiResponse {
  summary:             ReportSummary;
  deliveryTrend:       DeliveryTrendPoint[];
  failureTrend:        FailureTrendPoint[];
  campaignPerformance: CampaignReportRow[];
  tagReplies:          TagReplyReport;
}
