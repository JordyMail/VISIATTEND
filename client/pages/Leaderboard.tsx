// client/pages/LeaderBoard.tsx
import { useState, useEffect } from "react";
import { Crown, Medal, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memberLeaderboardApi } from "@/services/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

interface LeaderboardMember {
  member_id: string;
  full_name: string;
  category: string;
  points: number;
  updated_at: string;
  rank: number;
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await memberLeaderboardApi.getLeaderboard();
      if (response.data && response.data.success) {
        setLeaderboardData(response.data.data);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const displayRows = [...leaderboardData]
    .sort((left, right) => (right.points ?? 0) - (left.points ?? 0));

  const podiumStyles = {
    1: {
      card: "border-amber-300/90 bg-gradient-to-br from-amber-50 to-white shadow-[0_25px_60px_-30px_rgba(245,158,11,0.7)]",
      medal: "bg-amber-100 text-amber-600",
    },
    2: {
      card: "border-slate-200/90 bg-white/90 shadow-[0_20px_50px_-35px_rgba(71,85,105,0.55)]",
      medal: "bg-slate-100 text-slate-500",
    },
    3: {
      card: "border-orange-200/90 bg-white/90 shadow-[0_20px_50px_-35px_rgba(180,83,9,0.45)]",
      medal: "bg-orange-100 text-orange-600",
    },
  };

  const topThree = displayRows.slice(0, 3);
  const podiumData: { member: LeaderboardMember; rank: 1 | 2 | 3; style: typeof podiumStyles[1 | 2 | 3] }[] = [];
  
  if (topThree[1]) podiumData.push({ member: topThree[1], rank: 2, style: podiumStyles[2] });
  if (topThree[0]) podiumData.push({ member: topThree[0], rank: 1, style: podiumStyles[1] });
  if (topThree[2]) podiumData.push({ member: topThree[2], rank: 3, style: podiumStyles[3] });

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
        <section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-[#8a3ffc] via-[#6b63ff] to-[#5da2ff] px-6 py-8 text-white shadow-[0_30px_90px_-50px_rgba(79,70,229,0.85)] md:px-10 relative">
          <Link
            to="/attendance/home"
            className="absolute top-4 left-4 flex items-center gap-2 text-white/80 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t("backToHome")}</span>
          </Link>
          <div className="flex flex-col items-center text-center mt-4">
            <h1 className="text-4xl font-bold md:text-5xl">{t("leaderboard")}</h1>
            <p className="mt-2 text-base text-white/85 md:text-lg">{t("topRankings")}</p>
          </div>
        </section>

        <section className="space-y-4 rounded-[30px] border border-white/60 bg-white/70 p-4 shadow-[0_24px_90px_-50px_rgba(15,23,42,0.45)] backdrop-blur-sm md:p-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Crown className="h-6 w-6 text-amber-500" />
            {t("topThree")}
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            {podiumData.map(({ member, style, rank }) => {
              return (
                <Card
                  key={`${member.member_id}-${rank}`}
                  className={`relative overflow-hidden rounded-[28px] border p-5 ${style.card} ${rank === 1 ? "md:-translate-y-4" : ""}`}
                >
                  <div className="absolute left-4 top-4 text-4xl font-black text-slate-900">#{rank}</div>
                  <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full ${style.medal}`}>
                    <Medal className="h-5 w-5" />
                  </div>
                  <div className="mt-14 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold text-slate-900">{member.full_name}</h2>
                    <p className="mt-2 text-base text-slate-700">
                      {t("category")}: {member.category} | {t("point")}: {member.points}
                    </p>
                  </div>
                </Card>
              );
            })}
            {!loading && podiumData.length === 0 && (
              <Card className="md:col-span-3 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center text-slate-500">
                {t("noData")}
              </Card>
            )}
          </div>

          <Card className="rounded-[28px] border border-slate-200/80 bg-white/90 p-0 shadow-[0_25px_70px_-45px_rgba(148,163,184,0.8)]">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <p className="text-sm font-medium text-slate-500">{t("leaderboardTable")}</p>
                <h3 className="text-lg font-semibold text-slate-900">{t("rank")} {t("members").toLowerCase()} {t("point").toLowerCase()}</h3>
              </div>
            </div>

            <div className="overflow-x-auto px-2 py-2 md:px-4 md:py-4">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-sm font-semibold text-slate-700">
                    <th className="px-4 py-3">{t("rank")}</th>
                    <th className="px-4 py-3">{t("name")}</th>
                    <th className="px-4 py-3">{t("category")}</th>
                    <th className="px-4 py-3 text-right">{t("point")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((member, index) => (
                    <tr key={member.member_id} className="border-t border-slate-100 text-slate-700 transition-colors hover:bg-slate-50/90">
                      <td className="px-4 py-3 font-semibold">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{member.full_name}</td>
                      <td className="px-4 py-3">{member.category}</td>
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
