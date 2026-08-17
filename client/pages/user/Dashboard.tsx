// client/pages/user/Dashboard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Clock, XCircle, Flame, TrendingUp, CalendarDays, Bell, Award,
} from "lucide-react";
import { attendanceApi, scheduleApi, announcementApi } from "@/services/api";
import { getSessionUser } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

interface Stats {
  total: number; present: number; points: number;
  attendance_percentage: number; streak: number;
}

interface Schedule {
  id: number; event_name: string; event_code: string; event_type: string;
  scheduled_date: string; start_time: string; end_time?: string; location?: string;
}

interface Announcement {
  id: number; title: string; body: string; pinned: boolean; created_at: string; author_name: string;
}

export default function UserDashboard() {
  const user = getSessionUser();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsR, schedR, annR] = await Promise.all([
          attendanceApi.getMyStats(),
          scheduleApi.getAll({ upcoming: true }),
          announcementApi.getAll(),
        ]);
        setStats(statsR.data.data);
        setSchedules(schedR.data.data.slice(0, 5));
        setAnnouncements(annR.data.data.slice(0, 4));
      } catch {
        toast({ title: "Error", description: "Failed to load dashboard", variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat Pagi";
    if (h < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  const EVENT_TYPE_COLOR: Record<string, string> = {
    worship: "bg-blue-100 text-blue-700",
    meeting: "bg-green-100 text-green-700",
    study:   "bg-purple-100 text-purple-700",
    fellowship: "bg-orange-100 text-orange-700",
    outreach:   "bg-red-100 text-red-700",
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {greeting()}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.jabatan && <span className="capitalize">{user.jabatan.replace(/_/g," ")}</span>}
          {user?.division && ` · ${user.division}`}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Hadir</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.present ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Point</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats?.points ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats?.streak ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="font-semibold">Tingkat Kehadiran</p>
            </div>
            <span className="text-2xl font-bold text-primary">
              {stats?.attendance_percentage ?? 0}%
            </span>
          </div>
          <Progress value={stats?.attendance_percentage ?? 0} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats?.total ?? 0} total sesi terdaftar
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming schedules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Jadwal Mendatang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal mendatang</p>
            ) : schedules.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.event_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(s.scheduled_date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}
                    {s.location ? ` · ${s.location}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${EVENT_TYPE_COLOR[s.event_type] || ""}`}>
                  {s.event_type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Pengumuman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada pengumuman</p>
            ) : announcements.map((a) => (
              <div key={a.id} className={`p-3 rounded-lg border ${a.pinned ? "border-yellow-300 bg-yellow-50" : "bg-muted/50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <span className="text-xs text-yellow-600 font-medium">📌 Penting</span>}
                  <p className="text-sm font-semibold">{a.title}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.author_name} · {new Date(a.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
