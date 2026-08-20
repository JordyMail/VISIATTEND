import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import {
  clearCurrentAttendanceUser,
  clearPendingRegistrationProfile,
  getCurrentAttendanceUser,
} from "@/lib/attendanceFlow";
import { getSessionUser } from "@/lib/auth";
import { memberLeaderboardApi, userDashboardApi } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

type AttendanceUser = {
  name: string;
  email: string;
  memberId?: string;
};

type LeaderboardRow = {
  member_id: string;
  full_name: string;
  points: number;
  rank: number;
};

const getInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const formatActiveSince = (value?: string | null) => {
  if (!value) return "Attendance Member";
  return `Active Since: ${new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
};

const RANK_STYLES: Record<number, { bg: string; text: string; badge: string }> = {
  1: { bg: "bg-yellow-400", text: "text-yellow-900", badge: "🥇" },
  2: { bg: "bg-slate-300",  text: "text-slate-800",  badge: "🥈" },
  3: { bg: "bg-amber-600",  text: "text-white",       badge: "🥉" },
};

/* Floating particle dot */
function Particle({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full bg-white/20"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.round((i * 73 + 11) % 97),
  y: Math.round((i * 57 + 29) % 93),
  size: (i % 3) + 3,
}));

export default function UserDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const attendanceUser = getCurrentAttendanceUser();
  const sessionUser = getSessionUser();
  // Use the real attendance user; skip the fake 'attendance' operator session
  const currentUser: AttendanceUser | null =
    sessionUser && sessionUser.role !== "attendance"
      ? { name: sessionUser.full_name, email: sessionUser.email }
      : attendanceUser;
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "User");
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    clearCurrentAttendanceUser();
    clearPendingRegistrationProfile();
    navigate("/attendance/home");
  };

  useEffect(() => {
    let active = true;

    const loadAttendanceDashboard = async () => {
      if (!currentUser) { setLoading(false); return; }

      const profilePromise = userDashboardApi.getProfile({
        email: currentUser.email,
        name: currentUser.name,
      });
      const leaderboardPromise = memberLeaderboardApi.getLeaderboard();

      const [profileResult, leaderboardResult] = await Promise.allSettled([
        profilePromise,
        leaderboardPromise,
      ]);

      if (!active) return;

      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value.data?.data;
        if (profile?.matched) {
          setDisplayName(profile.profile?.fullName ?? currentUser.name);
          setAttendanceDate(profile.attendanceDate ?? null);
        }
      }

      if (leaderboardResult.status === "fulfilled") {
        const rows = Array.isArray(leaderboardResult.value.data?.data)
          ? leaderboardResult.value.data.data
          : [];
        setLeaderboard(rows.slice(0, 10));
      } else {
        toast({
          title: t("error"),
          description: `${t("leaderboard")}: ${t("noData")}`,
          variant: "destructive",
        });
      }

      setLoading(false);
    };

    loadAttendanceDashboard().catch(() => {
      if (!active) return;
      setLoading(false);
      toast({
        title: t("error"),
        description: t("loading"),
        variant: "destructive",
      });
    });

    return () => {
      active = false;
    };
  }, [currentUser]);

  const half     = Math.ceil(leaderboard.length / 2);
  const leftCol  = leaderboard.slice(0, half);
  const rightCol = leaderboard.slice(half);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#2d0068_0%,_#56008a_40%,_#4a007a_60%,_#1a004d_100%)] px-4 py-10 sm:px-8">
      {PARTICLES.map((p) => <Particle key={p.id} x={p.x} y={p.y} size={p.size} />)}

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
        {/* User card */}
        <div className="w-full rounded-[22px] border border-white/45 bg-white/20 px-6 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <p className="text-sm font-medium uppercase tracking-widest text-purple-300">{t("welcome")}</p>
          <h1 className="mt-1 text-3xl font-bold text-white">{displayName}</h1>
          <p className="mt-1 text-xs text-purple-300/80">{formatActiveSince(attendanceDate)}</p>
        </div>

        {/* Leaderboard card */}
        <div className="w-full rounded-[22px] border border-white/50 bg-white/25 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_12px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7">
          <h2 className="mb-4 border-b border-white/35 pb-4 text-center text-lg font-bold text-white drop-shadow-sm">{t("leaderboard")} - 10</h2>

          {loading ? (
            <p className="py-10 text-center text-sm text-purple-200">{t("loading")}</p>
          ) : leaderboard.length === 0 ? (
            <p className="py-10 text-center text-sm text-purple-200">{t("noData")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[leftCol, rightCol].map((col, ci) => (
                <div key={ci} className="flex flex-col gap-2">
                  {col.map((row) => {
                    const rs = RANK_STYLES[row.rank];
                    return (
                      <div
                        key={row.member_id}
                        className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/20 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      >
                        {rs ? (
                          <span className="text-base leading-none">{rs.badge}</span>
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                            {row.rank}
                          </span>
                        )}
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-purple-300 text-[10px] font-bold text-purple-900">
                            {getInitials(row.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
                          {row.full_name.split(" ")[0]}{row.full_name.split(" ")[1] ? ` ${row.full_name.split(" ")[1][0]}.` : ""}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-purple-200">
                          {Number(row.points ?? 0).toLocaleString("en-US")} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full bg-orange-400 px-10 py-3 text-base font-semibold text-white shadow-[0_6px_24px_rgba(251,146,60,0.5)] transition hover:bg-orange-500 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
