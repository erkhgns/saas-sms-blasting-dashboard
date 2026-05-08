import { Search, Filter, Calendar, MoreVertical } from "lucide-react";

const campaigns = [
  { name: "Flash Sale Alert", status: "Sent", recipients: 5240, deliveryRate: "99.2%", date: "Apr 24, 2026" },
  { name: "Payment Reminder", status: "Sent", recipients: 3120, deliveryRate: "98.8%", date: "Apr 24, 2026" },
  { name: "Welcome Series", status: "Scheduled", recipients: 1850, deliveryRate: "—", date: "Apr 25, 2026" },
  { name: "Appointment Confirmation", status: "Sent", recipients: 892, deliveryRate: "99.8%", date: "Apr 23, 2026" },
  { name: "Product Launch Teaser", status: "Draft", recipients: 0, deliveryRate: "—", date: "—" },
  { name: "Customer Feedback Survey", status: "Sent", recipients: 4567, deliveryRate: "97.3%", date: "Apr 22, 2026" },
  { name: "Birthday Wishes", status: "Scheduled", recipients: 234, deliveryRate: "—", date: "Apr 26, 2026" },
  { name: "Order Confirmation", status: "Sent", recipients: 6789, deliveryRate: "99.5%", date: "Apr 23, 2026" },
  { name: "Shipping Update", status: "Sent", recipients: 5432, deliveryRate: "98.9%", date: "Apr 22, 2026" },
  { name: "Win-back Campaign", status: "Draft", recipients: 0, deliveryRate: "—", date: "—" },
];

const statusColors = {
  Sent: "bg-green-50 text-green-700 border-green-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Draft: "bg-gray-50 text-gray-700 border-gray-200",
};

export function Campaigns() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage and track your SMS campaigns</p>
        </div>
        <button
          className="px-5 py-2.5 text-white font-semibold rounded-lg transition-colors shadow-sm"
          style={{ backgroundColor: '#FF692E' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E55829'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF692E'}
        >
          + New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: 'none' }}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Date Range</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Campaign Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Recipients</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivery Rate</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map((campaign, index) => (
              <tr key={index} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{campaign.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[campaign.status as keyof typeof statusColors]}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{campaign.recipients > 0 ? campaign.recipients.toLocaleString() : "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{campaign.deliveryRate}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-600">{campaign.date}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">10</span> of <span className="font-medium text-gray-900">10</span> campaigns
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Previous
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
