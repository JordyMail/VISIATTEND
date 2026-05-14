// client/pages/user/Profile.tsx
import { useState, useEffect } from "react";
import { Save, Loader2, User, Phone, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsApi } from "@/services/api";
import { getSessionUser, setSession, getSession } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

const JABATAN_LABEL: Record<string, string> = {
  preacher:      "Preacher / Pembina",
  ketua:         "Ketua",
  wakil_ketua:   "Wakil Ketua",
  kepala_divisi: "Kepala Divisi",
  member_divisi: "Member Divisi",
  peserta:       "Peserta",
};

const ROLE_COLOR: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin:       "bg-blue-100 text-blue-700 border-blue-200",
  user:        "bg-green-100 text-green-700 border-green-200",
};

export default function UserProfile() {
  const sessionUser = getSessionUser();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [profile,  setProfile]  = useState({
    full_name: "", email: "", phone_number: "", member_id: "",
    role: "", jabatan: "", division: "", avatar_url: "", created_at: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const r = await settingsApi.getProfile();
      setProfile(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat profil", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim())
      return toast({ title: "Validasi", description: "Nama wajib diisi", variant: "destructive" });
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        fullName:    profile.full_name,
        phoneNumber: profile.phone_number,
        avatarUrl:   profile.avatar_url || undefined,
      });
      // Update session user
      const sess = getSession();
      if (sess) {
        sess.user.full_name  = profile.full_name;
        sess.user.avatar_url = profile.avatar_url;
        setSession(sess.user, { accessToken: sess.accessToken, refreshToken: sess.refreshToken });
      }
      toast({ title: "Berhasil", description: "Profil berhasil diperbarui" });
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal memperbarui profil", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword)
      return toast({ title: "Validasi", description: "Semua field password wajib diisi", variant: "destructive" });
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profil Saya</h1>

      {/* Avatar & identity card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-muted-foreground text-sm">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="outline" className={ROLE_COLOR[profile.role]}>
                  {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Admin" : "Member"}
                </Badge>
                {profile.jabatan && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    {JABATAN_LABEL[profile.jabatan] || profile.jabatan}
                  </Badge>
                )}
                {profile.division && (
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                    {profile.division}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ID: {profile.member_id} · Bergabung: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="profile">Edit Profil</TabsTrigger>
          <TabsTrigger value="password">Ubah Password</TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Informasi Pribadi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="mb-1.5 block">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" className="pl-10" value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input disabled value={profile.email} className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email hanya dapat diubah oleh admin</p>
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1.5 block">Nomor HP</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" className="pl-10" placeholder="08xxxxxxxxxx"
                    value={profile.phone_number || ""}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="avatar" className="mb-1.5 block">URL Foto Profil (opsional)</Label>
                <Input id="avatar" placeholder="https://..." value={profile.avatar_url || ""}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Jabatan</Label>
                  <Input disabled value={JABATAN_LABEL[profile.jabatan] || profile.jabatan || "-"} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Divisi</Label>
                  <Input disabled value={profile.division || "-"} className="bg-muted" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Perubahan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle className="text-base">Ubah Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(["currentPassword","newPassword","confirmPassword"] as const).map((field) => {
                const labels = { currentPassword:"Password Saat Ini", newPassword:"Password Baru", confirmPassword:"Konfirmasi Password Baru" };
                return (
                  <div key={field}>
                    <Label className="mb-1.5 block">{labels[field]}</Label>
                    <div className="relative">
                      <Input
                        type={showPw[field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm"] ? "text" : "password"}
                        value={passwords[field]}
                        onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                      />
                      <button type="button"
                        onClick={() => setShowPw((p) => ({ ...p, [field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm"]: !p[field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm"] }))}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs">
                        {showPw[field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm"] ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </div>
                    {field === "newPassword" && <p className="text-xs text-muted-foreground mt-1">Minimal 8 karakter</p>}
                    {field === "confirmPassword" && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                    )}
                  </div>
                );
              })}
              <Button onClick={handleChangePassword} disabled={saving ||
                !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword ||
                passwords.newPassword !== passwords.confirmPassword}
                className="gap-2 w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Ubah Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}