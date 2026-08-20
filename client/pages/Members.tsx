// client/pages/Members.tsx
import { useState, useEffect } from "react";
import { Edit2, Trash2, Eye, EyeOff, RotateCcw, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { userApi } from "@/services/api";
import { getSessionUser, isRole } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

interface User {
  id: number; full_name: string; member_id: string; email: string;
  role: "super_admin" | "admin" | "user"; category?: string;
  phone_number?: string; is_active: boolean; created_at: string; last_login?: string;
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin:       "bg-blue-100 text-blue-700 border-blue-200",
  user:        "bg-green-100 text-green-700 border-green-200",
};

const STATUS_COLOR = {
  active:   "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-red-100 text-red-700 border-red-200",
};

const defaultForm = {
  fullName: "", memberId: "", email: "", password: "",
  role: "user" as "super_admin" | "admin" | "user",
  phoneNumber: "",
};

export default function Members() {
  const { t } = useLanguage();
  const me       = getSessionUser();
  const isSA     = isRole("super_admin");
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [filterRole, setFilterRole]       = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm]             = useState(defaultForm);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", password: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await userApi.getAll();
      setUsers(r.data.data);
    } catch { toast({ title: t("error"), description: `${t("error")}: ${t("members")}`, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const filtered = users.filter((u) => {
    const matchRole   = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.is_active : !u.is_active);
    return matchRole && matchStatus;
  });

  const openEdit   = (u: User) => {
    setEditing(u);
    setForm({ fullName: u.full_name, memberId: u.member_id, email: u.email, password: "",
      role: u.role, phoneNumber: u.phone_number || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.email.trim())
      return toast({ title: t("validation"), description: `${t("name")} ${t("required").toLowerCase()}`, variant: "destructive" });
    if (!editing && (!form.password || form.password.length < 8))
      return toast({ title: t("validation"), description: t("minimumCharacters"), variant: "destructive" });

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber || undefined,
        ...(isSA ? { role: form.role } : {}),
        ...(!editing ? { memberId: form.memberId || undefined, password: form.password } : {}),
      };
      if (editing) await userApi.update(editing.id, payload);
      else         await userApi.create(payload);
      toast({ title: t("success"), description: editing ? t("profileUpdated") : t("add") });
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleToggle = async (u: User) => {
    try {
      await userApi.toggleStatus(u.id);
      toast({ title: t("success"), description: `${u.full_name}: ${u.is_active ? t("inactive") : t("present")}` });
      load();
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await userApi.delete(selectedUser.id);
      toast({ title: t("success"), description: `${selectedUser.full_name}: ${t("delete")}` });
      setDeleteDialogOpen(false); setSelectedUser(null); load();
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 8)
      return toast({ title: t("validation"), description: t("minimumCharacters"), variant: "destructive" });
    setSaving(true);
    try {
      await userApi.resetPassword(selectedUser.id, newPassword);
      toast({ title: t("success"), description: `${t("password")} ${selectedUser.full_name}: ${t("success").toLowerCase()}` });
      setResetDialogOpen(false); setSelectedUser(null); setNewPassword("");
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddAdmin = async () => {
    if (!adminForm.fullName.trim() || !adminForm.email.trim() || !adminForm.password) {
      return toast({ title: t("validation"), description: `${t("adminName")}, ${t("adminEmail")}, ${t("adminPassword")} ${t("required").toLowerCase()}`, variant: "destructive" });
    }
    if (adminForm.password.length < 8) {
      return toast({ title: t("validation"), description: t("minimumCharacters"), variant: "destructive" });
    }

    setAdminSaving(true);
    try {
      await userApi.create({
        fullName: adminForm.fullName.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password,
        role: "admin",
      });
      toast({ title: t("success"), description: t("adminCreated") });
      setAdminForm({ fullName: "", email: "", password: "" });
      setAdminDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    } finally {
      setAdminSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("members")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("manageProfileSecurity")}</p>
        </div>
        {isSA && (
          <Button onClick={() => setAdminDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> {t("addAdmin")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger><SelectValue placeholder={t("all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {isSA && <SelectItem value="admin">{t("adminOperational")}</SelectItem>}
              <SelectItem value="user">{t("userMember")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder={t("all")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="active">{t("active")}</SelectItem>
              <SelectItem value="inactive">{t("inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} {t("memberLabel").toLowerCase()} {t("noResults").toLowerCase()}</p>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("management")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actionsLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{u.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{u.member_id}</TableCell>
                    <TableCell className="text-sm">{u.category || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLOR[u.role]}>
                        {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={u.is_active ? STATUS_COLOR.active : STATUS_COLOR.inactive}>
                        {u.is_active ? t("present") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(!isSA && u.role === "admin") ? null : (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={t("edit")} onClick={() => openEdit(u)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={u.is_active ? t("inactive") : t("present")}
                          onClick={() => handleToggle(u)} disabled={u.id === me?.id}>
                          {u.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={t("resetPassword")}
                          onClick={() => { setSelectedUser(u); setNewPassword(""); setResetDialogOpen(true); }}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        {isSA && u.id !== me?.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title={t("delete")}
                            onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      {t("noMembersFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={(open) => {
        setAdminDialogOpen(open);
        if (!open) setAdminForm({ fullName: "", email: "", password: "" });
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addAdmin")}</DialogTitle>
            <DialogDescription>{t("addAdminDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("adminName")} *</Label>
              <Input
                name="new-admin-name"
                autoComplete="off"
                value={adminForm.fullName}
                placeholder={t("adminName")}
                onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("adminEmail")} *</Label>
              <Input
                type="email"
                name="new-admin-email"
                autoComplete="off"
                value={adminForm.email}
                placeholder={t("adminEmail")}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("adminPassword")} *</Label>
              <Input
                type="password"
                name="new-admin-password"
                autoComplete="new-password"
                value={adminForm.password}
                placeholder={t("minimumCharacters")}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleAddAdmin} disabled={adminSaving} className="gap-2">
              {adminSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("addAdmin")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Anggota" : "Tambah Anggota Baru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi anggota" : "Isi detail untuk membuat akun baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="mb-1.5 block">{t("fullName")} *</Label>
                <Input placeholder={t("fullName")} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">{t("memberId")}</Label>
                <Input placeholder={t("memberId")} value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })} disabled={!!editing} />
              </div>
              <div>
                <Label className="mb-1.5 block">{t("phoneNumber")}</Label>
                <Input placeholder={t("phoneNumber")} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block">{t("emailAddress")} *</Label>
                  <Input type="email" placeholder={t("emailAddress")} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
                {editing && <p className="text-xs text-muted-foreground mt-1">{t("emailCannotChange")}</p>}
              </div>
              {!editing && (
                <div className="col-span-2">
                  <Label className="mb-1.5 block">{t("password")} *</Label>
                  <Input type="password" placeholder={t("minimumCharacters")} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? t("save") : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(o) => { if (!o) { setResetDialogOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("resetPassword")}</DialogTitle>
            <DialogDescription>Reset password untuk {selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">{t("newPassword")} *</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder={t("minimumCharacters")}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground">
                  {showPw ? t("hide") : t("show")}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("activeSessionReset")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetDialogOpen(false); setSelectedUser(null); }}>{t("cancel")}</Button>
            <Button onClick={handleResetPassword} disabled={saving || !newPassword} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")} {t("memberLabel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteMemberConfirmation").replace("{name}", selectedUser?.full_name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("permanentDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
