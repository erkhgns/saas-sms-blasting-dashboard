import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Send, BarChart3, Users, MessageSquare,
  FileText, Settings, ChevronDown, ScrollText, LogOut,
} from "lucide-react";
import logoMark from "/logo-mark@2x.png";
import { BRAND, authStore } from "@/utils";
import { authService } from "@/services/auth.service";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/send", label: "Send SMS", icon: Send },
  { path: "/campaigns", label: "Campaigns", icon: BarChart3 },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/inbox", label: "Inbox", icon: MessageSquare },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/logs", label: "SMS Logs", icon: ScrollText },
  { path: "/settings", label: "Settings", icon: Settings },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const user = authStore.getUser();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

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
                  isActive ? "text-gray-900" : "text-gray-700 hover:bg-gray-50"
                }`
              }
              style={({ isActive }) => (isActive ? { backgroundColor: BRAND.primaryLight } : {})}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5" style={{ color: isActive ? BRAND.primary : "#6b7280" }} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer — user info + logout */}
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: BRAND.primary }}>
              <span className="text-xs font-semibold text-white">
                {user ? getInitials(user.name) : "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.name ?? "—"}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email ?? "—"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex-1" />

          {/* User profile — click to go to Settings */}
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.name ?? "—"}</div>
              <div className="text-xs text-gray-500">{user?.email ?? "—"}</div>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: BRAND.primary }}
            >
              <span className="text-sm font-medium text-white">
                {user ? getInitials(user.name) : "?"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
