import { useState, useEffect } from "react";
import { Crown, Medal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { attendanceApi } from "@/services/api";

interface LeaderboardMember {
  user_id: number;
  full_name: string;
  member_id: string;
  total_present: number;
  total_late: number;
  attendance_percentage: number;
  points: number;
}

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

export default function Leaderboard() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getLeaderboard(undefined, period);
      setLeaderboardData(normalizeArray<LeaderboardMember>(response.data.data));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const displayRows = leaderboardData
    .sort((left, right) => (right.points ?? 0) - (left.points ?? 0));

  const podium = [displayRows[1], displayRows[0], displayRows[2]].filter(Boolean);
  const podiumStyles = [
    {
      rank: 2,
      card: "border-slate-200/90 bg-white/90 shadow-[0_20px_50px_-35px_rgba(71,85,105,0.55)]",
      medal: "bg-slate-100 text-slate-500",
    },
    {
      rank: 1,
      card: "border-amber-300/90 bg-gradient-to-br from-amber-50 to-white shadow-[0_25px_60px_-30px_rgba(245,158,11,0.7)]",
      medal: "bg-amber-100 text-amber-600",
    },
    {
      rank: 3,
      card: "border-orange-200/90 bg-white/90 shadow-[0_20px_50px_-35px_rgba(180,83,9,0.45)]",
      medal: "bg-orange-100 text-orange-600",
    },
  ];

  if (loading && leaderboardData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.18),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_22%),linear-gradient(180deg,_rgba(248,250,252,0.99),_rgba(241,245,249,0.98))] p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-[#8a3ffc] via-[#6b63ff] to-[#5da2ff] px-6 py-8 text-white shadow-[0_30px_90px_-50px_rgba(79,70,229,0.85)] md:px-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold md:text-5xl">Leaderboard</h1>
            <p className="mt-2 text-base text-white/85 md:text-lg">Top Attendance Rankings</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[30px] border border-white/60 bg-white/70 p-4 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Crown className="h-6 w-6 text-amber-500" />
            Top 3 Ranking
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            {podium.map((member, index) => {
              const style = podiumStyles[index];

              return (
                <Card
                  key={`${member.user_id}-${style.rank}`}
                  className={`relative overflow-hidden rounded-[28px] border p-5 ${style.card} ${style.rank === 1 ? "md:-translate-y-4" : ""}`}
                >
                  <div className="absolute left-4 top-4 text-4xl font-black text-slate-900">#{style.rank}</div>
                  <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full ${style.medal}`}>
                    <Medal className="h-5 w-5" />
                  </div>
                  <div className="mt-14 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold text-slate-900">{member.full_name}</h2>
                    <p className="mt-2 text-base text-slate-700">
                      Attendance: {member.total_present} days | Points: {member.points}
                    </p>
                  </div>
                </Card>
              );
            })}
            {!loading && podium.length === 0 && (
              <Card className="md:col-span-3 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center text-slate-500">
                Belum ada data leaderboard dari database user.
              </Card>
            )}
          </div>

          <Card className="rounded-[28px] border border-slate-200/80 bg-white/90 p-0 shadow-[0_25px_70px_-45px_rgba(148,163,184,0.8)]">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Attendance leaderboard table</p>
                <h3 className="text-lg font-semibold text-slate-900">Rank anggota berdasarkan kehadiran</h3>
              </div>
              <div className="w-full md:w-44">
                <Select value={period} onValueChange={(value) => setPeriod(value as "week" | "month")}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto px-2 py-2 md:px-4 md:py-4">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-sm font-semibold text-slate-700">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Attendance Count</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((member, index) => (
                    <tr key={member.user_id} className="border-t border-slate-100 text-slate-700 transition-colors hover:bg-slate-50/90">
                      <td className="px-4 py-3 font-semibold">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{member.full_name}</td>
                      <td className="px-4 py-3">{member.total_present}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{member.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}