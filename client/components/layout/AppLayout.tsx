// client/components/layout/AppLayout.tsx
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, ClipboardList, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Megaphone,
  QrCode, ListChecks, Trophy, ShieldCheck, FileText,
  UserCircle, CheckSquare, Bell, Menu, X,
  HelpCircle, Camera,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSession, clearSession, setSession } from "@/lib/auth";
import { authApi } from "@/services/api";
import type { AppRole } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { clearCurrentAttendanceUser, clearPendingRegistrationProfile } from "@/lib/attendanceFlow";

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: TranslationKey;
};

const SUPER_ADMIN_NAV: NavItem[] = [
  { to: "/superadmin/dashboard",           icon: LayoutDashboard, label: "dashboard" },
  { to: "/superadmin/members",             icon: Users,           label: "members" },
  { to: "/superadmin/events",              icon: Calendar,        label: "events" },
  { to: "/superadmin/regular-events",      icon: Calendar,        label: "regularEvent" },
  { to: "/superadmin/announcements",       icon: Megaphone,       label: "announcements" },
  { to: "/superadmin/reports",             icon: BarChart3,       label: "reports" },
  { to: "/superadmin/leaderboard",         icon: Trophy,          label: "leaderboard" },
  { to: "/superadmin/audit",              icon: FileText,        label: "auditLogs" },
  { to: "/superadmin/system",              icon: ShieldCheck,     label: "system" },
  { to: "/superadmin/settings",            icon: Settings,        label: "settings" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard",            icon: LayoutDashboard, label: "dashboard" },
  { to: "/admin/members",              icon: Users,           label: "members" },
  { to: "/admin/events",               icon: Calendar,        label: "events" },
  { to: "/admin/announcements",        icon: Megaphone,       label: "announcements" },
  { to: "/admin/qr",                   icon: QrCode,          label: "qrManager" },
  { to: "/admin/reports",              icon: BarChart3,       label: "reports" },
  { to: "/admin/leaderboard",          icon: Trophy,          label: "leaderboard" },
  { to: "/admin/settings",             icon: Settings,        label: "settings" },
];

const ATTENDANCE_NAV: NavItem[] = [
  { to: "/attendance/home",            icon: LayoutDashboard, label: "attendanceHome" },
  { to: "/attendance/registration",    icon: ClipboardList,   label: "registration" },
  { to: "/attendance/face-registration", icon: Users,          label: "faceRegistration" },
  { to: "/attendance/face-attendance", icon: CheckSquare,     label: "faceAttendance" },
];

const USER_NAV: NavItem[] = [
  { to: "/user/dashboard",     icon: LayoutDashboard, label: "home" },
  { to: "/user/checkin",       icon: CheckSquare,     label: "checkIn" },
  { to: "/user/attendance",    icon: ClipboardList,   label: "myAttendance" },
  { to: "/user/schedules",     icon: Calendar,        label: "schedules" },
  { to: "/user/announcements", icon: Bell,            label: "announcements" },
  { to: "/user/leaderboard",   icon: Trophy,          label: "leaderboard" },
  { to: "/user/profile",       icon: UserCircle,      label: "profile" },
  { to: "/user/questions",     icon: HelpCircle,      label: "questions" },
];

const NAV_MAP: Record<AppRole, NavItem[]> = {
  super_admin: SUPER_ADMIN_NAV,
  admin:       ADMIN_NAV,
  user:        USER_NAV,
  attendance:  ATTENDANCE_NAV,
};

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  user:        "Member",
  attendance:  "Attendance",
};

const ROLE_COLOR: Record<AppRole, string> = {
  super_admin: "bg-purple-600",
  admin:       "bg-blue-600",
  user:        "bg-green-600",
  attendance:  "bg-emerald-600",
};

interface Props { role: AppRole; }

export default function AppLayout({ role }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const session  = getSession();
  const user     = session?.user;
  const navItems = NAV_MAP[role] || USER_NAV;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  const handleAttendanceModeConfirm = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearSession();
    // Set a temporary attendance session so RouteGuard allows /attendance/home
    setSession(
      {
        id: 0,
        email: "attendance@visiattend.local",
        full_name: "Attendance Operator",
        role: "attendance",
        permissions: [],
      },
      {
        accessToken: `attendance-${Date.now()}`,
        refreshToken: `attendance-refresh-${Date.now()}`,
      }
    );
    navigate("/attendance/home");
  };

  const handleLogout = async () => {
    if (role === "user") {
      try { await authApi.logout(); } catch { /* ignore */ }
      clearCurrentAttendanceUser();
      clearPendingRegistrationProfile();
    }
    else {
      try { await authApi.logout(); } catch { /* ignore */ }
    }
    clearSession();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`
      flex flex-col bg-gray-900 text-white transition-all duration-300
      ${mobile ? "w-72 h-full" : (collapsed ? "w-16" : "w-64")}
      flex-shrink-0
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 min-h-[64px] flex-shrink-0">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/logo-resc.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
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

      {/* Nav - FIXED: Added overflow-y-auto and flex-1 */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
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
            {(!collapsed || mobile) && <span className="truncate">{t(item.label)}</span>}
          </NavLink>
        ))}

        {/* Attendance Mode — only for admin and super_admin */}
        {(role === "admin" || role === "super_admin") && (
          <button
            onClick={() => setAttendanceDialogOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-emerald-400 hover:bg-emerald-600 hover:text-white"
          >
            <Camera className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || mobile) && <span className="truncate">{t("attendance")}</span>}
          </button>
        )}
      </nav>

      {/* User info + logout - FIXED: Added flex-shrink-0 */}
      <div className="border-t border-gray-700 p-3 flex-shrink-0">
        {(!collapsed || mobile) && role !== "user" ? (
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full ${ROLE_COLOR[role]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium truncate text-white">{user?.full_name || "User"}</p>
              <p className="text-xs text-gray-400 truncate">
                {role === "admin" ? "Admin" : role === "super_admin" ? "Super Admin" : user?.jabatan || user?.role}
              </p>
            </div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || mobile) && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Attendance Mode Confirmation Dialog */}
      <AlertDialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              {t("attendance")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("logout")} <strong>{role === "super_admin" ? t("superAdminDashboard") : t("adminDashboard")}</strong>. {t("homeAttendance")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAttendanceModeConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main layout */}
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-shrink-0">
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
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
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
            <div className="min-h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}