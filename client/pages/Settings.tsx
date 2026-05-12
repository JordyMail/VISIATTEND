// client/pages/Settings.tsx
import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { settingsApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
    memberId: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [systemSettings, setSystemSettings] = useState({
    lateness_threshold: 15,
    enable_notifications: true,
    enable_leaderboard: true,
    auto_backup: false,
    maintenance_mode: false,
  });

  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // ─── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, systemRes, logsRes] = await Promise.all([
          settingsApi.getProfile(),
          settingsApi.getSystemSettings(),
          settingsApi.getActivityLogs(20),
        ]);

        const p = profileRes.data.data;
        setProfileData({
          fullName: p.full_name || "",
          email: p.email || "",
          phoneNumber: p.phone_number || "",
          role: p.role || "",
          memberId: p.member_id || "",
        });

        setSystemSettings((prev) => ({ ...prev, ...systemRes.data.data }));
        setActivityLogs(logsRes.data.data);
      } catch (err: any) {
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ─── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profileData.fullName || !profileData.email) {
      toast({ title: "Validation", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        fullName: profileData.fullName,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber,
      });
      toast({ title: "Success", description: "Profile updated successfully." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Change password ────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({ title: "Validation", description: "Fill all password fields.", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Validation", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({ title: "Validation", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await settingsApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Success", description: "Password changed successfully." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Save system settings ───────────────────────────────────────────────────
  const handleSaveSystem = async () => {
    setSaving(true);
    try {
      await settingsApi.updateSystemSettings(systemSettings);
      toast({ title: "Success", description: "System settings saved." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSystemChange = (key: keyof typeof systemSettings, value: number | boolean) => {
    setSystemSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and system configuration
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="mb-2 block">Full Name</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-2 block">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-2 block">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Member ID</Label>
                <Input disabled value={profileData.memberId} className="bg-muted" />
              </div>
              <div>
                <Label className="mb-2 block">Role</Label>
                <Input disabled value={profileData.role} className="bg-muted capitalize" />
              </div>
              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── Password ── */}
        <TabsContent value="password" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Change Password</h2>
            <div className="space-y-4">
              {(
                [
                  { id: "currentPassword", label: "Current Password", key: "current" as const, field: "currentPassword" as const },
                  { id: "newPassword", label: "New Password", key: "new" as const, field: "newPassword" as const },
                  { id: "confirmPassword", label: "Confirm New Password", key: "confirm" as const, field: "confirmPassword" as const },
                ] as const
              ).map(({ id, label, key, field }) => (
                <div key={id}>
                  <Label htmlFor={id} className="mb-2 block">{label}</Label>
                  <div className="relative">
                    <Input
                      id={id}
                      type={showPasswords[key] ? "text" : "password"}
                      value={passwordData[field]}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, [field]: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })
                      }
                    >
                      {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleSavePassword}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── System ── */}
        <TabsContent value="system" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">System Settings</h2>
            <div className="space-y-6">
              <div>
                <Label htmlFor="lateness" className="mb-2 block">
                  Lateness Threshold (minutes)
                </Label>
                <Input
                  id="lateness"
                  type="number"
                  value={systemSettings.lateness_threshold}
                  onChange={(e) =>
                    handleSystemChange("lateness_threshold", parseInt(e.target.value) || 0)
                  }
                  min="1"
                  max="60"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Members arriving after this many minutes will be marked as late
                </p>
              </div>
              <hr />
              <div className="space-y-4">
                {(
                  [
                    { key: "enable_notifications", label: "Enable Notifications", desc: "Send email notifications for attendance events" },
                    { key: "enable_leaderboard", label: "Enable Leaderboard", desc: "Display attendance leaderboard to members" },
                    { key: "auto_backup", label: "Auto Backup", desc: "Automatically backup attendance data daily" },
                    { key: "maintenance_mode", label: "Maintenance Mode", desc: "Restrict system access for maintenance" },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={!!systemSettings[key]}
                      onCheckedChange={(v) => handleSystemChange(key, v)}
                    />
                  </div>
                ))}
              </div>
              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleSaveSystem}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── Audit Log ── */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Activity Log</h2>
              <p className="text-sm text-muted-foreground">
                Recent system activities and user actions
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-sm">
                          {log.user_name || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entity_type || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No activity logs found
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
