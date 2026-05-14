// client/pages/superadmin/Dashboard.tsx
import { useState, useEffect } from "react";
import {
  Users, BookOpen, CalendarCheck, TrendingUp, ShieldCheck,
  Activity, Database, Settings, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { dashboardApi, userApi, attendanceApi } from "@/services/api";
import { getSessionUser } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

export default function SuperAdminDashboard() {
  const me  = getSessionUser();
  const nav = useNavigate();
  const [stats, setStats]         = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, users: 0 });
  const [trend, setTrend]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sR, aR, uR, tR] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentActivities(10),
          userApi.getAll(),
          attendanceApi.getTrend(7),
        ]);
        setStats(sR.data.data);
        setActivities(aR.data.data);
        setTrend(tR.data.data);
        const users = uR.data.data;
        setUserStats({
          total:  users.length,
          admins: users.filter((u: any) => u.role === "admin").length,
          users:  users.filter((u: any) => u.role === "user").length,
        });
      } catch { toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" }); }
      finally { setLoading(false); }
    })();
  }, []);

  const quickActions = [
    { label: "Tambah Admin",    icon: Users,    path: "/superadmin/members",    color: "bg-blue-500" },
    { label: "Buat Event",      icon: BookOpen, path: "/superadmin/events",     color: "bg-green-500" },
    { label: "Kelola Divisi",   icon: Settings, path: "/superadmin/divisions",  color: "bg-purple-500" },
    { label: "System Settings", icon: ShieldCheck, path: "/superadmin/system", color: "bg-orange-500" },
    { label: "Audit Log",       icon: Activity, path: "/superadmin/audit",      color: "bg-red-500" },
    { label: "Laporan",         icon: TrendingUp, path: "/superadmin/reports",  color: "bg-cyan-500" },
  ];

  const maxTrend = Math.max(...trend.map((t) => t.present || 0), 1);

  const ACTION_COLOR: Record<string, string> = {
    LOGIN:"bg-green-100 text-green-700", LOGOUT:"bg-gray-100 text-gray-700",
    CREATE_USER:"bg-blue-100 text-blue-700", DELETE_USER:"bg-red-100 text-red-700",
    MANUAL_ATTENDANCE:"bg-purple-100 text-purple-700", GENERATE_REPORT:"bg-indigo-100 text-indigo-700",
    UPDATE_SETTINGS:"bg-orange-100 text-orange-700", CREATE_EVENT:"bg-cyan-100 text-cyan-700",
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Selamat datang, {me?.full_name} · {new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Super Admin
        </Badge>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:"Total Member",    value: stats?.totalMembers ?? 0,  icon:Users,         color:"text-blue-600",   bg:"bg-blue-50" },
          { label:"Event Aktif",     value: stats?.activeEvents ?? 0,  icon:BookOpen,       color:"text-green-600",  bg:"bg-green-50" },
          { label:"Hadir Hari Ini",  value: `${stats?.todayAttendance?.checkedIn ?? 0}`,   icon:CalendarCheck, color:"text-purple-600", bg:"bg-purple-50" },
          { label:"Tingkat Kehadiran",value:`${stats?.attendanceRate ?? 0}%`, icon:TrendingUp, color:"text-orange-600", bg:"bg-orange-50" },
        ].map(({ label, value, icon:Icon, color, bg }) => (
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

      {/* User composition */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Komposisi Pengguna</h3>
            <Button variant="ghost" size="sm" onClick={() => nav("/superadmin/members")}>Kelola →</Button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label:"Admin",  count: userStats.admins, color:"bg-blue-500",   textColor:"text-blue-600" },
              { label:"Member", count: userStats.users,  color:"bg-green-500",  textColor:"text-green-600" },
              { label:"Total",  count: userStats.total,  color:"bg-gray-500",   textColor:"text-gray-600" },
            ].map(({ label, count, color, textColor }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          {userStats.total > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-blue-500  transition-all" style={{ width:`${(userStats.admins/userStats.total)*100}%` }} title="Admin" />
              <div className="bg-green-500 transition-all" style={{ width:`${(userStats.users/userStats.total)*100}%`  }} title="Member" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map(({ label, icon:Icon, path, color }) => (
                <button key={label} onClick={() => nav(path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors text-center group">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium leading-tight">{label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trend chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Tren Kehadiran 7 Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : trend.map((t) => (
              <div key={t.attendance_date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
                  {new Date(t.attendance_date).toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}
                </span>
                <div className="flex-1">
                  <Progress value={(t.present/maxTrend)*100} className="h-4" />
                </div>
                <span className="text-xs font-medium w-6 text-right">{t.present}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent activities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> Aktivitas Sistem Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => nav("/superadmin/audit")}>Lihat Semua →</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas</p>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${ACTION_COLOR[a.action] || "bg-gray-100 text-gray-700"}`}>
                    {a.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.user_name || "System"} · {new Date(a.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}