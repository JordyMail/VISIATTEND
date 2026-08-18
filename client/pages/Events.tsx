// client/pages/Events.tsx
import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import {
  Pencil, Trash2, Loader2, CalendarDays, Plus, ArrowLeft,
  Clock, Users, Save, ChevronLeft, ChevronRight, CheckCircle2, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { eventApi, regularEventApi, userApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import {
  format, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Event {
  id: number;
  event_code: string;
  event_name: string;
  description?: string;
  date_event?: string;
  start_time: string;
  end_time: string;
  participant_access: string;
  event_type: string;
  selectedMemberIds?: string[];
  created_at: string;
}

type ViewMode = "main" | "day-manage";
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
  weekday: "text-muted-foreground w-9 h-9 flex items-center justify-center font-normal text-[0.8rem]",
  week: "flex w-full",
  day: "relative w-9 h-9 flex items-center justify-center p-0 text-sm",
  day_button: "w-9 h-9 rounded-full font-normal hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  selected: "!bg-blue-500 !text-white rounded-full hover:!bg-blue-600 font-semibold",
  today: "bg-accent text-accent-foreground rounded-full font-bold",
  outside: "text-muted-foreground opacity-40",
  disabled: "!bg-muted/40 !text-muted-foreground/40 opacity-40 cursor-not-allowed pointer-events-none hover:!bg-transparent shadow-none",
  hidden: "invisible",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Events() {
  // ── Data State ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Event[]>([]);
  const [regularEvents, setRegularEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Navigation State ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());

  // ── Manage Events Form State ────────────────────────────────────────────────
  const [dialogEvents, setDialogEvents] = useState<any[]>([]);
  const [deleteConfirmUid, setDeleteConfirmUid] = useState<string | null>(null);
  const [memberSearchMap, setMemberSearchMap] = useState<Record<string, string>>({});

  // ── Filter State ────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<FilterOption>("all_time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => { load(); }, []);

  // ── Data Loading ─────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const eventsRes = await eventApi.getAll();
      setItems(eventsRes.data.data ?? []);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data event", variant: "destructive" });
    }
    try {
      const regularRes = await regularEventApi.getAll();
      setRegularEvents(regularRes.data.data ?? []);
    } catch { /* silently fail */ }
    setLoading(false);
  };

  const loadMembers = async () => {
    if (members.length > 0) return;
    setMembersLoading(true);
    try {
      const res = await userApi.getAll({ role: "user" });
      setMembers((res.data.data || []).filter((m: any) => m.member_id && m.is_active));
    } catch { /* silently fail */ }
    finally { setMembersLoading(false); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const today = startOfDay(new Date());

  const eventDates: Date[] = items
    .filter((e) => !!e.date_event)
    .map((e) => parseLocalDate(e.date_event!));

  const getEventsForDate = (d: Date): Event[] =>
    items
      .filter((e) => e.date_event && isSameDay(parseLocalDate(e.date_event), d))
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  // ── Group events by date for "Semua Event" list ─────────────────────────────
  interface GroupedDateItem {
    dateStr: string;
    dateObj: Date;
    eventsCount: number;
    isPast: boolean;
  }

  const getFilterRange = (opt: FilterOption): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (opt) {
      case "this_week": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last_week": { const lw = subWeeks(now, 1); return { start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) }; }
      case "this_month": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month": { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
      case "this_year": return { start: startOfYear(now), end: endOfYear(now) };
      case "custom": return (!customStart || !customEnd) ? null : { start: startOfDay(parseISO(customStart)), end: startOfDay(parseISO(customEnd)) };
      default: return null;
    }
  };

  const groupedDates: GroupedDateItem[] = (() => {
    const map = new Map<string, { dateObj: Date; count: number }>();

    for (const ev of items) {
      if (!ev.date_event) continue;
      const dObj = parseLocalDate(ev.date_event);
      const dStr = toDateStr(dObj);

      const range = getFilterRange(filter);
      if (range && !isWithinInterval(startOfDay(dObj), { start: range.start, end: range.end })) {
        continue;
      }

      if (!map.has(dStr)) {
        map.set(dStr, { dateObj: dObj, count: 0 });
      }
      map.get(dStr)!.count += 1;
    }

    const list: GroupedDateItem[] = Array.from(map.entries()).map(([dStr, val]) => ({
      dateStr: dStr,
      dateObj: val.dateObj,
      eventsCount: val.count,
      isPast: startOfDay(val.dateObj) < today
    }));

    // Sort dates ascending
    list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return list;
  })();

  // ── Open Manage View for a Date ─────────────────────────────────────────────
  const openManageViewForDate = async (d: Date) => {
    if (startOfDay(d) < today) {
      toast({ title: "Perhatian", description: "Tanggal ini sudah lewat dan tidak dapat diubah.", variant: "destructive" });
      return;
    }
    setSelectedDate(d);
    setSaving(true);
    loadMembers();

    try {
      const todayEvents = getEventsForDate(d);
      const loadedEvents: any[] = [];

      for (const ev of todayEvents) {
        const res = await eventApi.getById(ev.id);
        const data = res.data.data;
        loadedEvents.push({
          uid: `existing-${data.id}`,
          id: data.id,
          eventCode: data.event_code,
          eventType: data.event_type || "custom",
          eventName: data.event_name,
          description: data.description || "",
          startTime: data.start_time || "08:00",
          endTime: data.end_time || "10:00",
          participantAccess: data.participant_access || "Everyone",
          selectedMemberIds: data.selectedMemberIds || []
        });
      }

      if (loadedEvents.length === 0) {
        loadedEvents.push(makeEmptyEvent());
      }

      loadedEvents.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      setDialogEvents(loadedEvents);
      setViewMode("day-manage");
    } catch (err) {
      console.error("openManageViewForDate error:", err);
      toast({ title: "Error", description: "Gagal memuat detail event", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    if (day < today) return; // Block selecting past dates
    setSelectedDate((prev) => (prev && isSameDay(prev, day) ? undefined : day));
  };

  const goBackToMain = () => {
    setViewMode("main");
  };

  // ── Event Form Helpers ────────────────────────────────────────────────────────
  const makeEmptyEvent = () => ({
    uid: `${Date.now()}-${Math.random()}`,
    eventType: "custom",
    eventName: "",
    description: "",
    startTime: "08:00",
    endTime: "10:00",
    participantAccess: "Everyone",
    selectedMemberIds: [] as string[]
  });

  const addEvent = () => {
    if (dialogEvents.length >= 4) return;
    setDialogEvents((prev) => [...prev, makeEmptyEvent()]);
  };

  const removeEvent = (uid: string) => {
    setDialogEvents((prev) => prev.filter((ev) => ev.uid !== uid));
    setDeleteConfirmUid(null);
  };

  const updateEventField = (uid: string, field: string, value: any) => {
    setDialogEvents((prev) =>
      prev.map((ev) => (ev.uid === uid ? { ...ev, [field]: value } : ev))
    );
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    for (let i = 0; i < dialogEvents.length; i++) {
      const ev = dialogEvents[i];
      if (!ev.eventName?.trim())
        return toast({ title: "Validasi", description: `Nama Event ${i + 1} wajib diisi`, variant: "destructive" });
      if (!ev.startTime || !ev.endTime)
        return toast({ title: "Validasi", description: `Event "${ev.eventName}" wajib memiliki Waktu Mulai dan Selesai`, variant: "destructive" });
      if (ev.startTime >= ev.endTime)
        return toast({ title: "Validasi", description: `Event "${ev.eventName}": Waktu Mulai harus lebih awal dari Selesai`, variant: "destructive" });
    }

    const sorted = [...dialogEvents].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime)
        return toast({
          title: "Waktu Bertabrakan",
          description: `"${sorted[i].eventName}" (${sorted[i].startTime}–${sorted[i].endTime}) bertabrakan dengan "${sorted[i + 1].eventName}" (${sorted[i + 1].startTime}–${sorted[i + 1].endTime})`,
          variant: "destructive"
        });
    }

    setSaving(true);
    try {
      await eventApi.create({ eventDate: toDateStr(selectedDate), events: dialogEvents });
      toast({ title: "Berhasil", description: "Jadwal event berhasil disimpan" });
      await load();
      setViewMode("main");
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: MANAGE EVENT VIEW (Day-specific view)
  // ════════════════════════════════════════════════════════════════════════════
  if (viewMode === "day-manage" && selectedDate) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={goBackToMain} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">Manage Event</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Jadwal
          </Button>
        </div>

        {/* Event Forms */}
        <div className="space-y-5">
          {dialogEvents.map((ev, index) => (
            <Card key={ev.uid} className="overflow-hidden border shadow-sm">
              {/* Card Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b">
                <span className="text-sm font-bold text-primary">Event {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirmUid(ev.uid)}
                  title={`Hapus Event ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Card Form Body */}
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Jenis Event</Label>
                    <Select
                      value={ev.eventType}
                      onValueChange={(val) => {
                        updateEventField(ev.uid, "eventType", val);
                        updateEventField(ev.uid, "eventName", "");
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih jenis event" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular Event</SelectItem>
                        <SelectItem value="custom">Custom Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    {ev.eventType === "regular" ? (
                      <>
                        <Label>Pilih Regular Event *</Label>
                        <Select
                          value={ev.eventName}
                          onValueChange={(val) => updateEventField(ev.uid, "eventName", val)}
                        >
                          <SelectTrigger><SelectValue placeholder="Pilih event" /></SelectTrigger>
                          <SelectContent>
                            {regularEvents.map((re) => (
                              <SelectItem key={re.id} value={re.event_name}>
                                {re.event_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Label htmlFor={`evt-name-${ev.uid}`}>Nama Event Custom *</Label>
                        <Input
                          id={`evt-name-${ev.uid}`}
                          placeholder="Contoh: Ibadah Pemuda, Rapat Panitia..."
                          value={ev.eventName}
                          onChange={(e) => updateEventField(ev.uid, "eventName", e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`st-${ev.uid}`}>Waktu Mulai *</Label>
                    <Input
                      id={`st-${ev.uid}`}
                      type="time"
                      value={ev.startTime}
                      onChange={(e) => updateEventField(ev.uid, "startTime", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`et-${ev.uid}`}>Waktu Selesai *</Label>
                    <Input
                      id={`et-${ev.uid}`}
                      type="time"
                      value={ev.endTime}
                      onChange={(e) => updateEventField(ev.uid, "endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`desc-${ev.uid}`}>Deskripsi / Tema</Label>
                  <Textarea
                    id={`desc-${ev.uid}`}
                    placeholder="Tema khotbah atau deskripsi singkat..."
                    rows={2}
                    value={ev.description}
                    onChange={(e) => updateEventField(ev.uid, "description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Participant Access Control</Label>
                  <Select
                    value={ev.participantAccess}
                    onValueChange={(val) => {
                      updateEventField(ev.uid, "participantAccess", val);
                      if (val === "Everyone") updateEventField(ev.uid, "selectedMemberIds", []);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih akses peserta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Everyone">Everyone (Semua Anggota)</SelectItem>
                      <SelectItem value="Selected Members">Selected Members (Hanya Anggota Terpilih)</SelectItem>
                      <SelectItem value="Excluded Members">Excluded Members (Semua Kecuali Anggota Dikecualikan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(ev.participantAccess === "Selected Members" || ev.participantAccess === "Excluded Members") && (
                  <div className="border rounded-lg p-3 bg-background space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {ev.participantAccess === "Selected Members"
                          ? "Pilih anggota yang DIPERBOLEHKAN hadir:"
                          : "Pilih anggota yang TIDAK DIPERBOLEHKAN hadir:"}
                      </Label>
                      <div className="flex items-center gap-1.5 text-xs self-end sm:self-auto">
                        <Badge variant="secondary" className="text-[10px] h-5 font-normal px-2">
                          {ev.selectedMemberIds?.length || 0} dipilih
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const searchQuery = (memberSearchMap[ev.uid] || "").toLowerCase().trim();
                            const filtered = members.filter((m) => {
                              if (!searchQuery) return true;
                              return (
                                (m.full_name && m.full_name.toLowerCase().includes(searchQuery)) ||
                                (m.member_id && m.member_id.toLowerCase().includes(searchQuery))
                              );
                            });
                            const allFilteredIds = filtered.map((m) => m.member_id);
                            const cur = new Set(ev.selectedMemberIds || []);
                            allFilteredIds.forEach((id) => cur.add(id));
                            updateEventField(ev.uid, "selectedMemberIds", Array.from(cur));
                          }}
                        >
                          Pilih Semua
                        </Button>
                        <span className="text-muted-foreground/40 text-[10px]">|</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const searchQuery = (memberSearchMap[ev.uid] || "").toLowerCase().trim();
                            if (!searchQuery) {
                              updateEventField(ev.uid, "selectedMemberIds", []);
                            } else {
                              const filteredIds = new Set(
                                members
                                  .filter((m) =>
                                    (m.full_name && m.full_name.toLowerCase().includes(searchQuery)) ||
                                    (m.member_id && m.member_id.toLowerCase().includes(searchQuery))
                                  )
                                  .map((m) => m.member_id)
                              );
                              const cur = (ev.selectedMemberIds || []).filter((id: string) => !filteredIds.has(id));
                              updateEventField(ev.uid, "selectedMemberIds", cur);
                            }
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Cari nama atau ID anggota..."
                        value={memberSearchMap[ev.uid] || ""}
                        onChange={(e) =>
                          setMemberSearchMap((prev) => ({ ...prev, [ev.uid]: e.target.value }))
                        }
                        className="pl-8 h-8 text-xs bg-muted/20"
                      />
                    </div>

                    {/* Member Checkbox List */}
                    <div className="h-36 overflow-y-auto border rounded-md p-2 bg-muted/10">
                      <div className="space-y-2">
                        {membersLoading ? (
                          <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground text-xs">
                            <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar anggota...
                          </div>
                        ) : members.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Tidak ada anggota aktif.</p>
                        ) : (() => {
                          const searchQuery = (memberSearchMap[ev.uid] || "").toLowerCase().trim();
                          const filteredMembers = members.filter((m) => {
                            if (!searchQuery) return true;
                            return (
                              (m.full_name && m.full_name.toLowerCase().includes(searchQuery)) ||
                              (m.member_id && m.member_id.toLowerCase().includes(searchQuery))
                            );
                          });

                          if (filteredMembers.length === 0) {
                            return (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                Tidak ada anggota yang cocok dengan "{memberSearchMap[ev.uid]}".
                              </p>
                            );
                          }

                          return filteredMembers.map((m) => {
                            const isChecked = ev.selectedMemberIds?.includes(m.member_id);
                            return (
                              <div key={m.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`m-${ev.uid}-${m.member_id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const cur = ev.selectedMemberIds || [];
                                    updateEventField(
                                      ev.uid,
                                      "selectedMemberIds",
                                      checked
                                        ? [...cur, m.member_id]
                                        : cur.filter((id: string) => id !== m.member_id)
                                    );
                                  }}
                                />
                                <Label
                                  htmlFor={`m-${ev.uid}-${m.member_id}`}
                                  className="text-sm font-normal cursor-pointer select-none"
                                >
                                  {m.full_name} ({m.member_id})
                                  {m.division ? ` — ${m.division}` : ""}
                                </Label>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* + Add Event Button */}
          {dialogEvents.length < 4 ? (
            <Button
              type="button"
              variant="outline"
              onClick={addEvent}
              className="w-full py-6 gap-2 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary/50"
            >
              <Plus className="h-5 w-5" /> + Add Event
              <span className="text-xs opacity-60">({dialogEvents.length}/4)</span>
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-2 italic">
              Maksimal 4 event per hari tercapai.
            </p>
          )}
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={goBackToMain}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Jadwal
          </Button>
        </div>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!deleteConfirmUid} onOpenChange={(o) => !o && setDeleteConfirmUid(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Event Ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Event ini akan dihapus dari daftar tanggal ini. Perubahan akan disimpan ketika Anda menekan tombol "Simpan Jadwal".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmUid && removeEvent(deleteConfirmUid)}
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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Event Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Pilih tanggal di kalender atau daftar di bawah untuk mengelola event (maksimal 4 event per hari).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* ── Calendar Card ── */}
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
                disabled={{ before: today }}
                month={month}
                onMonthChange={setMonth}
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 5}
                hideNavigation
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

            {/* ── Selected Date Info Strip ── */}
            <div className="mt-4 flex flex-col items-center gap-2.5">
              {selectedDate ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3.5 py-1.5 text-xs text-blue-700 shadow-xs max-w-full">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span className="truncate">
                      <strong>{format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}</strong>
                      {" | "}{getEventsForDate(selectedDate).length} Event Terjadwal
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 px-4 rounded-lg shadow-xs"
                    onClick={() => openManageViewForDate(selectedDate)}
                    disabled={saving}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Manage Event | {format(selectedDate, "d MMM yyyy", { locale: idLocale })}
                  </Button>
                </>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-1">
                  Klik tanggal di kalender untuk memilih
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── All Events Card (Grouped by Date) ── */}
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Semua Event
              <Badge variant="secondary" className="ml-auto">{groupedDates.length} Tanggal</Badge>
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
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 text-sm" />
                  <span className="text-xs text-muted-foreground shrink-0">s/d</span>
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 text-sm" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : groupedDates.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Tidak ada event pada rentang ini.
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {groupedDates.map((item) => {
                  return (
                    <li
                      key={item.dateStr}
                      className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors
                        ${item.isPast ? "opacity-40 bg-muted/20 cursor-not-allowed" : "hover:bg-accent/60 cursor-pointer hover:border-primary/40"}
                      `}
                      onClick={() => {
                        if (!item.isPast) {
                          openManageViewForDate(item.dateObj);
                        }
                      }}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">
                          {format(item.dateObj, "EEEE, d MMMM yyyy", { locale: idLocale })}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${item.isPast ? "text-muted-foreground" : "text-green-600"}`} />
                          {item.eventsCount} Event Terjadwal
                          {item.isPast && <span className="ml-1 text-[10px] uppercase font-bold text-muted-foreground">(Sudah Lewat)</span>}
                        </p>
                      </div>
                      {!item.isPast && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1 hover:bg-primary/10 hover:text-primary">
                          Manage Event
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}