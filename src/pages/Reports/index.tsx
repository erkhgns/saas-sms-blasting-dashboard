import { Calendar, Download } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { PageHeader, PrimaryButton } from "@/components/common";
import { formatNumber } from "@/utils";

const deliveryData = [
  { date: "Apr 18", sent: 4200, delivered: 4150 },
  { date: "Apr 19", sent: 3800, delivered: 3750 },
  { date: "Apr 20", sent: 5100, delivered: 5040 },
  { date: "Apr 21", sent: 4600, delivered: 4550 },
  { date: "Apr 22", sent: 6200, delivered: 6130 },
  { date: "Apr 23", sent: 5800, delivered: 5720 },
  { date: "Apr 24", sent: 4100, delivered: 4050 },
];

const failureData = [
  { date: "Apr 18", failed: 50, rate: 1.2 },
  { date: "Apr 19", failed: 50, rate: 1.3 },
  { date: "Apr 20", failed: 60, rate: 1.2 },
  { date: "Apr 21", failed: 50, rate: 1.1 },
  { date: "Apr 22", failed: 70, rate: 1.1 },
  { date: "Apr 23", failed: 80, rate: 1.4 },
  { date: "Apr 24", failed: 50, rate: 1.2 },
];

const usageByDay = [
  { day: "Apr 18", messages: 4200, credits: 4200 },
  { day: "Apr 19", messages: 3800, credits: 3800 },
  { day: "Apr 20", messages: 5100, credits: 5100 },
  { day: "Apr 21", messages: 4600, credits: 4600 },
  { day: "Apr 22", messages: 6200, credits: 6200 },
  { day: "Apr 23", messages: 5800, credits: 5800 },
  { day: "Apr 24", messages: 4100, credits: 4100 },
];

const summary = [
  { label: "Total Sent", value: "33,800", sub: "+15.3% vs last week", subColor: "text-green-600" },
  { label: "Total Delivered", value: "33,390", sub: "98.8% delivery rate", subColor: "text-green-600" },
  { label: "Total Failed", value: "410", sub: "1.2% failure rate", subColor: "text-red-600" },
  { label: "Credits Used", value: "33,800", sub: "12,450 remaining", subColor: "text-gray-600" },
];

const CHART_STYLE = {
  contentStyle: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" },
  labelStyle: { color: "#374151", fontWeight: 600 },
};

export function Reports() {
  return (
    <div className="p-8">
      <PageHeader
        title="Reports"
        subtitle="Analytics and insights for your SMS campaigns"
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Last 7 Days</span>
            </button>
            <PrimaryButton>
              <Download className="w-5 h-5" />
              Export
            </PrimaryButton>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">{s.label}</div>
            <div className="text-3xl font-semibold text-gray-900">{s.value}</div>
            <div className={`text-sm mt-2 ${s.subColor}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Sent vs Delivered Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Sent vs Delivered</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={deliveryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip {...CHART_STYLE} />
            <Legend />
            <Bar dataKey="sent" fill="#FF5F1F" name="Sent" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" fill="#FCD34D" name="Delivered" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Failure Rate Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Failure Rate</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={failureData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip {...CHART_STYLE} />
            <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} name="Failure Rate (%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Usage</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Date", "Messages Sent", "Credits Used"].map((col) => (
                <th key={col} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usageByDay.map((day, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{day.day}</td>
                <td className="px-6 py-4 text-gray-900">{formatNumber(day.messages)}</td>
                <td className="px-6 py-4 text-gray-900">{formatNumber(day.credits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
