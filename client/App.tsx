// client/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { RouteGuard } from "./components/guards/RouteGuard";
import { getSession } from "@/lib/auth";

// Public
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

// Shared layout
import AppLayout from "@/components/layout/AppLayout";

// Super Admin pages
import SuperAdminDashboard from "@/pages/superadmin/Dashboard";
import SystemSettings from "@/pages/superadmin/SystemSettings";
import DivisionsPage from "@/pages/superadmin/Divisions";
import AuditLogs from "@/pages/superadmin/AuditLogs";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import Members from "@/pages/Members";
import Events from "@/pages/Events";
import Attendance from "@/pages/Attendance";
import Reports from "@/pages/Reports";
import Schedules from "@/pages/admin/Schedules";
import Announcements from "@/pages/admin/Announcements";
import QRManager from "@/pages/admin/QRManager";
import AdminLeaderboard from "@/pages/admin/Leaderboard";
import AdminSettings from "@/pages/Settings";

// User pages
import UserDashboard from "@/pages/user/Dashboard";
import UserProfile from "@/pages/user/Profile";
import UserAttendance from "@/pages/user/MyAttendance";
import UserCheckin from "@/pages/user/CheckIn";
import UserSchedules from "@/pages/user/Schedules";
import UserAnnouncements from "@/pages/user/Announcements";
import UserLeaderboard from "@/pages/user/Leaderboard";

// Misc
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

/** Redirect "/" to the correct home page based on role */
function RoleHome() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  const { role } = session.user;
  if (role === "super_admin") return <Navigate to="/superadmin/dashboard" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/user/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Root redirect ── */}
        <Route path="/" element={<RoleHome />} />

        {/* ══ SUPER ADMIN ════════════════════════════════════════════════════ */}
        <Route
          path="/superadmin"
          element={
            <RouteGuard requiredRoles={["super_admin"]}>
              <AppLayout role="super_admin" />
            </RouteGuard>
          }
        >
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="events" element={<Events />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="divisions" element={<DivisionsPage />} />
          <Route path="system" element={<SystemSettings />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ══ ADMIN ══════════════════════════════════════════════════════════ */}
        <Route
          path="/admin"
          element={
            <RouteGuard requiredRoles={["super_admin", "admin"]}>
              <AppLayout role="admin" />
            </RouteGuard>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="events" element={<Events />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="qr" element={<QRManager />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ══ USER ═══════════════════════════════════════════════════════════ */}
        <Route
          path="/user"
          element={
            <RouteGuard requiredRoles={["super_admin", "admin", "user"]}>
              <AppLayout role="user" />
            </RouteGuard>
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="attendance" element={<UserAttendance />} />
          <Route path="checkin" element={<UserCheckin />} />
          <Route path="schedules" element={<UserSchedules />} />
          <Route path="announcements" element={<UserAnnouncements />} />
          <Route path="leaderboard" element={<UserLeaderboard />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}