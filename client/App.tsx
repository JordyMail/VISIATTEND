import "./global.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouteGuard } from "./components/guards/RouteGuard";
import { getSession } from "@/lib/auth";

// Public
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";

// Shared layout
import AppLayout from "@/components/layout/AppLayout";
import { Layout } from "@/components/Layout";

// Super Admin pages
import SuperAdminDashboard from "@/pages/superadmin/Dashboard";
import SystemSettings from "@/pages/superadmin/SystemSettings";
import DivisionsPage from "@/pages/superadmin/Divisions";
import AuditLogs from "@/pages/superadmin/AuditLogs";
import RegularEventsPage from "@/pages/superadmin/RegularEvents";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import Members from "@/pages/Members";
import Events from "@/pages/Events";
import Attendance from "@/pages/Attendance";
import Reports from "@/pages/Reports";
import Announcements from "@/pages/admin/Announcements";
import QRManager from "@/pages/admin/QRManager";
import AdminLeaderboard from "@/pages/admin/Leaderboard";
import AdminSettings from "@/pages/Settings";
import QuestionsManagement from "@/pages/admin/Questions";

// User pages
import UserDashboard from "@/pages/user/Dashboard";
import UserProfile from "@/pages/user/Profile";
import UserAttendance from "@/pages/user/MyAttendance";
import UserCheckin from "@/pages/user/CheckIn";
import UserSchedules from "@/pages/user/Schedules";
import UserAnnouncements from "@/pages/user/Announcements";
import UserLeaderboard from "@/pages/user/Leaderboard";
import AnswerQuestion from "@/pages/user/AnswerQuestion";

// Attendance & face flow pages
import AttendanceDashboard from "./pages/AttendanceDashboard";
import Leaderboard from "./pages/Leaderboard";
import AttendanceHome from "./pages/AttendanceHome";
import AttendanceRegistration from "./pages/AttendanceRegistration";
import FaceRegistrationTraining from "./pages/FaceRegistrationTraining";
import FaceAttendance from "./pages/FaceAttendance";
import AttendanceUserDashboard from "./pages/UserDashboard";
import QuestionSistem from "./pages/QuestionSistem";

// Misc
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

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
          <Route path="regular-events" element={<RegularEventsPage />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="divisions" element={<DivisionsPage />} />
          <Route path="system" element={<SystemSettings />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="questions" element={<QuestionsManagement />} />
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
          <Route path="announcements" element={<Announcements />} />
          <Route path="qr" element={<QRManager />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leaderboard" element={<AdminLeaderboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="questions" element={<QuestionsManagement />} />
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
          <Route path="questions" element={<AnswerQuestion />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

            <Route
              path="/attendance"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <Layout hideHeader>
                    <AttendanceDashboard />
                  </Layout>
                </RouteGuard>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <Layout hideHeader>
                  <Leaderboard />
                </Layout>
              }
            />
            <Route
              path="/attendance/home"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <Layout hideHeader>
                    <AttendanceHome />
                  </Layout>
                </RouteGuard>
              }
            />
            <Route
              path="/attendance/registration"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <Layout hideHeader>
                    <AttendanceRegistration />
                  </Layout>
                </RouteGuard>
              }
            />
            <Route
              path="/attendance/face-registration"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <Layout hideHeader>
                    <FaceRegistrationTraining />
                  </Layout>
                </RouteGuard>
              }
            />
            <Route
              path="/attendance/face-attendance"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <Layout hideHeader>
                    <FaceAttendance />
                  </Layout>
                </RouteGuard>
              }
            />
            <Route
              path="/user-dashboard"
              element={
                <RouteGuard requiredRoles={["super_admin", "admin", "user", "attendance"]}>
                  <AppLayout role="user" />
                </RouteGuard>
              }
            >
              <Route index element={<AttendanceUserDashboard />} />
            </Route>

            <Route path="/question-sistem" element={<QuestionSistem />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
