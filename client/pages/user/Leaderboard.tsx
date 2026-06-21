// client/pages/user/Leaderboard.tsx
import { useState, useEffect } from "react";
import { Trophy, Medal, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberLeaderboardApi } from "@/services/api";
import { getSessionUser } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

interface LeaderboardEntry {
  member_id: string;
  full_name: string;
  category: string;
  points: number;
  updated_at: string;
  rank: number;
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function UserLeaderboard() {
  const me = getSessionUser();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await memberLeaderboardApi.getLeaderboard();
      if (r.data && r.data.success) {
        setData(r.data.data);
      } else {
        setData([]);
      }
    } catch {
      toast({ title: "Error", description: "Gagal memuat leaderboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const myData = data.find((d) => d.full_name.toLowerCase() === me?.full_name?.toLowerCase());
  const myRank = myData ? myData.rank : -1;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard Anggota
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ranking poin seluruh anggota organisasi</p>
      </div>

      {myData && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {myRank <= 3 && myRank > 0 ? MEDALS[myRank] : `#${myRank}`}
                </div>
                <div>
                  <p className="font-semibold">Ranking Kamu: #{myRank}</p>
                  <p className="text-sm text-muted-foreground">
                    Kategori: {myData.category}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{myData.points} Poin</p>
                <p className="text-xs text-muted-foreground">Total akumulasi</p>
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
            <p className="text-muted-foreground">Belum ada data poin</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((idx) => {
                const entry = top3[idx];
                if (!entry) return <div key={idx} />;
                const rank = idx + 1;
                const isMe = entry.full_name.toLowerCase() === me?.full_name?.toLowerCase();
                return (
                  <Card key={entry.member_id}
                    className={`text-center relative overflow-hidden ${isMe ? "border-primary" : ""} ${rank === 1 ? "md:scale-105" : ""}`}>
                    <div className="absolute -top-6 -right-6 text-7xl opacity-10">{MEDALS[rank]}</div>
                    <CardContent className="p-4 relative z-10">
                      <div className="text-3xl mb-2">{MEDALS[rank]}</div>
                      <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm
                        ${rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-gray-400" : "bg-amber-600"}`}>
                        {entry.full_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-sm truncate">{entry.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.category}</p>
                      <p className="text-xl font-bold text-primary mt-2">{entry.points} Poin</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

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
                    <thead className="bg-muted/50 text-left text-sm font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Zap className="w-3 h-3 text-purple-500" /> Poin
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((entry, idx) => {
                        const rank = idx + 4;
                        const isMe = entry.full_name.toLowerCase() === me?.full_name?.toLowerCase();
                        return (
                          <tr key={entry.member_id}
                            className={`border-b last:border-0 transition-colors text-left text-slate-700
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
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{entry.category}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-purple-600 text-lg">
                              {entry.points}
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