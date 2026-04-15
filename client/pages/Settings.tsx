// client/pages/Settings.tsx
import { useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";
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
import { mockActivityLogs, getRecentActivities } from "@/data/mockData";

export default function Settings() {
  const [profileData, setProfileData] = useState({
    fullName: "Admin User",
    email: "admin@visiattend.com",
    phoneNumber: "08123456789",
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
    latenessThreshold: 15, // minutes
    enableNotifications: true,
    enableLeaderboard: true,
    autoBackup: false,
    maintenanceMode: false,
  });

  const recentActivities = getRecentActivities(10);

  const handleSaveProfile = () => {
    // Handle profile save
    console.log("Profile saved:", profileData);
  };

  const handleSavePassword = () => {
    if (passwordData.newPassword === passwordData.confirmPassword) {
      // Handle password change
      console.log("Password changed");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const handleSystemSettingChange = (
    key: keyof typeof systemSettings,
    value: number | boolean
  ) => {
    setSystemSettings({ ...systemSettings, [key]: value });
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and system configuration
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="mb-2 block">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, fullName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="email" className="mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="phone" className="mb-2 block">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={profileData.phoneNumber}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      phoneNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">Role</Label>
                <Input
                  disabled
                  value="Administrator"
                  className="bg-muted"
                />
              </div>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleSaveProfile}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">Change Password</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="mb-2 block">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current,
                      })
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword" className="mb-2 block">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        new: !showPasswords.new,
                      })
                    }
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="mb-2 block">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm,
                      })
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleSavePassword}
              >
                <Save className="w-4 h-4" />
                Update Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* System Tab */}
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
                  value={systemSettings.latenessThreshold}
                  onChange={(e) =>
                    handleSystemSettingChange(
                      "latenessThreshold",
                      parseInt(e.target.value)
                    )
                  }
                  min="1"
                  max="60"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Students arriving after this many minutes will be marked as
                  late
                </p>
              </div>

              <hr />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for attendance events
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.enableNotifications}
                    onCheckedChange={(checked) =>
                      handleSystemSettingChange("enableNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Leaderboard</Label>
                    <p className="text-sm text-muted-foreground">
                      Display attendance leaderboard to students
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.enableLeaderboard}
                    onCheckedChange={(checked) =>
                      handleSystemSettingChange("enableLeaderboard", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup attendance data daily
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) =>
                      handleSystemSettingChange("autoBackup", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict system access for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      handleSystemSettingChange("maintenanceMode", checked)
                    }
                  />
                </div>
              </div>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => console.log("System settings saved")}
              >
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Activity Log</h2>
              <p className="text-sm text-muted-foreground">
                View recent system activities and user actions
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Badge variant="outline">{activity.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {activity.entityType}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(activity.createdAt).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
