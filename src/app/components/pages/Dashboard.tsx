import { TrendingUp, TrendingDown, Send, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const kpiData = [
  { label: "Total SMS Sent", value: "45,231", change: "+12.5%", trend: "up", icon: Send },
  { label: "Delivery Rate", value: "98.4%", change: "+2.1%", trend: "up", icon: CheckCircle },
  { label: "Failed Messages", value: "723", change: "-5.3%", trend: "down", icon: XCircle },
  { label: "Remaining Credits", value: "12,450", change: "-8.2%", trend: "down", icon: CreditCard },
];

const chartData = [
  { date: "Apr 18", sent: 4200 },
  { date: "Apr 19", sent: 3800 },
  { date: "Apr 20", sent: 5100 },
  { date: "Apr 21", sent: 4600 },
  { date: "Apr 22", sent: 6200 },
  { date: "Apr 23", sent: 5800 },
  { date: "Apr 24", sent: 4100 },
];

const recentCampaigns = [
  { name: "Flash Sale Alert", status: "Delivered", recipients: 5240, deliveryRate: "99.2%", date: "Apr 24, 10:30 AM" },
  { name: "Payment Reminder", status: "Delivered", recipients: 3120, deliveryRate: "98.8%", date: "Apr 24, 9:15 AM" },
  { name: "Welcome Series", status: "In Progress", recipients: 1850, deliveryRate: "97.5%", date: "Apr 24, 8:00 AM" },
  { name: "Appointment Confirmation", status: "Delivered", recipients: 892, deliveryRate: "99.8%", date: "Apr 23, 4:45 PM" },
];

const recentReplies = [
  { name: "Sarah Johnson", phone: "+1 (555) 234-5678", message: "Yes, I'll be there at 3pm", time: "5 min ago" },
  { name: "Mike Chen", phone: "+1 (555) 876-5432", message: "Can I reschedule to tomorrow?", time: "12 min ago" },
  { name: "Emily Davis", phone: "+1 (555) 345-6789", message: "Thanks for the update!", time: "25 min ago" },
  { name: "Robert Wilson", phone: "+1 (555) 567-8901", message: "STOP", time: "1 hour ago" },
];

export function Dashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, John. Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF4EF' }}>
                <kpi.icon className="w-6 h-6" style={{ color: '#FF5F1F' }} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                kpi.trend === "up" ? "text-green-600" : "text-red-600"
              }`}>
                {kpi.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {kpi.change}
              </div>
            </div>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{kpi.value}</div>
            <div className="text-sm text-gray-600">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">SMS Sent Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              labelStyle={{ color: "#374151", fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="sent" stroke="#FF5F1F" strokeWidth={2} dot={{ fill: "#FF5F1F", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h2>
          <div className="space-y-4">
            {recentCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{campaign.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{campaign.recipients.toLocaleString()} recipients • {campaign.deliveryRate} delivered</div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    campaign.status === "Delivered"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {campaign.status}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">{campaign.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Replies */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Replies</h2>
          <div className="space-y-4">
            {recentReplies.map((reply, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF4EF' }}>
                  <span className="text-sm font-medium" style={{ color: '#FF5F1F' }}>{reply.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900">{reply.name}</div>
                    <div className="text-xs text-gray-500">{reply.time}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{reply.phone}</div>
                  <div className="text-sm text-gray-900">{reply.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
