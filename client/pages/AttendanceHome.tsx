import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Shield, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { attendanceApi, eventApi } from "@/services/api";

interface AttendanceOverview {
  totalMembers: number;
  activeEvents: number;
  checkedIn: number;
  pending: number;
  absent: number;
  attendanceRate: number;
}

interface EventItem {
  id: number;
  event_code: string;
  event_name: string;
  event_type: string;
  season: string;
  event_date?: string;
  description?: string;
  preacher_name?: string;
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  worship: "Ibadah",
  meeting: "Rapat",
  study: "Studi",
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
  const [activeEventList, setActiveEventList] = useState<EventItem[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);

      const [overviewResult, eventsResult] = await Promise.allSettled([
        attendanceApi.getPublicOverview(),
        eventApi.getAll({ isActive: true }),
      ]);

      const dashboardPayload = extractPayload<any>(overviewResult) ?? {};
      const eventsPayload = extractPayload<any[]>(eventsResult);
      const fetchedEvents: EventItem[] = Array.isArray(eventsPayload) ? eventsPayload : [];
      setActiveEventList(fetchedEvents);
      setCurrentEventIndex(0);
      const dashboardToday = dashboardPayload?.todayAttendance ?? {};

      const totalMembers = pickNumber(dashboardPayload?.totalMembers);
      const activeEventCount = pickNumber(dashboardPayload?.activeEvents);
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

  // Auto-slide carousel when more than 1 event
  useEffect(() => {
    if (activeEventList.length <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % activeEventList.length);
    }, 3500);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [activeEventList.length]);

  const goPrev = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    setCurrentEventIndex((prev) => (prev - 1 + activeEventList.length) % activeEventList.length);
  };

  const goNext = () => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    setCurrentEventIndex((prev) => (prev + 1) % activeEventList.length);
  };

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
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-white/80" />
                    <p className="text-sm font-medium text-white/80">Event Aktif</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-0.5 text-sm font-semibold">
                    {activeEventList.length}
                  </span>
                </div>

                {activeEventList.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-3xl bg-slate-950/16 p-6 text-center">
                    <p className="text-sm text-white/60">Belum ada event aktif saat ini.</p>
                  </div>
                ) : (
                  <div className="relative flex-1 overflow-hidden rounded-3xl bg-slate-950/16">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentEventIndex}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                        className="p-5"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                            {EVENT_TYPE_LABELS[activeEventList[currentEventIndex].event_type] ?? activeEventList[currentEventIndex].event_type}
                          </span>
                        </div>
                        <h3 className="mt-2 text-xl font-bold leading-snug">
                          {activeEventList[currentEventIndex].event_name}
                        </h3>
                        {activeEventList[currentEventIndex].event_date && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/80">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(activeEventList[currentEventIndex].event_date!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-white/55">{activeEventList[currentEventIndex].season}</p>
                        {activeEventList[currentEventIndex].description && (
                          <p className="mt-2 line-clamp-2 text-sm text-white/65">{activeEventList[currentEventIndex].description}</p>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {activeEventList.length > 1 && (
                      <>
                        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                          {activeEventList.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); setCurrentEventIndex(i); }}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === currentEventIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={goPrev}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-1 hover:bg-white/25"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={goNext}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-1 hover:bg-white/25"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.section>
      </div>
    </div>
  );
}