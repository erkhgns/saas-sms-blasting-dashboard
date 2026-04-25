import { Search, Upload, Plus, MoreVertical } from "lucide-react";
import { PageHeader, PrimaryButton, AvatarInitials, StatusBadge } from "@/components/common";
import { CONTACT_TAGS } from "@/utils";
import type { Contact } from "@/types";

const contacts: Contact[] = [
  { id: "1", name: "Sarah Johnson", phone: "+1 (555) 234-5678", tags: ["VIP", "Active"], createdAt: "" },
  { id: "2", name: "Mike Chen", phone: "+1 (555) 876-5432", tags: ["Repeat Customer"], createdAt: "" },
  { id: "3", name: "Emily Davis", phone: "+1 (555) 345-6789", tags: ["New Lead"], createdAt: "" },
  { id: "4", name: "Robert Wilson", phone: "+1 (555) 567-8901", tags: ["VIP", "Trial"], createdAt: "" },
  { id: "5", name: "Jessica Martinez", phone: "+1 (555) 123-4567", tags: ["Active"], createdAt: "" },
  { id: "6", name: "David Brown", phone: "+1 (555) 789-0123", tags: ["Repeat Customer", "VIP"], createdAt: "" },
  { id: "7", name: "Amanda Taylor", phone: "+1 (555) 456-7890", tags: ["New Lead"], createdAt: "" },
  { id: "8", name: "Christopher Lee", phone: "+1 (555) 890-1234", tags: ["Active"], createdAt: "" },
  { id: "9", name: "Jennifer White", phone: "+1 (555) 234-5670", tags: ["Trial"], createdAt: "" },
  { id: "10", name: "Matthew Harris", phone: "+1 (555) 678-9012", tags: ["VIP", "Active"], createdAt: "" },
];

export function Contacts() {
  return (
    <div className="p-8">
      <PageHeader
        title="Contacts"
        subtitle="Manage your contact database"
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              <Upload className="w-5 h-5" />
              <span className="font-medium">Import CSV</span>
            </button>
            <PrimaryButton>
              <Plus className="w-5 h-5" />
              Add Contact
            </PrimaryButton>
          </>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
              style={{ outline: "none" }}
            />
          </div>
          <select className="px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white" style={{ outline: "none" }}>
            <option value="">All Tags</option>
            {CONTACT_TAGS.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left">
                <input type="checkbox" className="w-4 h-4 border-gray-300 rounded" style={{ accentColor: "#FF5F1F" }} />
              </th>
              {["Name", "Phone Number", "Tags", "Actions"].map((col, i) => (
                <th
                  key={col}
                  className={`px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider ${i === 3 ? "text-right" : "text-left"}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input type="checkbox" className="w-4 h-4 border-gray-300 rounded" style={{ accentColor: "#FF5F1F" }} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={contact.name} size="md" />
                    <div className="font-medium text-gray-900">{contact.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900">{contact.phone}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <StatusBadge key={tag} label={tag} variant="tag" />
                    ))}
                  </div>
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
          Showing <span className="font-medium text-gray-900">1</span> to{" "}
          <span className="font-medium text-gray-900">10</span> of{" "}
          <span className="font-medium text-gray-900">15,230</span> contacts
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Previous
          </button>
          <PrimaryButton className="px-4 py-2">Next</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
