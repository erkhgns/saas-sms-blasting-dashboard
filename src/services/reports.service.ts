import { api } from "./api";
import type { ReportsResponse } from "@/types";

export const reportsService = {
  get: (range: "7d" | "30d" | "90d" = "7d") =>
    api.get<ReportsResponse>("/reports", { range }),

  exportCsv: async (range: "7d" | "30d" | "90d" = "7d") => {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/reports/export?range=${range}`,
      { headers: { Authorization: `Bearer ${token ?? ""}` } }
    );
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
