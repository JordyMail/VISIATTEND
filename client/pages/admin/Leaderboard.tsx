// client/pages/admin/Leaderboard.tsx
import { useState, useEffect } from "react";
import { Trophy, Medal, Zap, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberLeaderboardApi } from "@/services/api";
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

export default function AdminLeaderboardPage() {
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

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Leaderboard Admin
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Peringkat seluruh anggota berdasarkan akumulasi poin
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Belum ada data poin anggota</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return <div key={idx} />;
              const rank = idx + 1;
              return (
                <Card key={entry.member_id} 
                  className={`text-center overflow-hidden border-2 relative ${
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
                    <p className="text-xs text-muted-foreground truncate">ID: {entry.member_id}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {entry.category}
                      </Badge>
                    </div>
                    
                    {/* Points display */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Total Poin</span>
                      <span className="text-3xl font-black text-purple-600 mt-1">{entry.points || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Peringkat Lengkap Anggota</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-sm font-semibold text-slate-700">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">ID Anggota</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3 text-center">Terakhir Update</th>
                    <th className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Zap className="w-3 h-3 text-purple-500" /> Poin
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={entry.member_id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-muted-foreground">#{rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {entry.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{entry.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {entry.member_id}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline">{entry.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                          {entry.updated_at ? new Date(entry.updated_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-purple-600 text-lg">
                          {entry.points || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}