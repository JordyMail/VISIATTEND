// client/pages/admin/Dashboard.tsx
import { useState, useEffect } from "react";
import { Users, BookOpen, CalendarCheck, TrendingUp, Clock, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { dashboardApi, attendanceApi } from "@/services/api";
import { getSessionUser } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

interface DashboardStats {
  totalMembers: number; activeEvents: number; attendanceRate: number;
  todayAttendance: { checkedIn: number; pending: number; absent: number };
}

export default function AdminDashboard() {
  const me = getSessionUser();
  const { language, t } = useLanguage();
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [trend, setTrend]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sR, aR, tR] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentActivities(8),
          attendanceApi.getTrend(7),
        ]);
        setStats(sR.data.data);
        setActivities(aR.data.data);
        setTrend(tR.data.data);
      } catch {
        toast({ title: t("error"), description: `${t("error")}: ${t("dashboard")}`, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("morning");
    if (h < 17) return t("afternoon");
    return t("evening");
  };

  const ACTION_COLOR: Record<string, string> = {
    LOGIN:                "bg-green-100 text-green-700",
    LOGOUT:               "bg-gray-100 text-gray-700",
    CREATE_USER:          "bg-blue-100 text-blue-700",
    UPDATE_USER:          "bg-yellow-100 text-yellow-700",
    DELETE_USER:          "bg-red-100 text-red-700",
    MANUAL_ATTENDANCE:    "bg-purple-100 text-purple-700",
    UPDATE_ATTENDANCE:    "bg-orange-100 text-orange-700",
    CREATE_EVENT:         "bg-cyan-100 text-cyan-700",
    GENERATE_REPORT:      "bg-indigo-100 text-indigo-700",
    CREATE_ANNOUNCEMENT:  "bg-pink-100 text-pink-700",
  };

  const maxTrend = Math.max(...trend.map((t) => t.present || 0), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {greeting()}, {me?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("adminDashboard")} · {new Date().toLocaleDateString(language === "en" ? "en-US" : "id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("totalMember"), value: stats?.totalMembers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: t("activeEvent"), value: stats?.activeEvents ?? 0, icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
          { label: t("presentToday"), value: `${stats?.todayAttendance.checkedIn ?? 0}/${stats?.totalMembers ?? 0}`, icon: CalendarCheck, color: "text-purple-600", bg: "bg-purple-50" },
          { label: t("attendanceRate"), value: `${stats?.attendanceRate ?? 0}%`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today attendance bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{t("todayAttendance")}</h3>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> {t("present")}: {stats?.todayAttendance.checkedIn}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> {t("pending")}: {stats?.todayAttendance.pending}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {t("absent")}: {stats?.todayAttendance.absent}</span>
            </div>
          </div>
          <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
            {(stats?.totalMembers ?? 0) > 0 && (
              <>
                <div className="bg-green-500 transition-all"
                  style={{ width: `${((stats?.todayAttendance.checkedIn ?? 0) / (stats?.totalMembers ?? 1)) * 100}%` }} />
                <div className="bg-yellow-400 transition-all"
                  style={{ width: `${((stats?.todayAttendance.pending ?? 0) / (stats?.totalMembers ?? 1)) * 100}%` }} />
                <div className="bg-red-400 transition-all"
                  style={{ width: `${((stats?.todayAttendance.absent ?? 0) / (stats?.totalMembers ?? 1)) * 100}%` }} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance trend (7 days) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> {t("attendanceTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
            ) : trend.map((t) => (
              <div key={t.attendance_date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                  {new Date(t.attendance_date).toLocaleDateString("id-ID", { weekday:"short", day:"numeric", month:"short" })}
                </span>
                <div className="flex-1">
                  <Progress value={(t.present / maxTrend) * 100} className="h-5" />
                </div>
                <span className="text-xs font-medium w-8 text-right">{t.present}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t("recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noActivity")}</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${ACTION_COLOR[a.action] || "bg-gray-100 text-gray-700"}`}>
                      {a.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.user_name || t("systemUser")} · {new Date(a.created_at).toLocaleString(language === "en" ? "en-US" : "id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}