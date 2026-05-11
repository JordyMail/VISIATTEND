import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { pointApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

const MEDALS = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

interface LeaderboardMember {
  member_pk_id: number;
  full_name: string;
  user_id: string;
  total_points: number;
  total_correct_answers: number;
  total_hadir: number;
  attendance_percentage: number;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await pointApi.getLeaderboard(50);
      setLeaderboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load point leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && leaderboardData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Ranking poin seluruh user. Poin terbanyak ada di peringkat pertama.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : leaderboardData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Belum ada data poin user</p>
        </Card>
      ) : (
        <>
          {/* Top 3 Winners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboardData.slice(0, 3).map((member, index) => (
              <Card key={member.member_pk_id} className="p-6 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 text-8xl opacity-10">
                  {MEDALS[index + 1 as keyof typeof MEDALS]}
                </div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl mb-2">
                    {MEDALS[index + 1 as keyof typeof MEDALS]}
                  </div>
                  <div className="mb-4">
                    <p className="font-semibold text-lg">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground">{member.user_id}</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        {member.total_points}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Poin</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.total_correct_answers} jawaban benar
                    </div>
                    <Progress value={member.attendance_percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">Kehadiran {member.attendance_percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Full Leaderboard Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold">Rank</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Member ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Points</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Correct</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((member, index) => (
                    <tr key={member.member_pk_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-semibold">
                          {index < 3 ? (
                            <span className="text-xl">{MEDALS[index + 1 as keyof typeof MEDALS]}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{member.full_name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.user_id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-600">
                          {member.total_points}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-green-500/20 text-green-600">
                          {member.total_correct_answers}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Progress value={member.attendance_percentage} className="h-2" />
                          </div>
                          <span className="text-sm font-medium min-w-12">
                            {member.attendance_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}