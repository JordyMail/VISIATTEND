// client/pages/admin/Leaderboard.tsx
// Karena ini menggunakan UserLeaderboard, kita update UserLeaderboard saja

// Atau buat versi admin yang lebih detail:
import { useState, useEffect } from "react";
import { Trophy, Medal, Star, Award, Target, Zap } from "lucide-react";
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
  user_id: number;
  full_name: string;
  member_id: string;
  jabatan?: string;
  division?: string;
  avatar_url?: string;
  total_present: number;
  total_late: number;
  total_records: number;
  attendance_percentage: number;
  question_points: number;
  questions_answered: number;
  correct_answers: number;
  streak_count: number;
  combined_score: number;
}

interface Event { 
  id: number; 
  event_code: string; 
  event_name: string; 
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function AdminLeaderboardPage() {
  const me = getSessionUser();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("all");
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

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

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Ranking member berdasarkan kehadiran & poin quiz
        </p>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Belum ada data</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return <div key={idx} />;
              const rank = idx + 1;
              return (
                <Card key={entry.user_id} 
                  className={`text-center overflow-hidden border-2 ${
                    rank === 1 ? 'border-yellow-400 shadow-lg scale-105' : 
                    rank === 2 ? 'border-gray-300' : 'border-amber-600'
                  }`}>
                  <CardContent className="p-6">
                    <div className="text-4xl mb-2">{MEDALS[rank]}</div>
                    <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {entry.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-bold text-lg truncate">{entry.full_name}</p>
                    {entry.division && (
                      <p className="text-xs text-muted-foreground truncate">{entry.division}</p>
                    )}
                    
                    {/* Stats */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kehadiran</span>
                        <span className="font-bold">{entry.attendance_percentage}%</span>
                      </div>
                      <Progress value={entry.attendance_percentage} className="h-1.5" />
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quiz Poin</span>
                        <span className="font-bold text-purple-600">{entry.question_points || 0}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Skor</span>
                        <span className="font-bold text-primary text-lg">
                          {entry.combined_score?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Peringkat Lengkap</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Kehadiran</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Hadir</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3 text-purple-500" /> Poin Quiz
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" /> Skor Total
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry, idx) => {
                    const rank = idx + 4;
                    return (
                      <tr key={entry.user_id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-muted-foreground">#{rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {entry.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{entry.full_name}</p>
                              {entry.division && (
                                <p className="text-xs text-muted-foreground">{entry.division}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={entry.attendance_percentage} className="h-1.5 w-20" />
                            <span className="text-sm font-medium">{entry.attendance_percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            {entry.total_present} hadir
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="font-bold text-purple-600">{entry.question_points || 0}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({entry.correct_answers || 0}/{entry.questions_answered || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-primary text-lg">
                            {entry.combined_score?.toFixed(1) || '0.0'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Legend */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Sistem Penilaian:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span>Kehadiran = Persentase kehadiran (0-100)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Quiz = Poin dari menjawab soal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-600" />
                  <span>Total = Kehadiran + (Quiz × 0.1)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}