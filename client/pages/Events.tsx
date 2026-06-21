// client/pages/Events.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Event {
  id: number;
  event_code: string;
  event_name: string;
  description: string;
  preacher_id?: number;
  preacher_name?: string;
  season?: string;
  event_type: string;
  event_date?: string;
  is_active: boolean;
  created_at: string;
}

const defaultForm = {
  eventCode: "",
  eventName: "",
  description: "",
  preacherId: undefined as number | undefined,
  season: "",
  eventType: "worship",
  eventDate: "",
};

export default function Events() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await eventApi.getAll();
      setItems(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat event", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (e: Event) => {
    setEditing(e);
    setForm({
      eventCode: e.event_code,
      eventName: e.event_name,
      description: e.description || "",
      preacherId: e.preacher_id,
      season: e.season || "",
      eventType: e.event_type,
      eventDate: e.event_date ? e.event_date.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.eventCode.trim() || !form.eventName.trim()) {
      return toast({ title: "Validasi", description: "Event code dan name wajib diisi", variant: "destructive" });
    }
    setSaving(true);
    try {
      if (editing) {
        await eventApi.update(editing.id, {
          eventName: form.eventName,
          description: form.description,
          preacherId: form.preacherId,
          eventType: form.eventType,
          eventDate: form.eventDate || null,
        });
      } else {
        await eventApi.create(form);
      }
      toast({ title: "Berhasil", description: editing ? "Event diperbarui" : "Event dibuat" });
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (e: Event) => {
    try {
      await eventApi.update(e.id, { isActive: !e.is_active });
      load();
    } catch {
      toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await eventApi.delete(deleteId);
      toast({ title: "Berhasil", description: "Event dihapus" });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    }
  };

  const filtered = items.filter((e) =>
    !search || e.event_name.toLowerCase().includes(search.toLowerCase()) || e.event_code.toLowerCase().includes(search.toLowerCase())
  );

  const eventTypeLabels: Record<string, string> = {
    worship: "Ibadah", meeting: "Rapat", study: "Studi", fellowship: "Persekutuan", outreach: "Outreach",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Event</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Buat dan kelola event kegiatan</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Buat Event</Button>
      </div>

      <Input placeholder="Cari event..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><p className="text-muted-foreground">Belum ada event</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <Card key={e.id} className={`transition-all ${!e.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{e.event_name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{e.event_code}</p>
                  </div>
                  <Badge variant={e.is_active ? "default" : "secondary"}>{e.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description || "Tidak ada deskripsi"}</p>
                <div className="space-y-1 mb-4">
                  <p className="text-xs flex items-center gap-2"><Calendar className="w-3 h-3" /> {eventTypeLabels[e.event_type] || e.event_type}</p>
                  {e.event_date && (
                    <p className="text-xs text-muted-foreground">
                      Tanggal: {new Date(e.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  {e.preacher_name && <p className="text-xs text-muted-foreground">Penceramah: {e.preacher_name}</p>}
                  {e.season && <p className="text-xs text-muted-foreground">Season: {e.season}</p>}
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(e)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <div className="flex items-center gap-2">
                    <Switch checked={e.is_active} onCheckedChange={() => handleToggleActive(e)} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(e.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Buat Event Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Event Code *</Label><Input placeholder="EVT-001" value={form.eventCode} onChange={(e) => setForm({...form, eventCode: e.target.value.toUpperCase()})} disabled={!!editing} /></div>
            <div><Label>Event Name *</Label><Input placeholder="Nama event..." value={form.eventName} onChange={(e) => setForm({...form, eventName: e.target.value})} /></div>
            <div><Label>Deskripsi</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Tipe Event</Label><Select value={form.eventType} onValueChange={(v) => setForm({...form, eventType: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="worship">Ibadah</SelectItem><SelectItem value="meeting">Rapat</SelectItem><SelectItem value="study">Studi</SelectItem><SelectItem value="fellowship">Persekutuan</SelectItem><SelectItem value="outreach">Outreach</SelectItem></SelectContent></Select></div>
            <div><Label>Tanggal Event</Label><Input type="date" value={form.eventDate} onChange={(e) => setForm({...form, eventDate: e.target.value})} /></div>
            <div><Label>Season</Label><Input placeholder="Musim / Periode..." value={form.season} onChange={(e) => setForm({...form, season: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}