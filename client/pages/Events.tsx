// client/pages/Events.tsx
import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { Pencil, Trash2, Loader2, CalendarDays, Plus, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import {
  format, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Event {
  id: number;
  event_code: string;
  event_name: string;
  description?: string;
  date_event?: string;
  created_at: string;
}

type FilterOption =
  | "this_week" | "last_week" | "this_month" | "last_month"
  | "this_year" | "custom" | "all_time";

const calendarClassNames = {
  months: "flex flex-col",
  month: "flex flex-col",
  month_caption: "flex justify-center items-center h-9 mb-1",
  caption_label: "text-sm font-medium",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "text-muted-foreground w-9 h-9 flex items-center justify-center font-normal text-[0.8rem]",
  week: "flex w-full",
  day: "relative w-9 h-9 flex items-center justify-center p-0 text-sm",
  day_button:
    "w-9 h-9 rounded-full font-normal hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  selected: "!bg-blue-500 !text-white rounded-full hover:!bg-blue-600 font-semibold",
  today: "bg-accent text-accent-foreground rounded-full font-bold",
  outside: "text-muted-foreground opacity-40",
  disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
  hidden: "invisible",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Events() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [filter, setFilter] = useState<FilterOption>("all_time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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

  const eventDates: Date[] = items
    .filter((e) => !!e.date_event)
    .map((e) => parseISO(e.date_event!));

  const getEventForDate = (d: Date): Event | undefined =>
    items.find((e) => e.date_event && isSameDay(parseISO(e.date_event), d));

  const selectedEvent = selectedDate ? getEventForDate(selectedDate) : undefined;
  const selectedHasEvent = !!selectedEvent;

  const today = startOfDay(new Date());

  const isPastDate = (dateStr?: string) => {
    if (!dateStr) return false;
    return startOfDay(parseISO(dateStr)) < today;
  };

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    if (day < today) return;
    setSelectedDate((prev) => (prev && isSameDay(prev, day) ? undefined : day));
  };

  const openCreate = () => { setEventName(""); setEventDescription(""); setCreateOpen(true); };

  const handleCreate = async () => {
    if (!selectedDate || !eventName.trim() || !eventDescription.trim()) {
      return toast({ title: "Validasi", description: "Nama event dan deskripsi wajib diisi", variant: "destructive" });
    }
    setSaving(true);
    try {
      const dateStr = toDateStr(selectedDate);
      await eventApi.create({
        eventName: eventName.trim(),
        description: eventDescription.trim(),
        eventDate: dateStr,
      });
      toast({ title: "Berhasil", description: `Event "${eventName.trim()}" dibuat` });
      setCreateOpen(false);
      setSelectedDate(undefined);
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal membuat event", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ev: Event) => {
    if (isPastDate(ev.date_event)) return;
    setEditingEvent(ev);
    setEditName(ev.event_name);
    setEditDescription(ev.description || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingEvent || !editName.trim() || !editDescription.trim()) {
      return toast({ title: "Validasi", description: "Nama event dan deskripsi wajib diisi", variant: "destructive" });
    }
    setSaving(true);
    try {
      await eventApi.update(editingEvent.id, { eventName: editName.trim(), description: editDescription.trim() });
      toast({ title: "Berhasil", description: "Event diperbarui" });
      setEditOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal memperbarui", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = items.find((e) => e.id === deleteId);
    if (target && isPastDate(target.date_event)) {
      setDeleteId(null);
      return;
    }
    try {
      await eventApi.delete(deleteId);
      toast({ title: "Berhasil", description: "Event dihapus" });
      setDeleteId(null);
      setSelectedDate(undefined);
      await load();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus event", variant: "destructive" });
    }
  };

  const getFilterRange = (opt: FilterOption): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (opt) {
      case "this_week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last_week": {
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      }
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month": {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        if (!customStart || !customEnd) return null;
        return { start: startOfDay(parseISO(customStart)), end: startOfDay(parseISO(customEnd)) };
      case "all_time":
      default:
        return null;
    }
  };

  const sortedItems = [...items]
    .filter((e) => e.date_event)
    .filter((e) => {
      const range = getFilterRange(filter);
      if (!range) return true;
      return isWithinInterval(startOfDay(parseISO(e.date_event!)), { start: range.start, end: range.end });
    })
    .sort((a, b) => new Date(a.date_event!).getTime() - new Date(b.date_event!).getTime());

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Event Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Pilih tanggal di kalender untuk membuat atau mengelola event.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* ── Calendar ── */}
        <Card>
          <CardContent className="p-5">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDayClick}
                month={month}
                onMonthChange={setMonth}
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 5}
                hideNavigation
                disabled={{ before: today }}
                classNames={calendarClassNames}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{
                  hasEvent: "!bg-green-500 !text-white rounded-full font-semibold hover:!bg-green-600",
                }}
                components={{
                  MonthCaption: ({ calendarMonth }) => (
                    <div className="flex items-center justify-center gap-2 h-9 mb-1">
                      <button
                        type="button"
                        onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium min-w-[110px] text-center">
                        {format(calendarMonth.date, "MMMM yyyy", { locale: idLocale })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ),
                }}
              />
            )}

            <div className="mt-4 space-y-2">
              {selectedDate ? (
                selectedHasEvent ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{format(selectedDate, "d MMMM yyyy", { locale: idLocale })}</strong>
                      {" "}— sudah ada event. Lihat detail di panel kanan.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>
                        Dipilih:{" "}
                        <strong>{format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}</strong>
                      </span>
                    </div>
                    <Button className="w-full gap-2" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Buat Event pada Tanggal Ini
                    </Button>
                  </>
                )
              ) : (
                <p className="text-center text-xs text-muted-foreground py-1">
                  Klik tanggal di kalender untuk memilih
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          {selectedDate && selectedHasEvent && selectedEvent && (
            <Card className={selectedEvent && isPastDate(selectedEvent.date_event) ? "border-gray-300 bg-gray-50" : "border-green-300"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${isPastDate(selectedEvent.date_event) ? "text-gray-400" : "text-green-600"}`} />
                  Event Terpilih
                  {isPastDate(selectedEvent.date_event) && (
                    <Badge variant="secondary" className="ml-auto text-xs">Sudah lewat</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className={`text-lg font-semibold ${isPastDate(selectedEvent.date_event) ? "text-muted-foreground" : ""}`}>{selectedEvent.event_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(parseISO(selectedEvent.date_event!), "EEEE, d MMMM yyyy", { locale: idLocale })}
                  </p>
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedEvent.description}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline" size="sm" className="gap-1"
                    onClick={() => openEdit(selectedEvent)}
                    disabled={isPastDate(selectedEvent.date_event)}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(selectedEvent.id)}
                    disabled={isPastDate(selectedEvent.date_event)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3 space-y-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Semua Event
                <Badge variant="secondary" className="ml-auto">{sortedItems.length}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Filter tanggal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {filter === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">s/d</span>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : sortedItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada event pada rentang ini.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {sortedItems.map((ev) => {
                    const isSelected = selectedDate && ev.date_event && isSameDay(parseISO(ev.date_event), selectedDate);
                    const isPast = isPastDate(ev.date_event);
                    return (
                      <li
                        key={ev.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                          isPast ? "bg-gray-50 opacity-60" : "cursor-pointer hover:bg-muted/50"
                        } ${isSelected && !isPast ? "border-green-400 bg-green-50" : ""}`}
                        onClick={() => !isPast && ev.date_event && handleDayClick(parseISO(ev.date_event))}
                      >
                        <div>
                          <p className="text-sm font-medium">{ev.event_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ev.date_event
                              ? format(parseISO(ev.date_event), "EEEE, d MMMM yyyy", { locale: idLocale })
                              : "—"}
                            {isPast && <span className="ml-1.5 text-[10px] uppercase tracking-wide">(sudah lewat)</span>}
                          </p>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                            disabled={isPast}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id); }}
                            disabled={isPast}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Create Event Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Event Baru</DialogTitle></DialogHeader>
          {selectedDate && (
            <p className="text-sm text-muted-foreground -mt-1">
              Tanggal: <strong>{format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}</strong>
            </p>
          )}
          <div className="space-y-3 pt-1">
            <div>
              <Label htmlFor="event-name">Nama Event *</Label>
              <Input
                id="event-name"
                placeholder="Contoh: Bible Study, Ibadah Minggu..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="event-description">Deskripsi *</Label>
              <Textarea
                id="event-description"
                placeholder="Deskripsi singkat mengenai event ini..."
                rows={3}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Event Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editingEvent?.date_event && (
            <p className="text-sm text-muted-foreground -mt-1">
              Tanggal: <strong>{format(parseISO(editingEvent.date_event), "EEEE, d MMMM yyyy", { locale: idLocale })}</strong>
            </p>
          )}
          <div className="space-y-3 pt-1">
            <div>
              <Label htmlFor="edit-name">Nama Event *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Deskripsi *</Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Event akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}