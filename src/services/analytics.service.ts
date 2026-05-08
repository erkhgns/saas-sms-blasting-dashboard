import { api } from "./api";
import type { DashboardAnalytics, ChartResponse } from "@/types";

export const analyticsService = {
  getDashboard: (senderId: string) =>
    api.get<DashboardAnalytics>("/analytics/dashboard", { senderId }),

  getChart: (senderId: string, days = 7) =>
    api.get<ChartResponse>("/analytics/chart", { senderId, days }),
};
