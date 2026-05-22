import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock3, LogOut, Medal, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { clearCurrentAttendanceUser, clearPendingRegistrationProfile, getCurrentAttendanceUser } from "@/lib/attendanceFlow";
import { attendanceApi, userDashboardApi } from "@/services/api";

type DashboardTrendPoint = {
  label: string;
  points: number;
};

type LeaderboardPreviewRow = {
  user_id: number;
  full_name: string;
  total_present: number;
  points: number;
};

type QuestionOption = {
  id: string;
  label: string;
};

type QuestionItem = {
  id: string;
  question: string;
  options: QuestionOption[];
  correctOptionId: string;
};

const QUESTION_REWARD = 5;
const QUESTION_TIME_LIMIT = 15;

const QUESTION_BANK: QuestionItem[] = [
  {
    id: "q-1",
    question: "Siapa yang memimpin bangsa Israel keluar dari Mesir?",
    correctOptionId: "b",
    options: [
      { id: "a", label: "Abraham" },
      { id: "b", label: "Musa" },
      { id: "c", label: "Daud" },
      { id: "d", label: "Salomo" },
    ],
  },
  {
    id: "q-2",
    question: "Berapa jumlah murid utama Yesus?",
    correctOptionId: "c",
    options: [
      { id: "a", label: "7" },
      { id: "b", label: "10" },
      { id: "c", label: "12" },
      { id: "d", label: "14" },
    ],
  },
  {
    id: "q-3",
    question: "Kitab pertama dalam Perjanjian Baru adalah?",
    correctOptionId: "a",
    options: [
      { id: "a", label: "Matius" },
      { id: "b", label: "Markus" },
      { id: "c", label: "Lukas" },
      { id: "d", label: "Yohanes" },
    ],
  },
  {
    id: "q-4",
    question: "Siapakah yang terkenal karena mengalahkan Goliat?",
    correctOptionId: "d",
    options: [
      { id: "a", label: "Yusuf" },
      { id: "b", label: "Yosua" },
      { id: "c", label: "Samuel" },
      { id: "d", label: "Daud" },
    ],
  },
  {
    id: "q-5",
    question: "Di kota mana Yesus dilahirkan?",
    correctOptionId: "b",
    options: [
      { id: "a", label: "Nazaret" },
      { id: "b", label: "Betlehem" },
      { id: "c", label: "Yerusalem" },
      { id: "d", label: "Kapernaum" },
    ],
  },
];

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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_LIMIT);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [points, setPoints] = useState(0);
  const [trend, setTrend] = useState<DashboardTrendPoint[]>(createFallbackTrend(0));
  const [leaderboardPreview, setLeaderboardPreview] = useState<LeaderboardPreviewRow[]>([]);
  const [displayName, setDisplayName] = useState(currentUser?.name ?? "[User Name]");

  const questionButtonLabel = quizCompleted ? "Question Completed" : `Start Question (${QUESTION_TIME_LIMIT}s)`;
  const trendPath = useMemo(() => buildTrendPath(trend), [trend]);

  const handleLogout = () => {
    clearCurrentAttendanceUser();
    clearPendingRegistrationProfile();
    navigate("/attendance/home");
  };

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (!currentUser) {
        return;
      }

      try {
        const [{ data: profileResponse }, { data: leaderboardResponse }] = await Promise.all([
          userDashboardApi.getProfile({ email: currentUser.email, name: currentUser.name }),
          attendanceApi.getLeaderboard(undefined, "week"),
        ]);

        if (!active) {
          return;
        }

        const profileData = profileResponse.data;
        if (profileData?.matched) {
          setDisplayName(profileData.profile?.fullName ?? currentUser.name);
          setPoints(Number(profileData.points ?? 0));
          setTrend(Array.isArray(profileData.trend) ? profileData.trend : createFallbackTrend(Number(profileData.points ?? 0)));
        } else {
          setDisplayName(currentUser.name);
          setPoints(0);
          setTrend(createFallbackTrend(0));
        }

        const previewRows = Array.isArray(leaderboardResponse.data) ? leaderboardResponse.data : [];
        setLeaderboardPreview(previewRows.slice(0, 1));
      } catch {
        if (!active) {
          return;
        }

        setDisplayName(currentUser.name);
        setTrend(createFallbackTrend(points));
        setLeaderboardPreview([]);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!questionOpen) {
      return;
    }

    if (secondsLeft <= 0) {
      setQuestionOpen(false);
      setQuizCompleted(true);
      toast({
        title: "Waktu habis",
        description: "Question selesai tanpa poin karena waktu 15 detik sudah habis.",
        variant: "destructive",
      });
      return;
    }

    const timerId = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [questionOpen, secondsLeft]);

  const startQuestionFlow = () => {
    const randomQuestion = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
    setActiveQuestion(randomQuestion);
    setSelectedOption("");
    setSecondsLeft(QUESTION_TIME_LIMIT);
    setRulesOpen(false);
    setQuestionOpen(true);
  };

  const handleSubmitAnswer = async () => {
    if (!activeQuestion || !selectedOption || !currentUser) {
      return;
    }

    setSubmittingAnswer(true);
    const isCorrect = selectedOption === activeQuestion.correctOptionId;

    try {
      if (isCorrect) {
        const response = await userDashboardApi.awardQuestionPoints({
          email: currentUser.email,
          name: currentUser.name,
          reward: QUESTION_REWARD,
        });

        const rewardData = response.data.data;
        const nextPoints = Number(rewardData.points ?? points + QUESTION_REWARD);
        setPoints(nextPoints);
        setTrend(Array.isArray(rewardData.trend) ? rewardData.trend : createFallbackTrend(nextPoints));
        toast({
          title: "Jawaban benar",
          description: `Kamu mendapatkan ${QUESTION_REWARD} poin dari Bible Study question.`,
        });
      } else {
        toast({
          title: "Jawaban belum tepat",
          description: "Belum ada poin yang ditambahkan untuk pertanyaan ini.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Question gagal diproses",
        description: error.response?.data?.message || "Poin user belum bisa diperbarui.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAnswer(false);
      setQuestionOpen(false);
      setQuizCompleted(true);
    }
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

            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-2xl border-white/30 bg-white/15 px-5 text-white backdrop-blur-sm hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <Card className="rounded-[30px] border-white/70 bg-white/80 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <div className="rounded-[24px] bg-gradient-to-r from-[#9333ea] via-[#6d5efc] to-[#58a5ff] p-4 shadow-[0_20px_60px_-40px_rgba(88,80,255,0.8)]">
                  <Button
                    className="h-16 w-full justify-center rounded-[20px] bg-transparent text-2xl font-bold text-white shadow-none hover:bg-white/5"
                    onClick={() => setRulesOpen(true)}
                    disabled={quizCompleted}
                  >
                    {questionButtonLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border-white/70 bg-white/85 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-center text-4xl font-medium text-slate-900">Leaderboard</h2>
                <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.4)]">
                  {leaderboardPreview.length > 0 ? leaderboardPreview.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <Avatar className="h-14 w-14 border-2 border-slate-100">
                          <AvatarFallback className="bg-slate-200 text-slate-700">{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xl font-semibold text-slate-900">{member.full_name}</p>
                          <p className="text-lg text-slate-500">{member.points} pts</p>
                        </div>
                      </div>

                      <Button className="h-12 rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#5da2ff] px-6 text-base text-white shadow-[0_14px_40px_-25px_rgba(99,102,241,0.8)] hover:opacity-95" onClick={() => navigate("/leaderboard")}>
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
                  <span className="font-medium">Jawaban benar memberi +{QUESTION_REWARD} poin</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
          <DialogContent className="rounded-[28px] border-white/70 bg-white p-0 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:max-w-xl">
            <div className="rounded-t-[28px] bg-gradient-to-r from-[#8b3ffc] via-[#6b63ff] to-[#5da2ff] px-6 py-5 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl">Rules Question</DialogTitle>
                <DialogDescription className="text-white/85">
                  Baca rules dulu sebelum mulai menjawab.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-6 text-slate-700">
              <p className="text-base leading-7">
                Hanya ada 1 pertanyaan. Jika berhasil menjawab dengan benar, maka akan mendapatkan {QUESTION_REWARD} poin. Pertanyaan berbentuk pilihan ganda dengan 4 pilihan jawaban dan berkaitan dengan Bible Study.
              </p>

              <DialogFooter className="gap-3 sm:justify-end">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setRulesOpen(false)}>
                  Tidak
                </Button>
                <Button type="button" className="rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#5da2ff] text-white" onClick={startQuestionFlow}>
                  Mulai
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
          <DialogContent className="rounded-[28px] border-white/70 bg-white p-0 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.35)] sm:max-w-2xl">
            <div className="rounded-t-[28px] bg-gradient-to-r from-[#9333ea] to-[#5da2ff] px-6 py-5 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Clock3 className="h-5 w-5" />
                  Bible Study Question
                </DialogTitle>
                <DialogDescription className="text-white/85">
                  Sisa waktu {secondsLeft} detik. Jawaban benar mendapat +{QUESTION_REWARD} poin.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="rounded-[22px] bg-slate-50 p-5 text-lg font-semibold leading-8 text-slate-900">
                {activeQuestion?.question}
              </div>

              <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                {activeQuestion?.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <RadioGroupItem value={option.id} id={`question-${option.id}`} />
                    <Label htmlFor={`question-${option.id}`} className="cursor-pointer text-base text-slate-700">
                      {option.label}
                    </Label>
                  </label>
                ))}
              </RadioGroup>

              <DialogFooter className="gap-3 sm:justify-end">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setQuestionOpen(false)}>
                  Tutup
                </Button>
                <Button
                  type="button"
                  className="rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#5da2ff] text-white"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption || submittingAnswer}
                >
                  {submittingAnswer ? "Memproses..." : "Submit Answer"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}