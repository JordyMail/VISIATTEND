import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, Clock3, ArrowLeft, Loader2, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getCurrentAttendanceUser } from "@/lib/attendanceFlow";
import { userDashboardApi } from "@/services/api";

// Fallback if question has no time limit set
const DEFAULT_TIME_LIMIT = 15;

interface QuestionOption {
  id: string;
  label: string;
}

interface ActiveQuestion {
  id: number;
  question: string;
  options: QuestionOption[];
  correctOptionId: string;
  points: number;
  timeLimitSeconds: number;
}

type PageState =
  | "loading"
  | "no_user"
  | "no_attendance"
  | "no_question"
  | "question"
  | "already_answered";

export default function QuestionSistem() {
  const navigate = useNavigate();
  const currentUser = getCurrentAttendanceUser();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load question on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setPageState("no_user");
      return;
    }
    loadQuestion();
  }, []);

  // ─── Countdown timer — uses time limit from the question itself ───────────
  useEffect(() => {
    if (pageState !== "question" || !activeQuestion) return;

    const limit = activeQuestion.timeLimitSeconds;
    setSecondsLeft(limit);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pageState, activeQuestion]);

  const loadQuestion = async () => {
    try {
      const res = await userDashboardApi.getQuestions({
        email: currentUser!.email,
        name: currentUser!.name,
      });

      const questions: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const unanswered = questions.filter((q) => !q.answered);

      if (unanswered.length === 0) {
        // check if they even have attendance today
        if (questions.length === 0) {
          setPageState("no_attendance");
        } else {
          setPageState("already_answered");
        }
        return;
      }

      const q = unanswered[0];
      setActiveQuestion(buildQuestion(q));
      setPageState("question");
    } catch (err) {
      console.error("Failed to load question:", err);
      setPageState("no_question");
    }
  };

  const buildQuestion = (q: any): ActiveQuestion => {
    let options: QuestionOption[] = [];

    if (q.question_type === "multiple_choice") {
      try {
        const arr = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
        options = (Array.isArray(arr) ? arr : []).map((text: string, idx: number) => ({
          id: String.fromCharCode(65 + idx),
          label: text,
        }));
      } catch {
        options = [];
      }
    } else if (q.question_type === "true_false") {
      options = [
        { id: "Benar", label: "Benar" },
        { id: "Salah", label: "Salah" },
      ];
    }

    return {
      id: q.id,
      question: q.question_text,
      options,
      correctOptionId: q.correct_answer,
      points: q.points ?? 10,
      // time_limit_minutes is stored as seconds in the DB (admin UI labels it "detik")
      timeLimitSeconds: Number(q.time_limit_minutes) > 0 ? Number(q.time_limit_minutes) : DEFAULT_TIME_LIMIT,
    };
  };

  const handleTimeout = async () => {
    if (!activeQuestion || !currentUser) return;
    setSubmitting(true);
    try {
      await userDashboardApi.submitQuestionAnswer({
        email: currentUser.email,
        name: currentUser.name,
        questionId: activeQuestion.id,
        answer: "Timeout",
        timeSpentSeconds: activeQuestion.timeLimitSeconds,
      });
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
      toast({
        title: "⏰ Waktu Habis",
        description: "Waktu menjawab habis. Jawaban dianggap salah.",
        variant: "destructive",
      });
      navigate("/user-dashboard");
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || !activeQuestion || !currentUser) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSubmitting(true);
    const timeSpent = (activeQuestion.timeLimitSeconds) - secondsLeft;

    try {
      const res = await userDashboardApi.submitQuestionAnswer({
        email: currentUser.email,
        name: currentUser.name,
        questionId: activeQuestion.id,
        answer: selectedOption,
        timeSpentSeconds: timeSpent,
      });

      const result = res.data?.data;
      const correct: boolean = result?.isCorrect ?? false;
      const pts: number | null = result?.pointsEarned ?? null;

      if (correct) {
        toast({ title: "✅ Jawaban Benar!", description: `Anda mendapat ${pts} poin! Kembali ke dashboard...` });
      } else {
        toast({
          title: "❌ Jawaban Salah",
          description: result?.message || "Belum ada poin yang ditambahkan.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Submit Gagal",
        description: err.response?.data?.message || "Gagal mengirim jawaban.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      navigate("/user-dashboard");
    }
  };

  const goBack = () => navigate("/user-dashboard");

  // ─── Timer colour — relative to question's own time limit ───────────────
  const timeLimitForColor = activeQuestion?.timeLimitSeconds ?? DEFAULT_TIME_LIMIT;
  const timerColour =
    secondsLeft > timeLimitForColor * 0.5
      ? "text-emerald-400"
      : secondsLeft > timeLimitForColor * 0.25
      ? "text-yellow-400"
      : "text-red-400 animate-pulse";

  // ─── Render helpers ───────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-violet-400" />
          <p className="text-lg font-medium text-white/70">Memuat pertanyaan...</p>
        </div>
      </div>
    );
  }

  if (pageState === "no_user") {
    return (
      <StatusScreen
        icon={<XCircle className="w-16 h-16 text-red-400" />}
        title="Sesi Tidak Ditemukan"
        message="Silakan lakukan attendance terlebih dahulu."
        onBack={goBack}
        backLabel="Kembali ke Beranda"
      />
    );
  }

  if (pageState === "no_attendance") {
    return (
      <StatusScreen
        icon={<BookOpen className="w-16 h-16 text-violet-400" />}
        title="Belum Attendance Hari Ini"
        message="Pertanyaan hanya tersedia untuk member yang sudah attendance hari ini."
        onBack={goBack}
        backLabel="Kembali"
      />
    );
  }

  if (pageState === "no_question") {
    return (
      <StatusScreen
        icon={<BookOpen className="w-16 h-16 text-violet-400" />}
        title="Tidak Ada Pertanyaan"
        message="Belum ada pertanyaan untuk hari ini. Cek kembali nanti."
        onBack={goBack}
        backLabel="Kembali"
      />
    );
  }

  if (pageState === "already_answered") {
    return (
      <StatusScreen
        icon={<CheckCircle2 className="w-16 h-16 text-emerald-400" />}
        title="Sudah Dijawab"
        message="Anda sudah menjawab pertanyaan hari ini. Selamat!"
        onBack={goBack}
        backLabel="Kembali ke Dashboard"
      />
    );
  }


  // ─── Main question view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Kembali</span>
        </button>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
          <Clock3 className={`w-4 h-4 ${timerColour}`} />
          <span className={`text-base font-bold tabular-nums ${timerColour}`}>{secondsLeft}s</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-4">
        <div className="w-full max-w-xl space-y-6">
          {/* Title badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/30 border border-violet-400/50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest">Bible Study Quiz</p>
              <p className="text-white font-semibold">
                {activeQuestion?.points} Poin · Pilihan Ganda
              </p>
            </div>
          </div>

          {/* Timer progress bar */}
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${(secondsLeft / (activeQuestion?.timeLimitSeconds ?? DEFAULT_TIME_LIMIT)) * 100}%` }}
            />
          </div>

          {/* Question */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
            <p className="text-white text-xl font-semibold leading-relaxed">
              {activeQuestion?.question}
            </p>
          </div>

          {/* Options */}
          <RadioGroup
            value={selectedOption}
            onValueChange={setSelectedOption}
            className="space-y-3"
          >
            {activeQuestion?.options.map((opt, idx) => {
              const isSelected = selectedOption === opt.id;
              return (
                <label
                  key={opt.id}
                  htmlFor={`opt-${opt.id}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-violet-600/40 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                      : "bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30"
                  }`}
                >
                  <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} className="sr-only" />
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      isSelected
                        ? "bg-violet-500 text-white"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <Label
                    htmlFor={`opt-${opt.id}`}
                    className="cursor-pointer text-white text-base flex-1"
                  >
                    {opt.label}
                  </Label>
                </label>
              );
            })}
          </RadioGroup>

          {/* Submit */}
          <Button
            className={`w-full h-14 rounded-2xl text-white text-lg font-semibold transition-all ${
              selectedOption && !submitting
                ? "bg-gradient-to-r from-violet-600 to-blue-600 shadow-[0_8px_30px_rgba(139,92,246,0.4)] hover:opacity-90"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
            onClick={handleSubmit}
            disabled={!selectedOption || submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Memproses...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Submit Jawaban
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper screen for non-question states ────────────────────────────────────
function StatusScreen({
  icon,
  title,
  message,
  onBack,
  backLabel,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">{icon}</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-white/60">{message}</p>
        </div>
        <Button
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold hover:opacity-90"
          onClick={onBack}
        >
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
