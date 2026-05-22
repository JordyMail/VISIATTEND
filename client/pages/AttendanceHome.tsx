import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, CalendarDays, Camera, Shield, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceApi, dashboardApi, eventApi, userApi } from "@/services/api";

interface AttendanceOverview {
  totalMembers: number;
  activeEvents: number;
  checkedIn: number;
  pending: number;
  absent: number;
  attendanceRate: number;
}

const formatRate = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const extractPayload = <T,>(result: PromiseSettledResult<any>) => {
  if (result.status !== "fulfilled") {
    return undefined as T | undefined;
  }

  return (result.value?.data?.data ?? result.value?.data) as T;
};

export default function AttendanceHome() {
  const [overview, setOverview] = useState<AttendanceOverview>({
    totalMembers: 0,
    activeEvents: 0,
    checkedIn: 0,
    pending: 0,
    absent: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);

      const [membersResult, dashboardResult, todayResult] = await Promise.allSettled([
        userApi.getAll({ role: "member", isActive: true }),
        dashboardApi.getStats(),
        attendanceApi.getTodayStats(),
      ]);

      const members = Array.isArray(extractPayload<any>(membersResult))
        ? (extractPayload<any[]>(membersResult) ?? [])
        : [];
      const dashboardPayload = extractPayload<any>(dashboardResult) ?? {};
      const todayPayload = extractPayload<any>(todayResult) ?? {};
      const dashboardToday = dashboardPayload?.todayAttendance ?? {};

      const totalMembers = pickNumber(dashboardPayload?.totalMembers, members.length);
      const activeEventCount = pickNumber(dashboardPayload?.activeEvents);
      const checkedIn = pickNumber(
        dashboardToday?.checkedIn,
        todayPayload?.checkedIn,
        todayPayload?.present,
        todayPayload?.present_count,
      );
      const absent = pickNumber(
        dashboardToday?.absent,
        todayPayload?.absent,
        todayPayload?.absent_count,
      );
      const pending = pickNumber(
        dashboardToday?.pending,
        todayPayload?.pending,
        Math.max(totalMembers - checkedIn - absent, 0),
      );
      const calculatedRate = totalMembers > 0 ? (checkedIn / totalMembers) * 100 : 0;
      const attendanceRate = pickNumber(dashboardPayload?.attendanceRate, calculatedRate);

      setOverview({
        totalMembers,
        activeEvents: activeEventCount,
        checkedIn,
        pending,
        absent,
        attendanceRate,
      });
      setLoading(false);
    };

    fetchOverview();
  }, []);

  const quickStats = [
    {
      label: "Member aktif",
      value: overview.totalMembers,
      icon: Users,
    },
    {
      label: "Event aktif",
      value: overview.activeEvents,
      icon: CalendarDays,
    },
    {
      label: "Sudah check-in",
      value: overview.checkedIn,
      icon: Activity,
    },
    {
      label: "Attendance rate",
      value: formatRate(overview.attendanceRate),
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.22),_transparent_26%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.98))] p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-[#7c4dff] via-[#4f7cff] to-[#60a5fa] px-5 py-6 text-white shadow-[0_32px_90px_-42px_rgba(79,70,229,0.85)] sm:px-8 sm:py-8"
        >
          <div className="absolute -left-10 top-12 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -right-12 -top-8 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute bottom-[-52px] left-1/3 h-28 w-28 rounded-full bg-sky-200/15 blur-sm" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-5">
              <Badge className="border-0 bg-white/15 px-3 py-1 text-white backdrop-blur-sm">
                <Shield className="mr-1 h-3.5 w-3.5" />
                Secure attendance workspace
              </Badge>

              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                  Dashboard Home Attendance RESC
                </h1>
                <p className="max-w-2xl text-sm text-white/82 sm:text-base">
                  Dashboard Home Attendance RESC
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-2xl bg-white px-6 text-primary hover:bg-white/90">
                  <Link to="/attendance">
                    Buka Attendance
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-2xl border-white/30 bg-white/10 px-6 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link to="/leaderboard">Lihat Leaderboard</Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {quickStats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-white/80">{stat.label}</span>
                        <Icon className="h-4 w-4 text-white/90" />
                      </div>
                      <p className="text-2xl font-semibold">{stat.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card className="rounded-[28px] border border-white/25 bg-white/12 text-white shadow-none backdrop-blur-md">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm text-white/75">Spotlight module</p>
                    <h2 className="text-2xl font-semibold">Face Attendance</h2>
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl bg-slate-950/16 p-5">
                  <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Check-in hari ini</span>
                    <span>{overview.checkedIn} orang</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(12, overview.attendanceRate || 12))}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-white/85">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-white/65">Pending</p>
                      <p className="mt-1 text-xl font-semibold">{overview.pending}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <p className="text-white/65">Absent</p>
                      <p className="mt-1 text-xl font-semibold">{overview.absent}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </motion.section>
      </div>
    </div>
  );
}