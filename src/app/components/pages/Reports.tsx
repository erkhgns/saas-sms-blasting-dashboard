import { Calendar, Download } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

export function Reports() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Analytics and insights for your SMS campaigns</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Last 7 Days</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: '#FF5F1F' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E54E0F'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5F1F'}
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Total Sent</div>
          <div className="text-3xl font-semibold text-gray-900">33,800</div>
          <div className="text-sm text-green-600 mt-2">+15.3% vs last week</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Total Delivered</div>
          <div className="text-3xl font-semibold text-gray-900">33,390</div>
          <div className="text-sm text-green-600 mt-2">98.8% delivery rate</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Total Failed</div>
          <div className="text-3xl font-semibold text-gray-900">410</div>
          <div className="text-sm text-red-600 mt-2">1.2% failure rate</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Credits Used</div>
          <div className="text-3xl font-semibold text-gray-900">33,800</div>
          <div className="text-sm text-gray-600 mt-2">12,450 remaining</div>
        </div>
      </div>

      {/* Sent vs Delivered Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Sent vs Delivered</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={deliveryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              labelStyle={{ color: "#374151", fontWeight: 600 }}
            />
            <Legend />
            <Bar dataKey="sent" fill="#FF5F1F" name="Sent" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" fill="#FFF200" name="Delivered" radius={[4, 4, 0, 0]} />
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
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              labelStyle={{ color: "#374151", fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} name="Failure Rate (%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Usage</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Messages Sent</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Credits Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usageByDay.map((day, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{day.day}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{day.messages.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{day.credits.toLocaleString()}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
