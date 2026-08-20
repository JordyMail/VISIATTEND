// client/pages/Settings.tsx  (Admin & SuperAdmin shared settings)
import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Loader2, User, Lock, Activity, Languages } from "lucide-react";
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
import { getSessionUser, getSession, setSession, clearSession } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import { useLanguage, type Language } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const JABATAN_LABEL: Record<string, string> = {
  preacher:      "Preacher / Pembina",
  ketua:         "Ketua",
  wakil_ketua:   "Wakil Ketua",
  kepala_divisi: "Kepala Divisi",
  member_divisi: "Member Divisi",
  peserta:       "Peserta",
};

const ACTION_COLOR: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700", 
  LOGOUT: "bg-gray-100 text-gray-600",
  CREATE_USER: "bg-blue-100 text-blue-700", 
  UPDATE_USER: "bg-yellow-100 text-yellow-700",
  DELETE_USER: "bg-red-100 text-red-700", 
  MANUAL_ATTENDANCE: "bg-purple-100 text-purple-700",
  GENERATE_REPORT: "bg-indigo-100 text-indigo-700", 
  CREATE_EVENT: "bg-cyan-100 text-cyan-700",
  UPDATE_PROFILE: "bg-teal-100 text-teal-700",
  CHANGE_PASSWORD: "bg-orange-100 text-orange-700",
};

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const sessionUser = getSessionUser();
  const isSuperAdmin = sessionUser?.role === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "", 
    email: "", 
    phone_number: "", 
    member_id: "",
    role: "", 
    jabatan: "", 
    division: "", 
    avatar_url: "",
    created_at: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "", 
    newPassword: "", 
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, logsRes] = await Promise.all([
        settingsApi.getProfile(),
        settingsApi.getActivityLogs(15),
      ]);
      setProfile(profileRes.data.data);
      setLogs(logsRes.data.data || []);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({ 
        title: t("error"), 
        description: error.response?.data?.message || t("error"), 
        variant: "destructive" 
      });
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim()) {
      toast({ title: t("validation"), description: `${t("fullName")} ${t("required").toLowerCase()}`, variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const updateData: any = {
        fullName: profile.full_name,
      };
      
      if (profile.phone_number !== undefined) {
        updateData.phoneNumber = profile.phone_number;
      }
      if (profile.avatar_url !== undefined) {
        updateData.avatarUrl = profile.avatar_url || null;
      }
      
      await settingsApi.updateProfile(updateData);
      
      // Update session if needed
      const sess = getSession();
      if (sess && sess.user) {
        sess.user.full_name = profile.full_name;
        sess.user.avatar_url = profile.avatar_url;
        setSession(sess.user, { 
          accessToken: sess.accessToken, 
          refreshToken: sess.refreshToken 
        });
      }
      
      toast({ title: t("success"), description: t("profileUpdated") });
      await loadData(); // Reload data to get fresh info
    } catch (e: any) {
      toast({ 
        title: t("error"), 
        description: e.response?.data?.message || t("error"), 
        variant: "destructive" 
      });
    } finally { 
      setSaving(false); 
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword) {
      toast({ title: t("validation"), description: `${t("password")} ${t("required").toLowerCase()}`, variant: "destructive" });
      return;
    }
    if (!passwords.newPassword) {
      toast({ title: t("validation"), description: `${t("newPassword")} ${t("required").toLowerCase()}`, variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast({ title: t("validation"), description: t("minimumCharacters"), variant: "destructive" });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: t("validation"), description: t("passwordMismatch"), variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: t("success"), description: t("profileUpdated") });
      
      // Optional: Clear sensitive data from memory after timeout
      setTimeout(() => {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }, 3000);
    } catch (e: any) {
      toast({ 
        title: t("error"), 
        description: e.response?.data?.message || t("error"), 
        variant: "destructive" 
      });
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ROLE_COLOR: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700 border-purple-200",
    admin: "bg-blue-100 text-blue-700 border-blue-200",
    user: "bg-green-100 text-green-700 border-green-200",
  };

  const ROLE_LABEL: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    user: "Member",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("accountSettings")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("manageProfileSecurity")}</p>
      </div>

      {/* Profile preview card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <Badge variant="outline" className={ROLE_COLOR[profile.role] || "bg-gray-100"}>
                  {ROLE_LABEL[profile.role] || profile.role || "Member"}
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
              <p className="text-xs text-muted-foreground mt-1">
                ID: {profile.member_id} • Bergabung: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="w-4 h-4" /> {t("language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("language")}</Label>
          <Select value={language} onValueChange={(value) => {
            setLanguage(value as Language);
            toast({ title: t("language"), description: t("languageSaved") });
          }}>
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("english")}</SelectItem>
              <SelectItem value="id">{t("indonesian")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("languageDescription")}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'} w-full max-w-sm`}>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="w-3.5 h-3.5" /> {t("profile")}
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5">
            <Lock className="w-3.5 h-3.5" /> {t("password")}
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> {t("activity")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("profileInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">{t("fullName")}</Label>
                  <Input 
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} 
                    placeholder="Nama lengkap"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">{t("emailAddress")}</Label>
                  <Input disabled value={profile.email} className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">{t("emailCannotChange")}</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">{t("memberId")}</Label>
                  <Input disabled value={profile.member_id} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">{t("phoneNumber")}</Label>
                  <Input 
                    placeholder="08xxxxxxxxxx" 
                    value={profile.phone_number || ""}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} 
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">{t("organizationRole")}</Label>
                  <Input disabled value={JABATAN_LABEL[profile.jabatan] || profile.jabatan || "-"} className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-1.5 block">{t("divisions")}</Label>
                  <Input disabled value={profile.division || "-"} className="bg-muted" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">{t("profilePhotoUrl")}</Label>
                  <Input 
                    placeholder="https://example.com/avatar.jpg" 
                    value={profile.avatar_url || ""}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Masukkan URL gambar (jpg, png) untuk foto profil
                  </p>
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
        <TabsContent value="password" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("password")} {t("edit").toLowerCase()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => {
                const labels = {
                  currentPassword: t("currentPassword"),
                  newPassword: t("newPassword"),
                  confirmPassword: t("confirmNewPassword"),
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
                        placeholder={field === "currentPassword" ? "••••••••" : t("minimumCharacters")}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key as keyof typeof showPw] }))}
                      >
                        {showPw[key as keyof typeof showPw] ? 
                          <EyeOff className="w-4 h-4" /> : 
                          <Eye className="w-4 h-4" />
                        }
                      </button>
                    </div>
                    {field === "newPassword" && (
                      <p className="text-xs text-muted-foreground mt-1">{t("passwordRequirements")}</p>
                    )}
                    {field === "confirmPassword" && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{t("passwordMismatchShort")}</p>
                    )}
                  </div>
                );
              })}
              <Button 
                onClick={handleChangePassword}
                disabled={saving || !passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}
                className="gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("password")} {t("edit").toLowerCase()}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity tab */}
        <TabsContent value="activity" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t("accountActivity")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Menampilkan {logs.length} aktivitas terbaru</p>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t("actions")}</TableHead>
                    <TableHead>{t("actionDescription")}</TableHead>
                    <TableHead className="w-[180px]">{t("time")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length > 0 ? logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${ACTION_COLOR[log.action] || "bg-gray-100 text-gray-600"}`}>
                          {log.action || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground break-words">
                        {log.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString("id-ID") : "-"}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
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