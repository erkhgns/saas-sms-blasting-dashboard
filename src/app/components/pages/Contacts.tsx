import { Search, Upload, Plus, MoreVertical } from "lucide-react";

const contacts = [
  { name: "Sarah Johnson", phone: "+1 (555) 234-5678", tags: ["VIP", "Active"] },
  { name: "Mike Chen", phone: "+1 (555) 876-5432", tags: ["Repeat Customer"] },
  { name: "Emily Davis", phone: "+1 (555) 345-6789", tags: ["New Lead"] },
  { name: "Robert Wilson", phone: "+1 (555) 567-8901", tags: ["VIP", "Trial"] },
  { name: "Jessica Martinez", phone: "+1 (555) 123-4567", tags: ["Active"] },
  { name: "David Brown", phone: "+1 (555) 789-0123", tags: ["Repeat Customer", "VIP"] },
  { name: "Amanda Taylor", phone: "+1 (555) 456-7890", tags: ["New Lead"] },
  { name: "Christopher Lee", phone: "+1 (555) 890-1234", tags: ["Active"] },
  { name: "Jennifer White", phone: "+1 (555) 234-5670", tags: ["Trial"] },
  { name: "Matthew Harris", phone: "+1 (555) 678-9012", tags: ["VIP", "Active"] },
];

const tagColors: Record<string, string> = {
  "VIP": "bg-purple-50 text-purple-700 border-purple-200",
  "Active": "bg-green-50 text-green-700 border-green-200",
  "Repeat Customer": "bg-blue-50 text-blue-700 border-blue-200",
  "New Lead": "bg-orange-50 text-orange-700 border-orange-200",
  "Trial": "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export function Contacts() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your contact database</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload className="w-5 h-5" />
            <span className="font-medium">Import CSV</span>
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-lg transition-colors shadow-sm"
            style={{ backgroundColor: '#FF5F1F' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E54E0F'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5F1F'}
          >
            <Plus className="w-5 h-5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" style={{ outline: 'none' }}
            />
          </div>
          <select className="px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white" style={{ outline: 'none' }}>
            <option>All Tags</option>
            <option>VIP</option>
            <option>Active</option>
            <option>Repeat Customer</option>
            <option>New Lead</option>
            <option>Trial</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left">
                <input type="checkbox" className="w-4 h-4 border-gray-300 rounded" style={{ accentColor: '#FF5F1F' }} />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone Number</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tags</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((contact, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input type="checkbox" className="w-4 h-4 border-gray-300 rounded" style={{ accentColor: '#FF5F1F' }} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF4EF' }}>
                      <span className="text-sm font-medium" style={{ color: '#FF5F1F' }}>{contact.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="font-medium text-gray-900">{contact.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900">{contact.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span key={tag} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tagColors[tag]}`}>
                        {tag}
                      </span>
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
          Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">10</span> of <span className="font-medium text-gray-900">15,230</span> contacts
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            Previous
          </button>
          <button
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#FF5F1F' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E54E0F'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5F1F'}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
