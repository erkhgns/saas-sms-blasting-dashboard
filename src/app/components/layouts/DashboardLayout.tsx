import { Outlet, NavLink } from "react-router";
import { LayoutDashboard, Send, BarChart3, Users, MessageSquare, FileText, Settings, Bell, ChevronDown } from "lucide-react";
import logoMark from "/logo-mark@2x.png";

export function DashboardLayout() {
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { path: "/send", label: "Send SMS", icon: Send },
    { path: "/campaigns", label: "Campaigns", icon: BarChart3 },
    { path: "/contacts", label: "Contacts", icon: Users },
    { path: "/inbox", label: "Inbox", icon: MessageSquare },
    { path: "/reports", label: "Reports", icon: FileText },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img src={logoMark} alt="Gaby SMS" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-semibold text-gray-900">Gaby SMS</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: '#FCF4B5' } : {}}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" style={isActive ? { color: '#FF692E' } : { color: '#6b7280' }} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex-1"></div>

          <div className="flex items-center gap-6">
            {/* SMS Credits */}
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">12,450 Credits</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <button className="flex items-center gap-3 pl-3 pr-2 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">John Smith</div>
                  <div className="text-xs text-gray-500">Admin</div>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF692E' }}>
                  <span className="text-sm font-medium text-white">JS</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
