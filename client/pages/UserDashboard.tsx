import { useEffect, useMemo, useState } from "react";
import { ChevronRight, LogOut, Medal, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { clearCurrentAttendanceUser, clearPendingRegistrationProfile, getCurrentAttendanceUser } from "@/lib/attendanceFlow";
import { userDashboardApi, memberLeaderboardApi } from "@/services/api";
import { clearSession } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DashboardTrendPoint = {
  label: string;
  points: number;
};

type LeaderboardPreviewRow = {
  member_id: string;
  full_name: string;
  email?: string;
  points: number;
  rank?: number;
};

const QUESTION_TIME_LIMIT = 15;

const formatAttendanceTime = (isoString?: string | null) => {
  if (!isoString) return "Belum attendance hari ini";
  try {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Attendance: ${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "Belum attendance hari ini";
  }
};

const createFallbackTrend = (points: number): DashboardTrendPoint[] => {
  const safePoints = Math.max(points, 0);
  const offsets = [11, 9, 8, 6, 5, 3, 0];

  return ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"].map((label, index) => ({
    label,
    points: Math.max(safePoints - offsets[index], 0),
  }));
};

const buildTrendPath = (trend: DashboardTrendPoint[]) => {
  if (trend.length === 0) {
    return "";
  }

  const width = 240;
  const height = 120;
  const paddingX = 14;
  const paddingY = 16;
  const values = trend.map((item) => item.points);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const stepX = trend.length === 1 ? 0 : (width - paddingX * 2) / (trend.length - 1);

  return trend
    .map((item, index) => {
      const x = paddingX + stepX * index;
      const y = height - paddingY - ((item.points - minValue) / range) * (height - paddingY * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function UserDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentAttendanceUser();
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [points, setPoints] = useState(0);
  const [trend, setTrend] = useState<DashboardTrendPoint[]>(createFallbackTrend(0));
  const [leaderboardPreview, setLeaderboardPreview] = useState<LeaderboardPreviewRow[]>([]);
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "[User Name]");
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isConfirmViewAllOpen, setIsConfirmViewAllOpen] = useState(false);

  const questionButtonLabel = quizCompleted
    ? "Question Completed"
    : "Start Question";
  const trendPath = useMemo(() => buildTrendPath(trend), [trend]);

  const handleLogout = () => {
    clearCurrentAttendanceUser();
    clearPendingRegistrationProfile();
    navigate("/attendance/home");
  };

  const handleConfirmViewAll = () => {
    clearCurrentAttendanceUser();
    clearPendingRegistrationProfile();
    navigate("/leaderboard");
  };

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (!currentUser) {
        return;
      }

      setLoadingData(true);

      const profilePromise = userDashboardApi.getProfile({
        email: currentUser.email,
        name: currentUser.name,
      });

      const questionsPromise = userDashboardApi.getQuestions({
        email: currentUser.email,
        name: currentUser.name,
      });

      const leaderboardPromise = memberLeaderboardApi.getLeaderboard();

      try {
        const [profileResponse, questionsResponse, leaderboardResponse] = await Promise.all([
          profilePromise,
          questionsPromise,
          leaderboardPromise.catch((err) => {
            console.error("Failed to load leaderboard preview:", err);
            return { data: { data: [] } };
          }),
        ]);

        if (!active) {
          return;
        }

        // Process profile/points
        const profileData = profileResponse.data?.data;
        let currentPoints = 0;
        if (profileData?.matched) {
          setDisplayName(profileData.profile?.fullName ?? currentUser.name);
          setAttendanceDate(profileData.attendanceDate);
          const nextPoints = Number(profileData.points ?? 0);
          currentPoints = nextPoints;
          setPoints(nextPoints);
          setTrend(
            Array.isArray(profileData.trend)
              ? profileData.trend
              : createFallbackTrend(nextPoints)
          );
        } else {
          setDisplayName(currentUser.name);
          setPoints(0);
          setTrend(createFallbackTrend(0));
        }

        // Process Questions
        const list = Array.isArray(questionsResponse.data?.data) ? questionsResponse.data.data : [];
        setDbQuestions(list);
        const unanswered = list.filter((q: any) => !q.answered);
        setQuizCompleted(unanswered.length === 0);

        // Process Leaderboard
        const previewRows = Array.isArray(leaderboardResponse.data?.data) ? leaderboardResponse.data.data : [];
        const myRow = previewRows.find(
          (row: any) => row.email?.toLowerCase() === currentUser.email.toLowerCase()
        );

        if (myRow) {
          setLeaderboardPreview([myRow]);
        } else {
          setLeaderboardPreview([
            {
              member_id: currentUser.memberId || "CURRENT",
              full_name: currentUser.name,
              email: currentUser.email,
              points: currentPoints,
              rank: undefined,
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (active) {
          setDisplayName(currentUser.name);
          setPoints(0);
          setTrend(createFallbackTrend(0));
          setDbQuestions([]);
          setQuizCompleted(true);
          setLeaderboardPreview([]);
        }
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const handleStartQuestion = () => {
    navigate("/question-sistem");
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.18),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(93,162,255,0.18),_transparent_22%),linear-gradient(180deg,_rgba(248,250,252,0.99),_rgba(241,245,249,0.98))] p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-[#8b3ffc] via-[#6b63ff] to-[#5da2ff] px-6 py-8 text-white shadow-[0_30px_95px_-55px_rgba(79,70,229,0.85)] md:px-10 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <h1 className="text-4xl font-bold md:text-5xl">User Dashboard</h1>
              <p className="mt-2 text-xl text-white/90">Welcome, {displayName}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">

            <Card className="rounded-[30px] border-white/70 bg-white/85 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-center text-4xl font-medium text-slate-900">Leaderboard</h2>
                <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.4)]">
                  {leaderboardPreview.length > 0 ? leaderboardPreview.map((member) => (
                    <div key={member.member_id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-lg">
                          {member.rank !== undefined ? `#${member.rank}` : "-"}
                        </div>
                        <Avatar className="h-14 w-14 border-2 border-slate-100">
                          <AvatarFallback className="bg-slate-200 text-slate-700">{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xl font-semibold text-slate-900">{member.full_name}</p>
                          <p className="text-lg text-slate-500">{member.points} pts</p>
                        </div>
                      </div>

                      <Button className="h-12 rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#5da2ff] px-6 text-base text-white shadow-[0_14px_40px_-25px_rgba(99,102,241,0.8)] hover:opacity-95" onClick={() => setIsConfirmViewAllOpen(true)}>
                        View All
                      </Button>
                    </div>
                  )) : (
                    <div className="flex items-center justify-center rounded-[18px] bg-slate-50 px-4 py-8 text-center text-slate-500">
                      Leaderboard akan muncul setelah data user dan attendance tersedia.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[30px] border-white/70 bg-white/85 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="rounded-t-[30px] bg-gradient-to-r from-[#9333ea] to-[#5da2ff] px-6 py-5 text-center text-white">
                <h2 className="text-2xl font-medium">Your Points</h2>
              </div>

              <div className="space-y-5 p-6 text-center">
                <div>
                  <p className="text-5xl font-bold tracking-tight text-slate-900">
                    {points.toLocaleString("en-US")} <span className="text-3xl font-semibold">PTS</span>
                  </p>
                  <p className="mt-2 text-lg text-slate-500">Total Career Points</p>
                </div>

                <div className="rounded-[24px] bg-slate-50 p-4">
                  <svg viewBox="0 0 240 120" className="h-36 w-full" fill="none" aria-label="Points trend">
                    <path
                      d={trendPath}
                      stroke="url(#points-gradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="points-gradient" x1="12" y1="20" x2="232" y2="100" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#9333ea" />
                        <stop offset="1" stopColor="#5da2ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <p className="text-xl text-slate-700">Past 7 Days</p>
                  <div className="mt-3 flex justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {trend.map((point) => (
                      <span key={point.label}>{point.label === "Today" ? "Today" : point.label.replace("Day ", "D")}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-700">
                  <Medal className="h-5 w-5" />
                  <span className="font-medium">{formatAttendanceTime(attendanceDate)}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isConfirmViewAllOpen} onOpenChange={setIsConfirmViewAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lihat Leaderboard?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah anda yakin untuk melihat leaderboard? Karena anda akan logout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmViewAll}>
              Ya, Lihat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}