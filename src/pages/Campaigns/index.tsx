import { Search, Filter, Calendar, MoreVertical } from "lucide-react";
import { PageHeader, PrimaryButton, StatusBadge } from "@/components/common";
import { formatNumber } from "@/utils";
import type { Campaign } from "@/types";

const campaigns: Campaign[] = [
  { id: "1", name: "Flash Sale Alert", status: "Sent", recipients: 5240, deliveryRate: "99.2%", date: "Apr 24, 2026" },
  { id: "2", name: "Payment Reminder", status: "Sent", recipients: 3120, deliveryRate: "98.8%", date: "Apr 24, 2026" },
  { id: "3", name: "Welcome Series", status: "Scheduled", recipients: 1850, deliveryRate: "—", date: "Apr 25, 2026" },
  { id: "4", name: "Appointment Confirmation", status: "Sent", recipients: 892, deliveryRate: "99.8%", date: "Apr 23, 2026" },
  { id: "5", name: "Product Launch Teaser", status: "Draft", recipients: 0, deliveryRate: "—", date: "—" },
  { id: "6", name: "Customer Feedback Survey", status: "Sent", recipients: 4567, deliveryRate: "97.3%", date: "Apr 22, 2026" },
  { id: "7", name: "Birthday Wishes", status: "Scheduled", recipients: 234, deliveryRate: "—", date: "Apr 26, 2026" },
  { id: "8", name: "Order Confirmation", status: "Sent", recipients: 6789, deliveryRate: "99.5%", date: "Apr 23, 2026" },
  { id: "9", name: "Shipping Update", status: "Sent", recipients: 5432, deliveryRate: "98.9%", date: "Apr 22, 2026" },
  { id: "10", name: "Win-back Campaign", status: "Draft", recipients: 0, deliveryRate: "—", date: "—" },
];

export function Campaigns() {
  return (
    <div className="p-8">
      <PageHeader
        title="Campaigns"
        subtitle="Manage and track your SMS campaigns"
        actions={
          <PrimaryButton>+ New Campaign</PrimaryButton>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
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
              {["Campaign Name", "Status", "Recipients", "Delivery Rate", "Date", "Actions"].map((col, i) => (
                <th
                  key={col}
                  className={`px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider ${i === 5 ? "text-right" : "text-left"}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                <td className="px-6 py-4">
                  <StatusBadge label={campaign.status} />
                </td>
                <td className="px-6 py-4 text-gray-900">
                  {campaign.recipients > 0 ? formatNumber(campaign.recipients) : "—"}
                </td>
                <td className="px-6 py-4 text-gray-900">{campaign.deliveryRate}</td>
                <td className="px-6 py-4 text-gray-600">{campaign.date}</td>
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
          Showing <span className="font-medium text-gray-900">1</span> to{" "}
          <span className="font-medium text-gray-900">10</span> of{" "}
          <span className="font-medium text-gray-900">10</span> campaigns
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
