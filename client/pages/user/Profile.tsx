// client/pages/user/Profile.tsx
import { useState, useEffect } from "react";
import { Save, Loader2, User, Phone, Camera, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsApi } from "@/services/api";
import { getSessionUser, setSession, getSession } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import { useLanguage, type Language } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_COLOR: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin:       "bg-blue-100 text-blue-700 border-blue-200",
  user:        "bg-green-100 text-green-700 border-green-200",
};

export default function UserProfile() {
  const { language, setLanguage, t } = useLanguage();
  const sessionUser = getSessionUser();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [profile,  setProfile]  = useState({
    full_name: "", email: "", phone_number: "", member_id: "",
    role: "", avatar_url: "", photo_profile: "", created_at: "",
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
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("profileLoadFailed"), variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!profile.full_name.trim())
      return toast({ title: t("validation"), description: t("profileNameRequired"), variant: "destructive" });
    setSaving(true);
    try {
      const photoSource = profile.photo_profile || profile.avatar_url || undefined;
      await settingsApi.updateProfile({
        fullName:    profile.full_name,
        phoneNumber: profile.phone_number,
        avatarUrl:   photoSource,
        photoProfile: photoSource,
      });
      const sess = getSession();
      if (sess) {
        sess.user.full_name = profile.full_name;
        sess.user.avatar_url = photoSource;
        sess.user.photo_profile = photoSource;
        setSession(sess.user, { accessToken: sess.accessToken, refreshToken: sess.refreshToken });
      }
      toast({ title: t("success"), description: t("profileUpdated") });
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("updateProfileFailed"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      event.target.value = "";
      return toast({
        title: t("error"),
        description: t("fileTooLarge"),
        variant: "destructive",
      });
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfile((prev) => ({ ...prev, photo_profile: result, avatar_url: result || prev.avatar_url }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword)
      return toast({ title: t("validation"), description: t("passwordFieldsRequired"), variant: "destructive" });
    if (passwords.newPassword.length < 8)
      return toast({ title: t("validation"), description: t("minimumCharacters"), variant: "destructive" });
    if (passwords.newPassword !== passwords.confirmPassword)
      return toast({ title: t("validation"), description: t("passwordMismatch"), variant: "destructive" });
    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: t("success"), description: t("profileUpdated") });
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("profile")}</h1>

      {/* Avatar & identity card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                {(profile.photo_profile || profile.avatar_url) ? (
                  <img src={profile.photo_profile || profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow cursor-pointer hover:opacity-90">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-muted-foreground text-sm">{profile.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="outline" className={ROLE_COLOR[profile.role]}>
                  {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Admin" : "Member"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ID: {profile.member_id} · Bergabung: {profile.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "-"}
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

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="profile">{t("edit")} {t("profile")}</TabsTrigger>
          <TabsTrigger value="password">{t("password")} {t("edit").toLowerCase()}</TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("profileInfo")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="mb-1.5 block">{t("fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" className="pl-10" value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">{t("emailAddress")}</Label>
                <Input disabled value={profile.email} className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">{t("emailCannotChange")}</p>
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1.5 block">{t("phoneNumber")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" className="pl-10" placeholder="08xxxxxxxxxx"
                    value={profile.phone_number || ""}
                    onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="avatar" className="mb-1.5 block">{t("profilePhotoUrl")}</Label>
                  <Input id="avatar" value={profile.photo_profile || profile.avatar_url || ""} readOnly className="bg-muted" placeholder={t("noData")} />
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
            <CardHeader><CardTitle className="text-base">{t("password")} {t("edit").toLowerCase()}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(["currentPassword","newPassword","confirmPassword"] as const).map((field) => {
                const labels = { currentPassword:t("currentPassword"), newPassword:t("newPassword"), confirmPassword:t("confirmNewPassword") };
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
                        {showPw[field === "currentPassword" ? "current" : field === "newPassword" ? "new" : "confirm"] ? t("hide") : t("show")}
                      </button>
                    </div>
                    {field === "newPassword" && <p className="text-xs text-muted-foreground mt-1">{t("minimumCharacters")}</p>}
                    {field === "confirmPassword" && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{t("passwordMismatchShort")}</p>
                    )}
                  </div>
                );
              })}
              <Button onClick={handleChangePassword} disabled={saving ||
                !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword ||
                passwords.newPassword !== passwords.confirmPassword}
                className="gap-2 w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("password")} {t("edit").toLowerCase()}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}