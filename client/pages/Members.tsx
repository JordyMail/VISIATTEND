// client/pages/Members.tsx
import { useState, useEffect } from "react";
import { Edit2, Trash2, Eye, EyeOff, RotateCcw, Loader2 } from "lucide-react";
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

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await userApi.getAll();
      setUsers(r.data.data);
    } catch { toast({ title: "Error", description: "Gagal memuat anggota", variant: "destructive" }); }
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
      return toast({ title: "Validasi", description: "Nama dan email wajib diisi", variant: "destructive" });
    if (!editing && (!form.password || form.password.length < 8))
      return toast({ title: "Validasi", description: "Password baru minimal 8 karakter", variant: "destructive" });

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
      toast({ title: "Berhasil", description: editing ? "Anggota diperbarui" : "Anggota ditambahkan" });
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleToggle = async (u: User) => {
    try {
      await userApi.toggleStatus(u.id);
      toast({ title: "Berhasil", description: `${u.full_name} ${u.is_active ? "dinonaktifkan" : "diaktifkan"}` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal mengubah status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await userApi.delete(selectedUser.id);
      toast({ title: "Berhasil", description: `${selectedUser.full_name} dihapus` });
      setDeleteDialogOpen(false); setSelectedUser(null); load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menghapus", variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 8)
      return toast({ title: "Validasi", description: "Password minimal 8 karakter", variant: "destructive" });
    setSaving(true);
    try {
      await userApi.resetPassword(selectedUser.id, newPassword);
      toast({ title: "Berhasil", description: `Password ${selectedUser.full_name} berhasil direset` });
      setResetDialogOpen(false); setSelectedUser(null); setNewPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal reset password", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Anggota</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kelola akun anggota, admin, dan hak akses</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger><SelectValue placeholder="Semua role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {isSA && <SelectItem value="admin">Admin</SelectItem>}
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} anggota ditemukan</p>
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
                  <TableHead>Nama</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
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
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(u)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={u.is_active ? "Nonaktifkan" : "Aktifkan"}
                          onClick={() => handleToggle(u)} disabled={u.id === me?.id}>
                          {u.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password"
                          onClick={() => { setSelectedUser(u); setNewPassword(""); setResetDialogOpen(true); }}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        {isSA && u.id !== me?.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Hapus"
                            onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      Tidak ada anggota ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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
                <Label className="mb-1.5 block">Nama Lengkap *</Label>
                <Input placeholder="Nama lengkap..." value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Member ID</Label>
                <Input placeholder="Auto-generate jika kosong" value={form.memberId}
                  onChange={(e) => setForm({ ...form, memberId: e.target.value })} disabled={!!editing} />
              </div>
              <div>
                <Label className="mb-1.5 block">No. HP</Label>
                <Input placeholder="08xxxxxxxxxx" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block">Email *</Label>
                <Input type="email" placeholder="email@domain.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
                {editing && <p className="text-xs text-muted-foreground mt-1">Email tidak dapat diubah</p>}
              </div>
              {!editing && (
                <div className="col-span-2">
                  <Label className="mb-1.5 block">Password *</Label>
                  <Input type="password" placeholder="Minimal 8 karakter" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
              {isSA && (
                <div className="col-span-2">
                  <Label className="mb-1.5 block">Role Sistem</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Member)</SelectItem>
                      <SelectItem value="admin">Admin (Operasional)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Role sistem menentukan hak akses dashboard</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Simpan" : "Tambah Anggota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(o) => { if (!o) { setResetDialogOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Reset password untuk {selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Password Baru *</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="Minimal 8 karakter"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground">
                  {showPw ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sesi aktif pengguna akan dihapus setelah password direset.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetDialogOpen(false); setSelectedUser(null); }}>Batal</Button>
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
            <AlertDialogTitle>Hapus Anggota</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus <strong>{selectedUser?.full_name}</strong>? Seluruh data kehadiran akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
