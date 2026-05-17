// client/pages/Settings.tsx  (Admin & SuperAdmin shared settings)
import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Loader2, User, Lock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { settingsApi } from "@/services/api";
import { getSession, setSession } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

const JABATAN_LABEL: Record<string, string> = {
  preacher:      "Preacher / Pembina",
  ketua:         "Ketua",
  wakil_ketua:   "Wakil Ketua",
  kepala_divisi: "Kepala Divisi",
  member_divisi: "Member Divisi",
  peserta:       "Peserta",
};

const ACTION_COLOR: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700", LOGOUT: "bg-gray-100 text-gray-600",
  CREATE_USER: "bg-blue-100 text-blue-700", UPDATE_USER: "bg-yellow-100 text-yellow-700",
  DELETE_USER: "bg-red-100 text-red-700", MANUAL_ATTENDANCE: "bg-purple-100 text-purple-700",
  GENERATE_REPORT: "bg-indigo-100 text-indigo-700", CREATE_EVENT: "bg-cyan-100 text-cyan-700",
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [profile, setProfile] = useState({
    full_name: "", email: "", phone_number: "", member_id: "",
    role: "", jabatan: "", division: "", avatar_url: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [logs,   setLogs]   = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pR, lR] = await Promise.all([
          settingsApi.getProfile(),
          settingsApi.getActivityLogs(15),
        ]);
        setProfile(pR.data.data);
        setLogs(lR.data.data);
      } catch {
        toast({ title: "Error", description: "Gagal memuat pengaturan", variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim())
      return toast({ title: "Validasi", description: "Nama wajib diisi", variant: "destructive" });
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        fullName: profile.full_name, phoneNumber: profile.phone_number,
        avatarUrl: profile.avatar_url || undefined,
      });
      // Sync session
      const sess = getSession();
      if (sess) {
        sess.user.full_name  = profile.full_name;
        sess.user.avatar_url = profile.avatar_url;
        setSession(sess.user, { accessToken: sess.accessToken, refreshToken: sess.refreshToken });
      }
      toast({ title: "Berhasil", description: "Profil diperbarui" });
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword)
      return toast({ title: "Validasi", description: "Semua field wajib diisi", variant: "destructive" });
    if (passwords.newPassword.length < 8)
      return toast({ title: "Validasi", description: "Password baru minimal 8 karakter", variant: "destructive" });
    if (passwords.newPassword !== passwords.confirmPassword)
      return toast({ title: "Validasi", description: "Konfirmasi password tidak cocok", variant: "destructive" });
    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal mengubah password", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const ROLE_COLOR: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700 border-purple-200",
    admin:       "bg-blue-100 text-blue-700 border-blue-200",
    user:        "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Akun</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Kelola profil dan keamanan akun kamu</p>
      </div>

      {/* Profile preview card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">{profile.full_name?.charAt(0)?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Badge variant="outline" className={ROLE_COLOR[profile.role]}>
                  {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Admin" : "Member"}
                </Badge>
                {profile.jabatan && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    {JABATAN_LABEL[profile.jabatan] || profile.jabatan}
                  </Badge>
                )}
                {profile.division && (
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700">{profile.division}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">ID: {profile.member_id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profil</TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5"><Lock className="w-3.5 h-3.5" /> Password</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Aktivitas</TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Informasi Profil</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Nama Lengkap</Label>
                  <Input value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Email</Label>
                  <Input disabled value={profile.email} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Nomor HP</Label>
                  <Input placeholder="08xxxxxxxxxx" value={profile.phone_number || ""}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Member ID</Label>
                  <Input disabled value={profile.member_id} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Jabatan</Label>
                  <Input disabled value={JABATAN_LABEL[profile.jabatan] || profile.jabatan || "-"} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Divisi</Label>
                  <Input disabled value={profile.division || "-"} className="bg-muted" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">URL Foto Profil (opsional)</Label>
                  <Input placeholder="https://..." value={profile.avatar_url || ""}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Profil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle className="text-base">Ubah Password</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {(["currentPassword","newPassword","confirmPassword"] as const).map((field) => {
                const labels = {
                  currentPassword: "Password Saat Ini",
                  newPassword:     "Password Baru",
                  confirmPassword: "Konfirmasi Password Baru",
                };
                const key = field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm";
                return (
                  <div key={field}>
                    <Label className="mb-1.5 block">{labels[field]}</Label>
                    <div className="relative">
                      <Input
                        type={showPw[key as keyof typeof showPw] ? "text" : "password"}
                        value={passwords[field]}
                        onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                      />
                      <button type="button"
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key as keyof typeof showPw] }))}>
                        {showPw[key as keyof typeof showPw] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {field === "newPassword" && (
                      <p className="text-xs text-muted-foreground mt-1">Minimal 8 karakter</p>
                    )}
                    {field === "confirmPassword" && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                    )}
                  </div>
                );
              })}
              <Button onClick={handleChangePassword}
                disabled={saving || !passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}
                className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Ubah Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="activity">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Aktivitas Akun Terakhir</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length ? logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ACTION_COLOR[l.action] || "bg-gray-100 text-gray-600"}`}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {l.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Belum ada aktivitas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
