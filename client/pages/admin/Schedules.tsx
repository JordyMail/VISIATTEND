// client/pages/admin/Schedules.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { scheduleApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n";

interface Schedule {
  id: number; event_id: number; event_name: string; event_code: string; event_type: string;
  scheduled_date: string; start_time: string; end_time?: string; location?: string; notes?: string;
}
interface Event { id: number; event_code: string; event_name: string; }

const EVENT_TYPE_COLOR: Record<string, string> = {
  worship: "bg-blue-100 text-blue-700", meeting: "bg-green-100 text-green-700",
  study: "bg-purple-100 text-purple-700", fellowship: "bg-orange-100 text-orange-700",
  outreach: "bg-red-100 text-red-700",
};

const defaultForm = { eventId: "", scheduledDate: "", startTime: "", endTime: "", location: "", notes: "" };

export default function AdminSchedules() {
  const { t } = useLanguage();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents]       = useState<Event[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [filterEvent, setFilterEvent] = useState("all");
  const [showUpcoming, setShowUpcoming] = useState(false);

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [deleteId, setDeleteId]        = useState<number | null>(null);
  const [editing, setEditing]          = useState<Schedule | null>(null);
  const [form, setForm]                = useState(defaultForm);

  useEffect(() => {
    eventApi.getAll().then((r) => setEvents(r.data.data)).catch(() => {});
    load();
  }, []);

  const load = async (evId = "all", upcoming = false) => {
    setLoading(true);
    try {
      const r = await scheduleApi.getAll({
        eventId: evId !== "all" ? parseInt(evId) : undefined,
        upcoming,
      });
      setSchedules(r.data.data);
    } catch { toast({ title: t("error"), description: `${t("error")}: ${t("schedules")}`, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit   = (s: Schedule) => {
    setEditing(s);
    setForm({
      eventId: s.event_id.toString(), scheduledDate: s.scheduled_date,
      startTime: s.start_time, endTime: s.end_time || "",
      location: s.location || "", notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.eventId || !form.scheduledDate || !form.startTime)
      return toast({ title: t("validation"), description: `${t("event")}, ${t("date")}, ${t("startTime")} ${t("required").toLowerCase()}`, variant: "destructive" });
    setSaving(true);
    try {
      const payload = {
        eventId: parseInt(form.eventId), scheduledDate: form.scheduledDate,
        startTime: form.startTime, endTime: form.endTime || undefined,
        location: form.location || undefined, notes: form.notes || undefined,
      };
      if (editing) await scheduleApi.update(editing.id, payload);
      else         await scheduleApi.create(payload);
      toast({ title: t("success"), description: editing ? t("announcementUpdated") : t("addSchedule") });
      setDialogOpen(false);
      load(filterEvent, showUpcoming);
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("announcementSaveFailed"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await scheduleApi.delete(deleteId);
      toast({ title: t("success"), description: t("delete") });
      setDeleteId(null);
      load(filterEvent, showUpcoming);
    } catch { toast({ title: t("error"), description: t("announcementDeleteFailed"), variant: "destructive" }); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const isToday = (d: string) => d === new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("scheduleManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("manageOrganizationSchedules")}</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> {t("addSchedule")}</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterEvent} onValueChange={(v) => { setFilterEvent(v); load(v, showUpcoming); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("allEvents")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allEvents")}</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>{e.event_code} – {e.event_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" variant={!showUpcoming ? "default" : "outline"}
              onClick={() => { setShowUpcoming(false); load(filterEvent, false); }}>{t("all")}</Button>
            <Button size="sm" variant={showUpcoming ? "default" : "outline"}
              onClick={() => { setShowUpcoming(true); load(filterEvent, true); }}>{t("upcoming")}</Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("event")}</TableHead>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length ? schedules.map((s) => (
                  <TableRow key={s.id} className={isToday(s.scheduled_date) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isToday(s.scheduled_date) && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        <span className="text-sm font-medium">{formatDate(s.scheduled_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{s.event_name}</p>
                        <Badge variant="outline" className={`text-xs ${EVENT_TYPE_COLOR[s.event_type]}`}>
                          {s.event_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.location || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <CalendarDays className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      {t("noSchedules")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `${t("edit")} ${t("schedules")}` : t("addSchedule")}</DialogTitle>
            <DialogDescription>{t("scheduleDetails")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{t("event")} *</Label>
              <Select value={form.eventId} onValueChange={(v) => setForm({ ...form, eventId: v })}>
                <SelectTrigger><SelectValue placeholder={`${t("event")}...`} /></SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>{e.event_code} – {e.event_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("date")} *</Label>
              <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">{t("startTime")} *</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">{t("endTime")}</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("location")}</Label>
              <Input placeholder={t("placeOrRoom")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("notes")}</Label>
              <Input placeholder={t("additionalInformation")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")} {t("schedules")}</AlertDialogTitle>
            <AlertDialogDescription>{t("permanentlyDeleted")} {t("continuePrompt")}</AlertDialogDescription>
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