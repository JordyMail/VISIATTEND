// client/pages/admin/Questions.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, HelpCircle, Loader2, Clock, Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { questionApi, attendanceScheduleApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Question {
  id: number;
  title: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string;
  correct_answer: string;
  points: number;
  time_limit_minutes: number;
  is_active: boolean;
  creator_name?: string;
  start_date?: string;
  end_date?: string;
  max_attempts: number;
  created_at: string;
}

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda' },
  { value: 'true_false', label: 'Benar/Salah' },
];

const defaultForm: {
  title: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correctAnswer: string;
  points: number;
  timeLimitMinutes: number;
  startDate: string;
  endDate: string;
  maxAttempts: number;
} = {
  title: "",
  questionText: "",
  questionType: "multiple_choice",
  options: ["", "", "", ""],
  correctAnswer: "",
  points: 10,
  timeLimitMinutes: 15,
  startDate: "",
  endDate: "",
  maxAttempts: 1,
};

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [schedules, setSchedules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        questionApi.getAll(),
        attendanceScheduleApi.getAll(),
      ]);
      setQuestions(qRes.data.data);
      setSchedules(sRes.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (schedules.length === 0) {
      toast({
        title: "Perhatian",
        description: "Silakan pilih/buat jadwal attendance terlebih dahulu untuk membuat pertanyaan.",
        variant: "destructive"
      });
      return;
    }
    setEditing(null);
    setForm({
      ...defaultForm,
      startDate: schedules[0],
      endDate: schedules[0],
    });
    setDialogOpen(true);
  };
  
  const openEdit = (q: Question) => {
    setEditing(q);
    const qStartDate = q.start_date ? q.start_date.split('T')[0] : "";
    setForm({
      title: q.title,
      questionText: q.question_text,
      questionType: q.question_type,
      options: q.options ? JSON.parse(q.options) : ["", "", "", ""],
      correctAnswer: q.correct_answer,
      points: q.points,
      timeLimitMinutes: q.time_limit_minutes,
      startDate: qStartDate,
      endDate: qStartDate,
      maxAttempts: 1,
    });
    setDialogOpen(true);
  };

const handleSave = async () => {
  // Validasi judul dan pertanyaan
  if (!form.title.trim() || !form.questionText.trim()) {
    return toast({ 
      title: "Validasi", 
      description: "Judul dan pertanyaan wajib diisi", 
      variant: "destructive" 
    });
  }

  // Validasi tanggal pelaksanaan
  if (!form.startDate) {
    return toast({ 
      title: "Validasi", 
      description: "Pilih tanggal pelaksanaan terlebih dahulu", 
      variant: "destructive" 
    });
  }

  // Validasi poin (maksimal 20)
  if (form.points < 1 || form.points > 20) {
    return toast({ 
      title: "Validasi", 
      description: "Poin harus bernilai antara 1 dan 20", 
      variant: "destructive" 
    });
  }

  // Validasi jawaban benar
  if (!form.correctAnswer) {
    return toast({ 
      title: "Validasi", 
      description: "Pilih jawaban benar terlebih dahulu", 
      variant: "destructive" 
    });
  }

  // Validasi untuk multiple choice
  if (form.questionType === 'multiple_choice') {
    const filledOptions = form.options.filter((o: string) => o.trim());
    if (filledOptions.length < 2) {
      return toast({ 
        title: "Validasi", 
        description: "Minimal 2 pilihan harus diisi", 
        variant: "destructive" 
      });
    }
  }

  setSaving(true);
  try {
    const payload = {
      title: form.title,
      questionText: form.questionText,
      questionType: form.questionType,
      options: form.questionType === 'multiple_choice' 
        ? form.options.filter((o: string) => o.trim()) 
        : form.questionType === 'true_false' 
          ? ["Benar", "Salah"]
          : null,
      correctAnswer: form.correctAnswer,
      points: form.points,
      timeLimitMinutes: Math.min(15, form.timeLimitMinutes),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      maxAttempts: 1,
    };

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

    if (editing) {
      await questionApi.update(editing.id, payload);
      toast({ title: "Berhasil", description: "Soal berhasil diperbarui" });
    } else {
      const result = await questionApi.create(payload);
      console.log('✅ Created:', result.data);
      toast({ title: "Berhasil", description: "Soal baru berhasil dibuat" });
    }
    setDialogOpen(false);
    load();
  } catch (e: any) {
    console.error('❌ Save error:', e.response?.data || e);
    const errorMsg = e.response?.data?.message || "Gagal menyimpan soal";
    toast({ title: "Error", description: errorMsg, variant: "destructive" });
  } finally {
    setSaving(false);
  }
};

  const handleToggleActive = async (q: Question) => {
    try {
      await questionApi.update(q.id, { isActive: !q.is_active });
      load();
    } catch {
      toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await questionApi.delete(deleteId);
      toast({ title: "Berhasil", description: "Soal dihapus" });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    }
  };

  const filtered = questions.filter((q) =>
    !search || q.title.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeLabel = (type: string) => {
    const found = QUESTION_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6" /> Manajemen Soal
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Buat dan kelola soal untuk meningkatkan engagement member</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={schedules.length === 0}>
          <Plus className="w-4 h-4" /> Buat Soal
        </Button>
      </div>

      {schedules.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
          ⚠️ <strong>Belum ada jadwal attendance.</strong> Silakan buat jadwal attendance terlebih dahulu di menu <strong>Schedule Attendance</strong> agar dapat membuat pertanyaan.
        </div>
      )}

      <Input
        placeholder="Cari soal..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Belum ada soal</p>
            <Button onClick={openCreate} className="mt-4 gap-2" disabled={schedules.length === 0}>
              <Plus className="w-4 h-4" /> Buat Soal Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((q) => (
            <Card key={q.id} className={`transition-all hover:shadow-md ${!q.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{q.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(q.question_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                        <Star className="w-3 h-3 mr-1" /> {q.points} pts
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={q.is_active ? "default" : "secondary"} className="text-xs">
                    {q.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{q.question_text}</p>
                
                <div className="space-y-1 mb-4">
                  <p className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3 h-3" /> {q.time_limit_minutes} detik
                  </p>
                  {q.start_date && (
                    <p className="text-xs text-muted-foreground">
                      Tanggal: {formatDate(q.start_date)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(q)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <div className="flex items-center gap-2">
                    <Switch checked={q.is_active} onCheckedChange={() => handleToggleActive(q)} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(q.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Soal" : "Buat Soal Baru"}</DialogTitle>
            <DialogDescription>
              Soal akan muncul di dashboard member untuk meningkatkan engagement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="mb-1.5 block">Judul Soal *</Label>
                <Input
                  placeholder="Contoh: Pengetahuan Alkitab Minggu Ini"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Tipe Soal</Label>
                <Select 
                  value={form.questionType} 
                  onValueChange={(v) => {
                    setForm({ 
                      ...form, 
                      questionType: v as any,
                      correctAnswer: "", // Reset jawaban benar saat ganti tipe
                      options: v === 'true_false' ? ["Benar", "Salah"] : ["", "", "", ""]
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block">Poin</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: Math.min(20, parseInt(e.target.value) || 10) })}
                />
              </div>

              <div className="col-span-2">
                <Label className="mb-1.5 block">Tanggal Pelaksanaan *</Label>
                <Select
                  value={form.startDate}
                  onValueChange={(value) => setForm({ ...form, startDate: value, endDate: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tanggal attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...schedules, ...(form.startDate ? [form.startDate] : [])])).map((date) => (
                      <SelectItem key={date} value={date}>
                        {new Date(date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Hanya bisa memilih tanggal attendance yang sudah dijadwalkan di Schedule Attendance.
                </p>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Pertanyaan *</Label>
              <Textarea
                rows={3}
                placeholder="Tulis pertanyaan di sini..."
                value={form.questionText}
                onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              />
            </div>

            {/* ===== MULTIPLE CHOICE OPTIONS ===== */}
            {form.questionType === 'multiple_choice' && (
              <div>
                <Label className="mb-1.5 block">Pilihan Jawaban</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Isi pilihan jawaban lalu klik radio button untuk menandai jawaban benar
                </p>
                
                <RadioGroup 
                  value={form.correctAnswer} 
                  onValueChange={(value) => setForm({ ...form, correctAnswer: value })}
                  className="space-y-3"
                >
                  {form.options.map((option: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <RadioGroupItem 
                        value={String.fromCharCode(65 + idx)} 
                        id={`option-${idx}`}
                        className="mt-1"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <Label 
                          htmlFor={`option-${idx}`} 
                          className="font-bold text-primary min-w-[30px] cursor-pointer"
                        >
                          {String.fromCharCode(65 + idx)}.
                        </Label>
                        <Input
                          placeholder={`Jawaban ${String.fromCharCode(65 + idx)}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...form.options];
                            newOptions[idx] = e.target.value;
                            setForm({ ...form, options: newOptions });
                          }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                
                <p className="text-xs text-muted-foreground mt-2">
                  ✅ Klik bulatan di samping huruf untuk menandai sebagai jawaban benar
                </p>
              </div>
            )}

            {/* ===== TRUE/FALSE OPTIONS ===== */}
            {form.questionType === 'true_false' && (
              <div>
                <Label className="mb-1.5 block">Jawaban Benar *</Label>
                <RadioGroup 
                  value={form.correctAnswer} 
                  onValueChange={(value) => setForm({ ...form, correctAnswer: value })}
                  className="space-y-3 mt-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-green-50 transition-colors cursor-pointer"
                    onClick={() => setForm({ ...form, correctAnswer: 'Benar' })}>
                    <RadioGroupItem value="Benar" id="true-option" />
                    <Label htmlFor="true-option" className="flex-1 cursor-pointer text-green-700 font-medium">
                      ✅ Benar
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-red-50 transition-colors cursor-pointer"
                    onClick={() => setForm({ ...form, correctAnswer: 'Salah' })}>
                    <RadioGroupItem value="Salah" id="false-option" />
                    <Label htmlFor="false-option" className="flex-1 cursor-pointer text-red-700 font-medium">
                      ❌ Salah
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}



            <div>
              <Label className="mb-1.5 block">Batas Waktu (detik)</Label>
              <Input
                type="number"
                min={1}
                max={15}
                value={form.timeLimitMinutes}
                onChange={(e) => setForm({ ...form, timeLimitMinutes: Math.min(15, parseInt(e.target.value) || 15) })}
              />
              <p className="text-xs text-muted-foreground mt-1">Maksimal 15 detik</p>
            </div>
          </div>

    <DialogFooter>
        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {editing ? "Simpan" : "Buat Soal"}
        </Button>
    </DialogFooter>
    </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
            <AlertDialogDescription>
              Soal dan semua jawaban member akan dihapus permanen. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}