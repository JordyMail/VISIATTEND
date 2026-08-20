// client/pages/user/AnswerQuestion.tsx â€” Word Search Game
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { wordSearchApi } from "@/services/api";
import { getCellsInLine, deserializeGrid, generateWordSearch } from "@/lib/wordSearch";
import { toast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n";

interface QuestionData {
  id: number;
  clue: string;
  answer: string;
  puzzle_grid: string | null;
  question_order: number;
  points: number;
  answered: boolean;
  is_correct: boolean | null;
}

interface EventData {
  event_id: number;
  event_name: string;
  date_event: string;
  start_time: string;
  questions: QuestionData[];
}

export default function AnswerQuestion() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Drag-selection state
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ r: number; c: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [foundCells, setFoundCells] = useState<{ r: number; c: number }[]>([]);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await wordSearchApi.getForUser();
      setEvents(r.data.data ?? []);
    } catch {
      toast({ title: t("error"), description: `${t("error")}: ${t("questions")}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset selection when changing question
  useEffect(() => {
    setSelecting(false);
    setStartCell(null);
    setHoverCell(null);
    setSelectedCells([]);
    setFoundCells([]);
    setLastResult(null);
  }, [currentEventIdx, currentQIdx]);

  const currentEvent = events[currentEventIdx];
  const currentQuestion = currentEvent?.questions[currentQIdx];

  const grid = currentQuestion?.puzzle_grid
    ? deserializeGrid(currentQuestion.puzzle_grid)
    : currentQuestion?.answer
    ? generateWordSearch(currentQuestion.answer)
    : null;

  const previewCells: { r: number; c: number }[] =
    selecting && startCell && hoverCell
      ? (getCellsInLine(startCell.r, startCell.c, hoverCell.r, hoverCell.c) ?? [])
      : [];

  const isCellPreview = (r: number, c: number) => previewCells.some(s => s.r === r && s.c === c);
  const isCellSelected = (r: number, c: number) => selectedCells.some(s => s.r === r && s.c === c);
  const isCellFound = (r: number, c: number) => foundCells.some(s => s.r === r && s.c === c);

  const handleCellDown = (r: number, c: number) => {
    if (currentQuestion?.answered || lastResult?.correct) return;
    setSelecting(true);
    setStartCell({ r, c });
    setHoverCell({ r, c });
    setSelectedCells([]);
  };

  const handleCellEnter = (r: number, c: number) => {
    if (!selecting) return;
    setHoverCell({ r, c });
  };

  const handleCellUp = async (r: number, c: number) => {
    if (!selecting || !startCell || !grid) return;
    setSelecting(false);
    const cells = getCellsInLine(startCell.r, startCell.c, r, c);
    if (!cells || cells.length < 2) { setSelectedCells([]); return; }

    const word = cells.map(cell => grid.grid[cell.r][cell.c]).join("");
    const wordRev = word.split("").reverse().join("");
    const answer = (currentQuestion.answer || "").toUpperCase();
    const isMatch = word === answer || wordRev === answer;
    setSelectedCells(cells);

    if (isMatch) {
      setFoundCells(cells);
      await submitAnswer(answer);
    } else {
      setTimeout(() => setSelectedCells([]), 700);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!currentQuestion || submitting) return;
    setSubmitting(true);
    try {
      const res = await wordSearchApi.submit(currentQuestion.id, answer);
      const d = res.data;
      setLastResult({
        correct: d.isCorrect ?? d.correct ?? true,
        points: d.pointsEarned ?? d.points ?? 0,
        message: d.message ?? "Benar!",
      });
      load();
    } catch (e: any) {
      setLastResult({ correct: false, points: 0, message: e.response?.data?.message || "Gagal submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const goNextQuestion = () => {
    if (!currentEvent) return;
    if (currentQIdx < currentEvent.questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    } else if (currentEventIdx < events.length - 1) {
      setCurrentEventIdx(prev => prev + 1);
      setCurrentQIdx(0);
    }
  };

  const hasMoreQuestion = currentEvent && (
    currentQIdx < currentEvent.questions.length - 1 ||
    currentEventIdx < events.length - 1
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Trophy className="h-12 w-12 text-amber-400" />
            <p className="text-lg font-semibold">{t("noResults")}</p>
            <p className="text-sm text-muted-foreground">{t("noQuestionsToday")}</p>
            <Button onClick={() => navigate("/user/dashboard")}>{t("backToHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentEvent || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold">{t("success")}</p>
            <p className="text-sm text-muted-foreground">{t("completed")}</p>
            <Button onClick={() => navigate("/user/dashboard")}>{t("backToHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuestions = currentEvent.questions.length;
  const answeredCount = currentEvent.questions.filter(q => q.answered).length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Event Header */}
      <div>
        <h1 className="text-xl font-bold">{currentEvent.event_name}</h1>
        <p className="text-sm text-muted-foreground">
          {currentEvent.date_event
            ? format(parseISO(currentEvent.date_event), "EEEE, d MMMM yyyy", { locale: idLocale })
            : ""}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">{t("question")} {currentQIdx + 1} / {totalQuestions}</Badge>
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            {answeredCount} / {totalQuestions} {t("completed")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Clue */}
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">{t("findHiddenWord")}</p>
            <p className="text-sm font-medium text-slate-800">{currentQuestion.clue}</p>
          </div>

          {currentQuestion.answered && (
            <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {t("answeredCorrectly")}
            </div>
          )}

          {lastResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium
              ${lastResult.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {lastResult.message}
              {lastResult.correct && lastResult.points > 0 && (
                <span className="ml-auto font-bold">+{lastResult.points} pts</span>
              )}
            </div>
          )}

          {/* Word Search Grid */}
          {grid ? (
            <div
              className="flex justify-center select-none"
              onMouseLeave={() => {
                if (selecting) { setSelecting(false); setStartCell(null); setHoverCell(null); setSelectedCells([]); }
              }}
            >
              <div
                className="inline-grid gap-px border border-slate-200 bg-slate-200 rounded-lg overflow-hidden"
                style={{ gridTemplateColumns: `repeat(${grid.size}, 2rem)` }}
              >
                {grid.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const found = isCellFound(r, c);
                    const preview = isCellPreview(r, c);
                    const selected = isCellSelected(r, c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        data-r={r}
                        data-c={c}
                        className={`w-8 h-8 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors
                          ${found ? "bg-green-400 text-white"
                          : preview ? "bg-violet-300 text-violet-900"
                          : selected ? "bg-red-200 text-red-800"
                          : "bg-white hover:bg-violet-50 text-slate-800"}`}
                        onMouseDown={() => handleCellDown(r, c)}
                        onMouseEnter={() => handleCellEnter(r, c)}
                        onMouseUp={() => handleCellUp(r, c)}
                      >
                        {cell}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8 text-muted-foreground text-sm">
              Puzzle tidak tersedia.
            </div>
          )}

          {submitting && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa jawaban...
            </div>
          )}

          {!currentQuestion.answered && !lastResult && (
            <p className="text-center text-xs text-muted-foreground">
              Klik dan seret pada grid untuk memilih kata yang tersembunyi.
            </p>
          )}

          {(lastResult?.correct || currentQuestion.answered) && hasMoreQuestion && (
            <Button className="w-full gap-2" onClick={goNextQuestion}>
              {t("nextQuestion")} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {!hasMoreQuestion && (lastResult?.correct || currentQuestion.answered) && (
            <Button className="w-full" onClick={() => navigate("/user/dashboard")}>
              {t("completed")} - {t("backToDashboard")}
            </Button>
          )}
        </CardContent>
      </Card>

      {totalQuestions > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {currentEvent.questions.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors
                ${idx === currentQIdx ? "bg-primary text-white border-primary"
                : q.answered ? "bg-green-100 text-green-700 border-green-300"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
              onClick={() => setCurrentQIdx(idx)}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
