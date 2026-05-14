// client/pages/superadmin/SystemSettings.tsx
import { useState, useEffect } from "react";
import { Save, Loader2, ShieldCheck, Settings, Building, QrCode, Trophy, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { settingsApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface SystemSettings {
  org_name: string; org_logo_url: string;
  lateness_threshold: number; attendance_window: number;
  qr_expiry_minutes: number; allow_self_checkin: boolean;
  enable_leaderboard: boolean; ranking_enabled: boolean; ranking_period: string;
  streak_enabled: boolean; enable_notifications: boolean;
  auto_backup: boolean; maintenance_mode: boolean;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    org_name: "", org_logo_url: "",
    lateness_threshold: 15, attendance_window: 120,
    qr_expiry_minutes: 60, allow_self_checkin: true,
    enable_leaderboard: true, ranking_enabled: true, ranking_period: "month",
    streak_enabled: true, enable_notifications: true,
    auto_backup: false, maintenance_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    settingsApi.getSystemSettings()
      .then((r) => setSettings((prev) => ({ ...prev, ...r.data.data })))
      .catch(() => toast({ title: "Error", description: "Gagal memuat pengaturan", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateSystemSettings(settings);
      toast({ title: "Berhasil", description: "Pengaturan sistem disimpan" });
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const set = (key: keyof SystemSettings, value: any) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const SectionCard = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );

  const ToggleRow = ({ label, desc, setting }: { label: string; desc: string; setting: keyof SystemSettings }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={!!settings[setting]} onCheckedChange={(v) => set(setting, v)} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" /> System Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Konfigurasi sistem — hanya super admin</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Semua
        </Button>
      </div>

      {/* Organization */}
      <SectionCard icon={Building} title="Informasi Organisasi">
        <div>
          <Label className="mb-1.5 block">Nama Organisasi</Label>
          <Input value={settings.org_name} onChange={(e) => set("org_name", e.target.value)} placeholder="Nama gereja / organisasi" />
        </div>
        <div>
          <Label className="mb-1.5 block">URL Logo (opsional)</Label>
          <Input value={settings.org_logo_url} onChange={(e) => set("org_logo_url", e.target.value)} placeholder="https://..." />
          {settings.org_logo_url && (
            <img src={settings.org_logo_url} alt="logo preview" className="h-12 mt-2 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>
      </SectionCard>

      {/* Attendance */}
      <SectionCard icon={Clock} title="Pengaturan Absensi">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block">Batas Terlambat (menit)</Label>
            <Input type="number" min={1} max={120} value={settings.lateness_threshold}
              onChange={(e) => set("lateness_threshold", parseInt(e.target.value) || 15)} />
            <p className="text-xs text-muted-foreground mt-1">Menit setelah jadwal = terlambat</p>
          </div>
          <div>
            <Label className="mb-1.5 block">Window Absensi (menit)</Label>
            <Input type="number" min={30} max={480} value={settings.attendance_window}
              onChange={(e) => set("attendance_window", parseInt(e.target.value) || 120)} />
            <p className="text-xs text-muted-foreground mt-1">Durasi absensi dibuka</p>
          </div>
          <div>
            <Label className="mb-1.5 block">QR Berlaku (menit)</Label>
            <Select value={String(settings.qr_expiry_minutes)} onValueChange={(v) => set("qr_expiry_minutes", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[30,60,120,180,360,1440].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m < 60 ? `${m} menit` : m < 1440 ? `${m/60} jam` : "1 hari"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="pt-2 space-y-4 border-t">
          <ToggleRow label="Self Check-in" desc="Izinkan anggota check-in sendiri via tombol / QR" setting="allow_self_checkin" />
          <ToggleRow label="Notifikasi Email" desc="Kirim notifikasi email untuk event absensi" setting="enable_notifications" />
        </div>
      </SectionCard>

      {/* Leaderboard */}
      <SectionCard icon={Trophy} title="Pengaturan Leaderboard">
        <ToggleRow label="Aktifkan Leaderboard" desc="Tampilkan ranking kehadiran kepada semua anggota" setting="ranking_enabled" />
        <ToggleRow label="Streak Kehadiran" desc="Hitung dan tampilkan streak kehadiran berturut-turut" setting="streak_enabled" />
        <div>
          <Label className="mb-1.5 block">Periode Ranking Default</Label>
          <Select value={settings.ranking_period} onValueChange={(v) => set("ranking_period", v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="semester">6 Bulan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* System */}
      <SectionCard icon={Settings} title="Pengaturan Sistem">
        <ToggleRow label="Auto Backup" desc="Backup database otomatis setiap hari" setting="auto_backup" />
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Nonaktifkan akses sistem untuk semua pengguna kecuali super admin</p>
            </div>
            <Switch
              checked={!!settings.maintenance_mode}
              onCheckedChange={(v) => set("maintenance_mode", v)}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
          {settings.maintenance_mode && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠️ Maintenance mode aktif — anggota dan admin tidak dapat login
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Semua Pengaturan
        </Button>
      </div>
    </div>
  );
}