import { api } from "./api";
import type { ReportParams, ReportsApiResponse } from "@/types";

// api.get() expects Record<string, string | number> — cast ReportParams accordingly
const toQuery = (p: ReportParams): Record<string, string | number> =>
  p as unknown as Record<string, string | number>;

export const reportsService = {
  /**
   * Full analytics report for a date range.
   * Returns summary, delivery trend, failure trend, campaign performance,
   * and tag reply breakdown in one request.
   *
   * GET /analytics/reports?senderId=&from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  getReports: (params: ReportParams) =>
    api.get<ReportsApiResponse>("/analytics/reports", toQuery(params)),
};
