// client/components/layout/AppLayout.tsx
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, ClipboardList, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Megaphone,
  QrCode, ListChecks, Trophy, ShieldCheck, Layers, FileText,
  UserCircle, CheckSquare, BookOpen, Bell, Menu, X,
} from "lucide-react";
import { getSession, clearSession } from "@/lib/auth";
import { authApi } from "@/services/api"; 
import type { AppRole } from "@/lib/auth";

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

const SUPER_ADMIN_NAV: NavItem[] = [
  { to: "/superadmin/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/superadmin/members",       icon: Users,           label: "Members" },
  { to: "/superadmin/events",        icon: Calendar,        label: "Events" },
  { to: "/superadmin/attendance",    icon: ClipboardList,   label: "Attendance" },
  { to: "/superadmin/schedules",     icon: BookOpen,        label: "Schedules" },
  { to: "/superadmin/announcements", icon: Megaphone,       label: "Announcements" },
  { to: "/superadmin/reports",       icon: BarChart3,       label: "Reports" },
  { to: "/superadmin/leaderboard",   icon: Trophy,          label: "Leaderboard" },
  { to: "/superadmin/divisions",     icon: Layers,          label: "Divisions" },
  { to: "/superadmin/audit",         icon: FileText,        label: "Audit Logs" },
  { to: "/superadmin/system",        icon: ShieldCheck,     label: "System" },
  { to: "/superadmin/settings",      icon: Settings,        label: "Settings" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/members",       icon: Users,           label: "Members" },
  { to: "/admin/events",        icon: Calendar,        label: "Events" },
  { to: "/admin/attendance",    icon: ClipboardList,   label: "Attendance" },
  { to: "/admin/schedules",     icon: BookOpen,        label: "Schedules" },
  { to: "/admin/announcements", icon: Megaphone,       label: "Announcements" },
  { to: "/admin/qr",            icon: QrCode,          label: "QR Manager" },
  { to: "/admin/reports",       icon: BarChart3,       label: "Reports" },
  { to: "/admin/leaderboard",   icon: Trophy,          label: "Leaderboard" },
  { to: "/admin/settings",      icon: Settings,        label: "Settings" },
];

const USER_NAV: NavItem[] = [
  { to: "/user/dashboard",     icon: LayoutDashboard, label: "Home" },
  { to: "/user/checkin",       icon: CheckSquare,     label: "Check In" },
  { to: "/user/attendance",    icon: ListChecks,      label: "My Attendance" },
  { to: "/user/schedules",     icon: BookOpen,        label: "Schedules" },
  { to: "/user/announcements", icon: Bell,            label: "Announcements" },
  { to: "/user/leaderboard",   icon: Trophy,          label: "Leaderboard" },
  { to: "/user/profile",       icon: UserCircle,      label: "Profile" },
];

const NAV_MAP: Record<AppRole, NavItem[]> = {
  super_admin: SUPER_ADMIN_NAV,
  admin:       ADMIN_NAV,
  user:        USER_NAV,
};

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  user:        "Member",
};

const ROLE_COLOR: Record<AppRole, string> = {
  super_admin: "bg-purple-600",
  admin:       "bg-blue-600",
  user:        "bg-green-600",
};

interface Props { role: AppRole; }

export default function AppLayout({ role }: Props) {
  const navigate = useNavigate();
  const session  = getSession();
  const user     = session?.user;
  const navItems = NAV_MAP[role] || USER_NAV;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearSession();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`
      flex flex-col bg-gray-900 text-white transition-all duration-300
      ${mobile ? "w-72 h-full" : (collapsed ? "w-16" : "w-64")}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 min-h-[64px]">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg ${ROLE_COLOR[role]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">VISIATTEND</p>
              <p className="text-xs text-gray-400">{ROLE_LABEL[role]}</p>
            </div>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-700 transition-colors flex-shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-gray-700 p-3">
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full ${ROLE_COLOR[role]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium truncate text-white">{user?.full_name || "User"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.jabatan || user?.role}</p>
            </div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">VISIATTEND</span>
          <div className={`w-7 h-7 rounded-full ${ROLE_COLOR[role]} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}