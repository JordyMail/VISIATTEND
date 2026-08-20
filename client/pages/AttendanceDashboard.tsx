import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceApi, attendanceScheduleApi } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

interface DashboardOverview {
  totalMembers: number;
  activeEvents: number;
  checkedIn: number;
  pending: number;
  absent: number;
  attendanceRate: number;
}

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const normalizeArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (Array.isArray((value as { items?: unknown[] } | null | undefined)?.items)) {
    return ((value as { items?: unknown[] }).items ?? []) as T[];
  }

  if (Array.isArray((value as { rows?: unknown[] } | null | undefined)?.rows)) {
    return ((value as { rows?: unknown[] }).rows ?? []) as T[];
  }

  return [];
};

const extractPayload = <T,>(result: PromiseSettledResult<any>) => {
  if (result.status !== "fulfilled") {
    return undefined as T | undefined;
  }

  return (result.value?.data?.data ?? result.value?.data) as T;
};

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<DashboardOverview>({
    totalMembers: 0,
    activeEvents: 0,
    checkedIn: 0,
    pending: 0,
    absent: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    attendanceScheduleApi.checkToday()
      .then((r) => setIsAttendanceOpen(r.data.isOpen))
      .catch(() => setIsAttendanceOpen(false));
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      const [overviewResult] = await Promise.allSettled([
        attendanceApi.getPublicOverview(),
      ]);

      const dashboardPayload = extractPayload<any>(overviewResult) ?? {};
      const dashboardToday = dashboardPayload?.todayAttendance ?? {};

      const totalMembers = pickNumber(dashboardPayload?.totalMembers);
      const activeEvents = pickNumber(dashboardPayload?.activeEvents);
      const checkedIn = pickNumber(
        dashboardToday?.checkedIn,
      );
      const absent = pickNumber(
        dashboardToday?.absent,
      );
      const pending = pickNumber(
        dashboardToday?.pending,
        Math.max(totalMembers - checkedIn - absent, 0),
      );
      const attendanceRate = pickNumber(
        dashboardPayload?.attendanceRate,
        totalMembers > 0 ? (checkedIn / totalMembers) * 100 : 0,
      );

      setOverview({
        totalMembers,
        activeEvents,
        checkedIn,
        pending,
        absent,
        attendanceRate,
      });
    };

    fetchDashboard();
  }, []);

  const stats = [
    { label: t("activeMember"), value: overview.totalMembers, icon: Users },
    { label: t("activeEvent"), value: overview.activeEvents, icon: CalendarDays },
    { label: t("checkedIn"), value: overview.checkedIn, icon: Activity },
    {
      label: t("attendanceRateLabel"),
      value: `${overview.attendanceRate.toFixed(1)}%`,
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.18),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.20),_transparent_26%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] p-4 md:p-8">

      {/* ── Attendance Closed Overlay ─────────────────────────────────── */}
      {isAttendanceOpen === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <CalendarDays className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("attendanceNotOpen")}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {t("attendanceNotOpenDescription")}
            </p>
            <button
              onClick={() => navigate("/attendance/home")}
              className="mt-6 w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              ← {t("backHome")}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-r from-[#7c4dff] via-[#5968ff] to-[#5da2ff] px-6 py-8 text-white shadow-[0_28px_90px_-48px_rgba(79,70,229,0.8)] md:px-8">
          <div className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -right-8 top-0 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <Badge className="w-fit border-0 bg-white/15 px-3 py-1 text-white backdrop-blur-sm">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {t("attendanceControlCenter")}
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                  {t("attendanceDashboardTitle")}
                </h1>
                <p className="max-w-2xl text-sm text-white/85 sm:text-base">
                  {t("attendanceDashboardDescription")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg" className="h-14 justify-between rounded-2xl bg-white px-5 text-primary hover:bg-white/90">
                  <Link to="/attendance/registration">
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      {t("startRegistration")}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 justify-between rounded-2xl border-white/30 bg-white/10 px-5 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link to="/attendance/face-attendance">
                    <span className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      {t("startAttendance")}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="rounded-[28px] border border-white/25 bg-white/12 text-white shadow-none backdrop-blur-md">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm text-white/75">{t("statusToday")}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{t("liveAttendanceSummary")}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div key={stat.label} className="rounded-2xl bg-white/10 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm text-white/75">{stat.label}</span>
                          <Icon className="h-4 w-4 text-white/85" />
                        </div>
                        <p className="text-2xl font-semibold">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-2xl bg-slate-950/15 p-4 text-sm text-white/85">
                  {t("pendingPeople")}: {overview.pending} • {t("absentPeople")}: {overview.absent}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}