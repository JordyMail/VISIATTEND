// client/pages/superadmin/Divisions.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Layers, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { divisionApi, userApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Division {
  id: number; name: string; description?: string;
  leader_id?: number; leader_name?: string; is_active: boolean; created_at: string;
}
interface User { id: number; full_name: string; jabatan?: string; }

const defaultForm = { name: "", description: "", leaderId: "" };

export default function SuperAdminDivisions() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Division | null>(null);
  const [form, setForm]             = useState(defaultForm);

  useEffect(() => {
    load();
    userApi.getAll({ isActive: true }).then((r) => setUsers(r.data.data)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await divisionApi.getAll();
      setDivisions(r.data.data);
    } catch { toast({ title: "Error", description: "Gagal memuat divisi", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit   = (d: Division) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || "", leaderId: d.leader_id?.toString() || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: "Validasi", description: "Nama divisi wajib diisi", variant: "destructive" });
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description || undefined, leaderId: form.leaderId ? parseInt(form.leaderId) : undefined };
      if (editing) await divisionApi.update(editing.id, payload);
      else         await divisionApi.create(payload);
      toast({ title: "Berhasil", description: editing ? "Divisi diperbarui" : "Divisi dibuat" });
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (d: Division) => {
    try {
      await divisionApi.update(d.id, { isActive: !d.is_active });
      load();
    } catch { toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" }); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> Manajemen Divisi
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kelola divisi dan pelayanan dalam organisasi</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Tambah Divisi</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : divisions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Layers className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p className="text-muted-foreground">Belum ada divisi</p>
            <Button onClick={openCreate} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Tambah Pertama</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((d) => (
            <Card key={d.id} className={`transition-all hover:shadow-md ${!d.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${d.is_active ? "bg-primary/10" : "bg-gray-100"}`}>
                      <Layers className={`w-4 h-4 ${d.is_active ? "text-primary" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      {!d.is_active && <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500">Nonaktif</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => openEdit(d)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {d.description && <p className="text-sm text-muted-foreground mb-3">{d.description}</p>}
                {d.leader_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                    <Users className="w-3.5 h-3.5" />
                    <span>Leader: <span className="font-medium text-foreground">{d.leader_name}</span></span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("id-ID", { month:"short", year:"numeric" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.is_active ? "Aktif" : "Nonaktif"}</span>
                    <Switch checked={d.is_active} onCheckedChange={() => handleToggleActive(d)} className="scale-75" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Divisi" : "Tambah Divisi Baru"}</DialogTitle>
            <DialogDescription>Divisi digunakan untuk mengelompokkan anggota dalam organisasi</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Nama Divisi *</Label>
              <Input placeholder="cth: Worship, Youth, Komsel..."
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Deskripsi</Label>
              <Input placeholder="Deskripsi singkat divisi..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Kepala Divisi</Label>
              <Select value={form.leaderId} onValueChange={(v) => setForm({ ...form, leaderId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kepala divisi (opsional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Belum ditentukan</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.full_name}{u.jabatan ? ` (${u.jabatan.replace(/_/g," ")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}