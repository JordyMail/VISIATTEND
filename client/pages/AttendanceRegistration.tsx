import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Save, ShieldCheck, UserPlus2, Video } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { setPendingRegistrationProfile } from "@/lib/attendanceFlow";

type RegistrationType = "student" | "other" | "";

interface RegistrationFormState {
  name: string;
  email: string;
  category: RegistrationType;
  phone: string;
  birthday: string;
}

const INITIAL_FORM: RegistrationFormState = {
  name: "",
  email: "",
  category: "",
  phone: "",
  birthday: "",
};

export default function AttendanceRegistration() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<RegistrationFormState>(INITIAL_FORM);
  const [isSaved, setIsSaved] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isFormComplete = useMemo(() => {
    return (
      formState.name.trim() !== "" &&
      formState.email.trim() !== "" &&
      formState.category !== "" &&
      formState.phone.trim() !== "" &&
      formState.birthday.trim() !== ""
    );
  }, [formState]);

  const updateField = <K extends keyof RegistrationFormState>(key: K, value: RegistrationFormState[K]) => {
    if (isSaved) {
      return;
    }

    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleConfirmSave = () => {
    setPendingRegistrationProfile({
      name: formState.name,
      email: formState.email,
      category: formState.category,
      phone: formState.phone,
      birthday: formState.birthday,
    });
    setIsSaved(true);
    setIsConfirmOpen(false);
    toast({
      title: "Data saved",
      description: "Data registrasi awal berhasil disimpan.",
    });
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.16),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_20%),linear-gradient(180deg,_rgba(248,250,252,0.99),_rgba(241,245,249,0.98))] p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="overflow-hidden rounded-[30px] bg-gradient-to-r from-[#7c4dff] via-[#5968ff] to-[#5da2ff] px-6 py-8 text-white shadow-[0_28px_90px_-48px_rgba(79,70,229,0.78)] md:px-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Start Registration
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">Input data awal registrasi</h1>
            <p className="max-w-2xl text-sm text-white/85 sm:text-base">
              Isi semua data terlebih dahulu. Setelah data disimpan, form akan terkunci dan tombol Start Face Registration akan aktif.
            </p>
          </div>
        </section>

        <Card className="rounded-[28px] border-white/60 bg-white/80 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registration-name">Nama</Label>
                <Input
                  id="registration-name"
                  placeholder="Masukkan nama lengkap"
                  value={formState.name}
                  disabled={isSaved}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-email">Email</Label>
                <Input
                  id="registration-email"
                  type="email"
                  placeholder="Masukkan email"
                  value={formState.email}
                  disabled={isSaved}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Student or Other</Label>
                <Select
                  value={formState.category}
                  disabled={isSaved}
                  onValueChange={(value) => updateField("category", value as RegistrationType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration-phone">Phone</Label>
                <Input
                  id="registration-phone"
                  type="tel"
                  placeholder="Masukkan nomor telepon"
                  value={formState.phone}
                  disabled={isSaved}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="registration-birthday">Birthday</Label>
                <Input
                  id="registration-birthday"
                  type="date"
                  value={formState.birthday}
                  disabled={isSaved}
                  onChange={(event) => updateField("birthday", event.target.value)}
                />
              </div>
            </div>

            {!isFormComplete && !isSaved && (
              <p className="text-sm text-amber-600">
                Lengkapi semua field terlebih dahulu agar tombol save aktif.
              </p>
            )}

            {isSaved && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Data registrasi sudah disimpan dan field sekarang terkunci.
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 md:max-w-sm">
              <Button
                type="button"
                className="h-12 justify-between rounded-2xl"
                disabled={!isFormComplete || isSaved}
                onClick={() => setIsConfirmOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-12 justify-between rounded-2xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                disabled={!isSaved}
                onClick={() => navigate("/attendance/face-registration")}
              >
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Start Face Registration
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Setelah disimpan, data nama, email, student or other, phone, dan birthday akan menjadi disable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Ya, Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}