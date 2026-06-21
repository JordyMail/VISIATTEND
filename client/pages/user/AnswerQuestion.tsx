// client/pages/user/AnswerQuestion.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle, Clock, Star, CheckCircle2, XCircle,
  ArrowLeft, ArrowRight, Loader2, Timer, Trophy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { questionApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Question {
  id: number;
  title: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string;
  points: number;
  time_limit_minutes: number;
  attempts_count: number;
  max_attempts: number;
}

interface AnswerResult {
  id?: number;
  isCorrect: boolean;
  pointsEarned: number;
  message: string;
}

export default function AnswerQuestion() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      startTimer();
    }
  }, [currentIndex, questions]);

  const loadQuestions = async () => {
    try {
      const r = await questionApi.getAvailable();
      setQuestions(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat soal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const question = questions[currentIndex];
    setTimeLeft(question.time_limit_minutes);
    setStartTime(Date.now());
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (timeUp = false) => {
    if (!answer.trim() && !timeUp) {
      toast({ title: "Perhatian", description: "Masukkan jawaban terlebih dahulu" });
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    setSubmitting(true);

    try {
      const r = await questionApi.submitAnswer(
        questions[currentIndex].id,
        timeUp ? "" : answer,
        timeSpent
      );
      
      console.log('Submit result:', r.data); // Debug
      
      setResult({
        isCorrect: r.data.data.isCorrect,
        pointsEarned: r.data.data.pointsEarned,
        message: r.data.data.message || r.data.message
      });
      
      if (r.data.data.isCorrect) {
        toast({ 
          title: "✅ Benar!", 
          description: `Kamu mendapatkan ${r.data.data.pointsEarned} poin!` 
        });
      } else {
        toast({ 
          title: "❌ Salah", 
          description: r.data.data.message || "Coba lagi!" 
        });
      }
    } catch (e: any) {
      console.error('Submit error:', e);
      toast({ 
        title: "Error", 
        description: e.response?.data?.message || "Gagal submit jawaban",
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer("");
      setResult(null);
    }
  };

  const formatTime = (seconds: number) => {
    return `${seconds} detik`;
  };

  const progressPercent = timeLeft > 0 
    ? ((questions[currentIndex]?.time_limit_minutes - timeLeft) / (questions[currentIndex]?.time_limit_minutes)) * 100
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Tidak Ada Soal Tersedia</h2>
            <p className="text-muted-foreground mb-4">
              Semua soal sudah dijawab atau belum ada soal baru.
            </p>
            <Button onClick={() => navigate("/user/dashboard")}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/user/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
        <Badge variant="outline" className="gap-1">
          <Star className="w-3 h-3 text-yellow-500" /> {currentQuestion.points} Poin
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Soal {currentIndex + 1} dari {questions.length}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                {currentQuestion.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">{currentQuestion.question_text}</p>

          {/* Multiple Choice Options */}
          {currentQuestion.question_type === 'multiple_choice' && (
            <RadioGroup value={answer} onValueChange={setAnswer}>
              {JSON.parse(currentQuestion.options || '[]').map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={String.fromCharCode(65 + idx)} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* True/False Options */}
          {currentQuestion.question_type === 'true_false' && (
            <RadioGroup value={answer} onValueChange={setAnswer}>
              {['Benar', 'Salah'].map((option) => (
                <div key={option} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option} id={`option-${option}`} />
                  <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Short Answer */}
          {currentQuestion.question_type === 'short_answer' && (
            <Textarea
              rows={3}
              placeholder="Tulis jawaban singkat..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          )}

                {/* Result */}
                {result && (
                <div className={`p-4 rounded-lg ${
                    result.isCorrect 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                    {result.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                        <p className={`font-semibold ${
                        result.isCorrect ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {result.isCorrect ? 'Jawaban Benar!' : 'Jawaban Salah'}
                        </p>
                        <p className="text-sm mt-1">
                        {result.message}
                        </p>
                    </div>
                    </div>
                </div>
                )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {!result ? (
          <Button 
            className="flex-1 gap-2" 
            onClick={() => handleSubmit()}
            disabled={submitting || !answer.trim()}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Submit Jawaban</>
            )}
          </Button>
        ) : (
          <>
            {!result.isCorrect && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setResult(null); setAnswer(""); }}
              >
                Coba Lagi
              </Button>
            )}
            {currentIndex < questions.length - 1 && (
              <Button 
                className="flex-1 gap-2"
                onClick={nextQuestion}
              >
                Soal Berikutnya <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}