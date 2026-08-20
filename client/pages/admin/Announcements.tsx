// client/pages/admin/Announcements.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Pin, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { announcementApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

interface Announcement {
  id: number; title: string; body: string; pinned: boolean; is_active: boolean;
  author_name?: string; created_at: string;
}

const defaultForm = { title: "", body: "", pinned: false };

export default function AdminAnnouncements() {
  const { t } = useLanguage();
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [editing, setEditing]       = useState<Announcement | null>(null);
  const [form, setForm]             = useState(defaultForm);
  const [search, setSearch]         = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await announcementApi.getAll();
      setItems(r.data.data);
    } catch { toast({ title: t("error"), description: t("announcementLoadFailed"), variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit   = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, body: a.body, pinned: a.pinned });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim())
      return toast({ title: t("validation"), description: t("titleAndBodyRequired"), variant: "destructive" });
    setSaving(true);
    try {
      if (editing) await announcementApi.update(editing.id, { title: form.title, body: form.body, pinned: form.pinned });
      else         await announcementApi.create({ title: form.title, body: form.body, pinned: form.pinned });
      toast({ title: t("success"), description: editing ? t("announcementUpdated") : t("announcementCreated") });
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("announcementSaveFailed"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (a: Announcement) => {
    try {
      await announcementApi.update(a.id, { isActive: !a.is_active });
      load();
    } catch { toast({ title: t("error"), description: t("announcementStatusFailed"), variant: "destructive" }); }
  };

  const handleTogglePin = async (a: Announcement) => {
    try {
      await announcementApi.update(a.id, { pinned: !a.pinned });
      load();
    } catch { toast({ title: t("error"), description: t("announcementPinFailed"), variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await announcementApi.delete(deleteId);
      toast({ title: t("success"), description: t("announcementDeleted") });
      setDeleteId(null);
      load();
    } catch { toast({ title: t("error"), description: t("announcementDeleteFailed"), variant: "destructive" }); }
  };

  const filtered = items.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("announcementManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("manageAnnouncements")}</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> {t("createAnnouncement")}</Button>
      </div>

      <Input placeholder={`${t("search")}...`} value={search}
        onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">{t("noAnnouncements")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id} className={`transition-all ${!a.is_active ? "opacity-60" : ""} ${a.pinned ? "border-yellow-300" : ""}`}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.pinned && <span className="text-yellow-500 text-sm">📌</span>}
                      <h3 className="font-semibold">{a.title}</h3>
                      {!a.is_active && <Badge variant="outline" className="bg-gray-100 text-gray-500 text-xs">{t("inactive")}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("by")} {a.author_name || t("systemUser")} · {new Date(a.created_at).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}
                    </p>
                  </div>
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className={`gap-1.5 text-xs ${a.pinned ? "text-yellow-600" : ""}`}
                      onClick={() => handleTogglePin(a)}>
                      <Pin className="w-3.5 h-3.5" /> {a.pinned ? t("unpin") : t("pin")}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(a)}>
                      <Pencil className="w-3.5 h-3.5" /> {t("edit")}
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={a.is_active} onCheckedChange={() => handleToggleActive(a)} className="scale-75" />
                      <span className="text-xs text-muted-foreground">{a.is_active ? t("present") : t("off")}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive"
                      onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `${t("edit")} ${t("announcements")}` : t("newAnnouncement")}</DialogTitle>
            <DialogDescription>{t("announcementVisibleToMembers")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("announcementTitle")} *</Label>
              <Input placeholder={`${t("announcementTitle")}...`} value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("announcementBody")} *</Label>
              <Textarea placeholder={t("writeAnnouncement")} rows={5}
                value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
              <Label>{t("markImportant")} ({t("pin")})</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? t("save") : t("publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")} {t("announcements")}</AlertDialogTitle>
            <AlertDialogDescription>{t("permanentlyDeleted")} {t("cannotUndo")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}