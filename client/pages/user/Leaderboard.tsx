// client/pages/user/Leaderboard.tsx
import { useState, useEffect } from "react";
import { Trophy, Medal, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { attendanceApi, eventApi } from "@/services/api";
import { getSessionUser } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

interface LeaderboardEntry {
  user_id: number; full_name: string; member_id: string;
  jabatan?: string; division?: string;
  total_present: number; total_late: number; total_records: number;
  attendance_percentage: number;
  question_points?: number;
  questions_answered?: number;
  correct_answers?: number;
}
interface Event { id: number; event_code: string; event_name: string; }

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function UserLeaderboard() {
  const me = getSessionUser();
  const [data, setData]         = useState<LeaderboardEntry[]>([]);
  const [events, setEvents]     = useState<Event[]>([]);
  const [eventId, setEventId]   = useState("all");
  const [period, setPeriod]     = useState("month");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    eventApi.getAll({ isActive: true }).then((r) => setEvents(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [eventId, period]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await attendanceApi.getLeaderboard(
        eventId !== "all" ? parseInt(eventId) : undefined,
        period,
      );
      setData(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat leaderboard", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const myRank = data.findIndex((d) => d.user_id === me?.id) + 1;
  const myData = data.find((d) => d.user_id === me?.id);

  const top3 = data.slice(0, 3);
  const rest  = data.slice(3);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard Kehadiran
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ranking kehadiran anggota organisasi</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3">
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger><SelectValue placeholder="Semua event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Event</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id.toString()}>{e.event_code} – {e.event_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Minggu Ini</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="semester">6 Bulan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* My rank highlight */}
      {myData && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {myRank <= 3 ? MEDALS[myRank] : `#${myRank}`}
                </div>
                <div>
                  <p className="font-semibold">Ranking Kamu: #{myRank}</p>
                  <p className="text-sm text-muted-foreground">
                    {myData.total_present} hadir · {myData.total_late} terlambat
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{myData.attendance_percentage}%</p>
                <p className="text-xs text-muted-foreground">Tingkat kehadiran</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Belum ada data kehadiran</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((idx) => {
                const entry = top3[idx];
                if (!entry) return <div key={idx} />;
                const rank = idx + 1;
                const isMe = entry.user_id === me?.id;
                return (
                  <Card key={entry.user_id}
                    className={`text-center relative overflow-hidden ${isMe ? "border-primary" : ""} ${rank === 1 ? "md:scale-105" : ""}`}>
                    <div className="absolute -top-6 -right-6 text-7xl opacity-10">{MEDALS[rank]}</div>
                    <CardContent className="p-4 relative z-10">
                      <div className="text-3xl mb-2">{MEDALS[rank]}</div>
                      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm
                        ${rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-gray-400" : "bg-amber-600"}`}>
                        {entry.full_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-sm truncate">{entry.full_name}</p>
                      {entry.division && <p className="text-xs text-muted-foreground truncate">{entry.division}</p>}
                      <p className="text-xl font-bold text-primary mt-2">{entry.attendance_percentage}%</p>
                      <Progress value={entry.attendance_percentage} className="h-1.5 mt-1" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="w-4 h-4" /> Selengkapnya
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">Kehadiran</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-3 h-3 text-purple-500" /> Poin
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((entry, idx) => {
                        const rank  = idx + 4;
                        const isMe  = entry.user_id === me?.id;
                        return (
                          <tr key={entry.user_id}
                            className={`border-b last:border-0 transition-colors
                              ${isMe ? "bg-primary/5 font-semibold" : "hover:bg-muted/50"}`}>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground font-medium">#{rank}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {entry.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm truncate">{entry.full_name}{isMe && " (Kamu)"}</p>
                                  <p className="text-xs text-muted-foreground">{entry.division || entry.jabatan || "-"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div>
                                <p className="font-bold text-primary">{entry.attendance_percentage}%</p>
                                <p className="text-xs text-muted-foreground">{entry.total_present} hadir</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-purple-600 text-sm">{entry.question_points || 0}</span>
                                {entry.questions_answered && entry.questions_answered > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {entry.correct_answers || 0}/{entry.questions_answered} benar
        </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}