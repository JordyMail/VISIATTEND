// client/pages/Events.tsx
import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import {
  Pencil, Trash2, Loader2, CalendarDays, Plus, ArrowLeft,
  Clock, Users, Save, ChevronLeft, ChevronRight, CheckCircle2, Search,
  Lock, Unlock, HelpCircle, RefreshCw, X,
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
import { eventApi, regularEventApi, userApi, eventQuestionApi } from "@/services/api";
import { generateWordSearch, serializeGrid, deserializeGrid } from "@/lib/wordSearch";
import { toast } from "@/components/ui/use-toast";
import {
  format, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n";

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
  is_locked?: boolean;
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
const createEventSchema = (t: (key: import("@/lib/i18n").TranslationKey) => string) => z.object({
  eventName: z.string({ required_error: t("eventNameRequired") }),
});
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  // Pure "YYYY-MM-DD" strings → parse directly as local (avoids UTC midnight shift on date-only ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Full ISO timestamps (e.g. "2026-08-17T17:00:00.000Z" from mssql useUTC:false) → use local methods
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Events() {
  const { language, t } = useLanguage();
  const dateLocale = language === "en" ? undefined : idLocale;
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
  // ── Lock State ─────────────────────────────────────────────────────────────
  // maps event_schedule.id -> is_locked (populated when opening manage view)
  const [lockedMap, setLockedMap] = useState<Record<number, boolean>>({});
  const [lockingId, setLockingId] = useState<number | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  // ── Question Form State ────────────────────────────────────────────────────
  // questions[eventUid] = list of {uid, id?, clue, answer, puzzleGrid?, generating}
  const [questionsMap, setQuestionsMap] = useState<Record<string, any[]>>({});
  const [deletedQuestionsMap, setDeletedQuestionsMap] = useState<Record<string, number[]>>({});
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
      toast({ title: t("error"), description: `${t("error")}: ${t("events")}`, variant: "destructive" });
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
      toast({ title: t("validation"), description: t("error"), variant: "destructive" });
      return;
    }
    setSelectedDate(d);
    setSaving(true);
    loadMembers();

    try {
      const todayEvents = getEventsForDate(d);
      const loadedEvents: any[] = [];
      const newLockedMap: Record<number, boolean> = {};
      const newQuestionsMap: Record<string, any[]> = {};

      for (const ev of todayEvents) {
        const res = await eventApi.getById(ev.id);
        const data = res.data.data;
        const uid = `existing-${data.id}`;
        loadedEvents.push({
          uid,
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
        newLockedMap[data.id] = !!data.is_locked;
        // Load existing questions for this event
        try {
          const qRes = await eventQuestionApi.getByEvent(data.id);
          const qs = Array.isArray(qRes.data.data) ? qRes.data.data : [];
          newQuestionsMap[uid] = qs.map((q: any) => ({
            uid: `q-${q.id}`,
            id: q.id,
            clue: q.question_text || q.title || "",
            answer: q.correct_answer || "",
            puzzleGrid: q.puzzle_grid ? deserializeGrid(q.puzzle_grid) : null,
            generating: false,
          }));
        } catch {
          newQuestionsMap[uid] = [];
        }
      }

      if (loadedEvents.length === 0) {
        loadedEvents.push(makeEmptyEvent());
      }

      loadedEvents.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      setLockedMap(newLockedMap);
      setQuestionsMap(newQuestionsMap);
      setDeletedQuestionsMap({});
      setDialogEvents(loadedEvents);
      setViewMode("day-manage");
    } catch (err) {
      console.error("openManageViewForDate error:", err);
      toast({ title: t("error"), description: `${t("error")}: ${t("events")}`, variant: "destructive" });
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

  // ── Lock Helpers ─────────────────────────────────────────────────────────────
  // true only when every existing (saved) event on this date is locked
  const isManageDateLocked = dialogEvents.filter(ev => ev.id).length > 0
    && dialogEvents.filter(ev => ev.id).every(ev => !!lockedMap[ev.id]);

  const handleToggleLock = async (eventId: number) => {
    setLockingId(eventId);
    try {
      const res = await eventApi.toggleLock(eventId);
      const newLocked: boolean = res.data.is_locked;
      setLockedMap(prev => ({ ...prev, [eventId]: newLocked }));
      toast({ title: newLocked ? t("inactive") : t("activeEvent"), description: newLocked ? t("inactive") : t("activeEvent") });
    } catch {
      toast({ title: t("error"), description: t("error"), variant: "destructive" });
    } finally {
      setLockingId(null);
    }
  };

  const handleToggleDateLock = async () => {
    const eventIds = dialogEvents.filter(ev => ev.id).map(ev => ev.id as number);
    if (eventIds.length === 0) return;
    const shouldLock = !isManageDateLocked;
    setSaving(true);
    try {
      for (const id of eventIds) {
        if (!!lockedMap[id] !== shouldLock) {
          await eventApi.toggleLock(id);
          setLockedMap(prev => ({ ...prev, [id]: shouldLock }));
        }
      }
      // Reload items to update main view lock state
      const eventsRes = await eventApi.getAll();
      setItems(eventsRes.data.data ?? []);
      toast({ title: shouldLock ? t("inactive") : t("activeEvent"), description: shouldLock ? t("inactive") : t("activeEvent") });
    } catch {
      toast({ title: t("error"), description: t("error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Question Helpers ──────────────────────────────────────────────────────────
  const getEventQuestions = (uid: string) => questionsMap[uid] ?? [];

  const addQuestionToEvent = (uid: string) => {
    const qs = getEventQuestions(uid);
    if (qs.length >= 3) return;
    const newQ = { uid: `newq-${Date.now()}`, id: undefined, clue: "", answer: "", puzzleGrid: null, generating: false };
    setQuestionsMap(prev => ({ ...prev, [uid]: [...qs, newQ] }));
  };

  const removeQuestionFromEvent = (eventUid: string, questionUid: string, questionId?: number) => {
    setQuestionsMap(prev => ({
      ...prev,
      [eventUid]: (prev[eventUid] ?? []).filter(q => q.uid !== questionUid),
    }));
    if (questionId) {
      setDeletedQuestionsMap(prev => ({
        ...prev,
        [eventUid]: [...(prev[eventUid] ?? []), questionId],
      }));
    }
  };

  const updateQuestion = (eventUid: string, questionUid: string, field: string, value: any) => {
    setQuestionsMap(prev => ({
      ...prev,
      [eventUid]: (prev[eventUid] ?? []).map(q =>
        q.uid === questionUid ? { ...q, [field]: value } : q
      ),
    }));
  };

  const handleGeneratePuzzle = (eventUid: string, questionUid: string) => {
    const qs = getEventQuestions(eventUid);
    const q = qs.find(q => q.uid === questionUid);
    if (!q || !q.answer.trim()) {
      toast({ title: t("validation"), description: `${t("questions")} ${t("required").toLowerCase()}`, variant: "destructive" });
      return;
    }
    updateQuestion(eventUid, questionUid, "generating", true);
    const result = generateWordSearch(q.answer.trim());
    updateQuestion(eventUid, questionUid, "generating", false);
    updateQuestion(eventUid, questionUid, "puzzleGrid", result);
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    for (let i = 0; i < dialogEvents.length; i++) {
      const ev = dialogEvents[i];
      if (!ev.eventName?.trim())
        return toast({ title: t("validation"), description: `${t("eventNameRequired")} (${i + 1})`, variant: "destructive" });
      if (!ev.startTime || !ev.endTime)
        return toast({ title: t("validation"), description: `${ev.eventName}: ${t("eventTimeRequired")}`, variant: "destructive" });
      if (ev.startTime >= ev.endTime)
        return toast({ title: t("validation"), description: `${ev.eventName}: ${t("eventTimeOrder")}`, variant: "destructive" });
    }

    const sorted = [...dialogEvents].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime)
        return toast({
          title: t("timeConflict"),
          description: `"${sorted[i].eventName}" (${sorted[i].startTime}–${sorted[i].endTime}) bertabrakan dengan "${sorted[i + 1].eventName}" (${sorted[i + 1].startTime}–${sorted[i + 1].endTime})`,
          variant: "destructive"
        });
    }

    setSaving(true);
    try {
      // Batch includes only filled events: those with IDs + those with a name
      const eventsToSend = dialogEvents.filter(ev => ev.id || ev.eventName?.trim());
      await eventApi.create({ eventDate: toDateStr(selectedDate), events: eventsToSend });

      // After saving, fetch events for this date to get IDs (including newly created)
      const allEventsRes = await eventApi.getAll();
      const allEvents: Event[] = allEventsRes.data.data ?? [];
      const dateStr = toDateStr(selectedDate);
      const savedForDate = allEvents.filter(
        e => e.date_event && toDateStr(parseLocalDate(e.date_event)) === dateStr
      );

      // Save questions for each event
      for (const ev of eventsToSend) {
        let eventId: number | undefined = ev.id;
        if (!eventId) {
          const match = savedForDate.find(
            s => s.event_name === ev.eventName.trim() && s.start_time === ev.startTime
          );
          if (match) eventId = match.id;
        }
        if (!eventId) continue;
        await saveQuestionsForEvent(ev.uid, eventId);
      }

      toast({ title: t("success"), description: t("saveChanges") });
      await load();
      setViewMode("main");
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || t("error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Save questions for a single event — throws on first error ─────────────
  const saveQuestionsForEvent = async (evUid: string, eventId: number) => {
    const qs = questionsMap[evUid] ?? [];
    const delIds = deletedQuestionsMap[evUid] ?? [];
    for (const qid of delIds) {
      try { await eventQuestionApi.delete(eventId, qid); } catch { /* deletion failure is non-fatal */ }
    }
    for (const q of qs) {
      if (!q.clue.trim() || !q.answer.trim()) continue;
      const puzzleGrid = q.puzzleGrid ? serializeGrid(q.puzzleGrid) : null;
      if (q.id) {
        await eventQuestionApi.update(eventId, q.id, { clue: q.clue, answer: q.answer, puzzleGrid: puzzleGrid ?? undefined });
      } else {
        await eventQuestionApi.create(eventId, { clue: q.clue, answer: q.answer, puzzleGrid: puzzleGrid ?? undefined });
      }
    }
    setDeletedQuestionsMap(prev => { const n = { ...prev }; delete n[evUid]; return n; });
  };

  const handleSaveOne = async (targetEv: any) => {
    if (!selectedDate) return;
    const i = dialogEvents.findIndex(ev => ev.uid === targetEv.uid);

    // Validate target event
    if (!targetEv.eventName?.trim())
      return toast({ title: t("validation"), description: `${t("eventNameRequired")} (${i + 1})`, variant: "destructive" });
    if (!targetEv.startTime || !targetEv.endTime)
      return toast({ title: t("validation"), description: t("eventTimeRequired"), variant: "destructive" });
    if (targetEv.startTime >= targetEv.endTime)
      return toast({ title: t("validation"), description: t("eventTimeOrder"), variant: "destructive" });

    // Check time overlap with other events
    for (const other of dialogEvents) {
      if (other.uid === targetEv.uid || !other.eventName?.trim()) continue;
      if (targetEv.endTime > other.startTime && targetEv.startTime < other.endTime)
        return toast({
          title: t("timeConflict"),
          description: `"${targetEv.eventName}" bertabrakan dengan "${other.eventName}"`,
          variant: "destructive",
        });
    }

    setSavingUid(targetEv.uid);
    try {
      // Build safe batch: all events that already have IDs + this target event
      const othersSaved = dialogEvents.filter(ev => ev.uid !== targetEv.uid && ev.id);
      const batch = [...othersSaved, targetEv];
      await eventApi.create({ eventDate: toDateStr(selectedDate), events: batch });

      // Get the saved event ID (needed for new events)
      let eventId: number | undefined = targetEv.id;
      if (!eventId) {
        const allEventsRes = await eventApi.getAll();
        const allEvents: Event[] = allEventsRes.data.data ?? [];
        const dateStr = toDateStr(selectedDate);
        const savedForDate = allEvents.filter(
          e => e.date_event && toDateStr(parseLocalDate(e.date_event)) === dateStr
        );
        const match = savedForDate.find(
          s => s.event_name === targetEv.eventName.trim() && s.start_time === targetEv.startTime
        );
        if (match) {
          eventId = match.id;
          // Update dialogEvents with the new ID so subsequent saves work
          setDialogEvents(prev => prev.map(ev =>
            ev.uid === targetEv.uid ? { ...ev, id: match.id, uid: `existing-${match.id}` } : ev
          ));
        }
      }

      if (eventId) await saveQuestionsForEvent(targetEv.uid, eventId);

      // Reload items list (for lock state etc.) without leaving the page
      const eventsRes = await eventApi.getAll();
      setItems(eventsRes.data.data ?? []);

      toast({ title: t("success"), description: `${t("saveEvent")} ${i + 1}` });
    } catch (e: any) {
      toast({ title: t("error"), description: e.response?.data?.message || `${t("announcementSaveFailed")} ${i + 1}`, variant: "destructive" });
    } finally {
      setSavingUid(null);
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
              <ArrowLeft className="h-4 w-4" /> {t("back")}
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("manageEvent")}</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale })}
              </p>
            </div>
          </div>
        </div>

        {/* Event Forms */}
        <div className="space-y-5">
          {dialogEvents.map((ev, index) => {
            const isEvLocked = ev.id ? !!lockedMap[ev.id] : false;
            return (
            <Card key={ev.uid} className={`overflow-hidden border shadow-sm transition-opacity ${isEvLocked ? "opacity-60" : ""}`}>
              {/* Card Header */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${isEvLocked ? "bg-amber-50/60" : "bg-muted/40"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{t("event")} {index + 1}</span>
                  {isEvLocked && <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-0.5"><Lock className="h-3 w-3" /> {t("eventLocked")}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${isEvLocked ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                    onClick={() => ev.id && handleToggleLock(ev.id)}
                    disabled={!ev.id || lockingId === ev.id}
                    title={!ev.id ? t("saveEvent") : isEvLocked ? t("unlockEvent") : t("lockEvent")}
                  >
                    {lockingId === ev.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : isEvLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 font-semibold"
                    onClick={() => handleSaveOne(ev)}
                    disabled={isEvLocked || savingUid === ev.uid || saving}
                    title={`${t("saveEvent")} ${index + 1}`}
                  >
                    {savingUid === ev.uid
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />}
                    {t("saveEvent")} {index + 1}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmUid(ev.uid)}
                    disabled={isEvLocked}
                    title={`${t("deleteEvent")} ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card Form Body */}
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("eventType")}</Label>
                    <Select
                      value={ev.eventType}
                      disabled={isEvLocked}
                      onValueChange={(val) => {
                        updateEventField(ev.uid, "eventType", val);
                        updateEventField(ev.uid, "eventName", "");
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder={t("selectEventType")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">{t("regularEvent")}</SelectItem>
                        <SelectItem value="custom">{t("customEvent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    {ev.eventType === "regular" ? (
                      <>
                        <Label>{t("selectRegularEvent")} *</Label>
                        <Select
                          value={ev.eventName}
                          disabled={isEvLocked}
                          onValueChange={(val) => updateEventField(ev.uid, "eventName", val)}
                        >
                          <SelectTrigger><SelectValue placeholder={t("event")} /></SelectTrigger>
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
                        <Label htmlFor={`evt-name-${ev.uid}`}>{t("customEventName")} *</Label>
                        <Input
                          id={`evt-name-${ev.uid}`}
                          placeholder={t("customEventName")}
                          value={ev.eventName}
                          disabled={isEvLocked}
                          onChange={(e) => updateEventField(ev.uid, "eventName", e.target.value)}
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`st-${ev.uid}`}>{t("startTime")} *</Label>
                    <Input
                      id={`st-${ev.uid}`}
                      type="time"
                      value={ev.startTime}
                      disabled={isEvLocked}
                      onChange={(e) => updateEventField(ev.uid, "startTime", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`et-${ev.uid}`}>{t("endTime")} *</Label>
                    <Input
                      id={`et-${ev.uid}`}
                      type="time"
                      value={ev.endTime}
                      disabled={isEvLocked}
                      onChange={(e) => updateEventField(ev.uid, "endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`desc-${ev.uid}`}>{t("themeDescription")}</Label>
                  <Textarea
                    id={`desc-${ev.uid}`}
                    placeholder={t("description")}
                    rows={2}
                    value={ev.description}
                    disabled={isEvLocked}
                    onChange={(e) => updateEventField(ev.uid, "description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("participantAccess")}</Label>
                  <Select
                    value={ev.participantAccess}
                    disabled={isEvLocked}
                    onValueChange={(val) => {
                      updateEventField(ev.uid, "participantAccess", val);
                      if (val === "Everyone") updateEventField(ev.uid, "selectedMemberIds", []);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder={t("selectParticipantAccess")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Everyone">{t("everyoneMembers")}</SelectItem>
                      <SelectItem value="Selected Members">{t("selectedMembers")}</SelectItem>
                      <SelectItem value="Excluded Members">{t("excludedMembers")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(ev.participantAccess === "Selected Members" || ev.participantAccess === "Excluded Members") && (
                  <div className="border rounded-lg p-3 bg-background space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {ev.participantAccess === "Selected Members"
                          ? `${t("selectAll")}: ${t("present")}`
                          : `${t("selectAll")}: ${t("absent")}`}
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
                          {t("selectAll")}
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
                          {t("clear")}
                        </Button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={t("memberSearch")}
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
                            <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingMembers")}
                          </div>
                        ) : members.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">{t("noActiveMembers")}</p>
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
                                {t("noMatchingMembers")}: "{memberSearchMap[ev.uid]}".
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

                {/* ── Question Game Section (only for Everyone access) ──────────────── */}
                {ev.participantAccess === "Everyone" && (
                  <div className="border rounded-lg p-4 space-y-3 bg-violet-50/40 border-violet-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-violet-600" />
                        <span className="text-sm font-semibold text-violet-700">{t("questionGameOptional")}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-2">
                          {getEventQuestions(ev.uid).length}/3
                        </Badge>
                      </div>
                      {getEventQuestions(ev.uid).length < 3 && !isEvLocked && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-violet-700 border-violet-300 hover:bg-violet-50 h-8 text-xs"
                          onClick={() => addQuestionToEvent(ev.uid)}
                        >
                          <Plus className="h-3.5 w-3.5" /> {t("addQuestion")}
                        </Button>
                      )}
                      {getEventQuestions(ev.uid).length >= 3 && (
                        <span className="text-[11px] text-muted-foreground italic">{t("maxQuestions")}</span>
                      )}
                    </div>

                    {getEventQuestions(ev.uid).length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">
                        {t("noQuestions")}
                      </p>
                    )}

                    {getEventQuestions(ev.uid).map((q, qIdx) => (
                      <div key={q.uid} className="border rounded-md p-3 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-violet-600">{t("questionNumber")} {qIdx + 1}</span>
                          {!isEvLocked && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeQuestionFromEvent(ev.uid, q.uid, q.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs">{t("clue")} *</Label>
                            <Input
                              placeholder={t("clue")}
                              value={q.clue}
                              disabled={isEvLocked}
                              onChange={(e) => updateQuestion(ev.uid, q.uid, "clue", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("answer")} * ({t("uppercaseHint")})</Label>
                            <Input
                              placeholder={t("answer")}
                              value={q.answer}
                              disabled={isEvLocked}
                              onChange={(e) => updateQuestion(ev.uid, q.uid, "answer", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                              className="h-8 text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8 text-xs"
                            disabled={isEvLocked || !q.answer.trim()}
                            onClick={() => handleGeneratePuzzle(ev.uid, q.uid)}
                          >
                            {q.generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            {q.puzzleGrid ? t("regeneratePuzzle") : t("generatePuzzle")}
                          </Button>
                          {q.puzzleGrid && (
                            <span className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t("puzzleReady")} ({q.puzzleGrid.size}×{q.puzzleGrid.size})
                            </span>
                          )}
                        </div>
                        {/* Puzzle Preview */}
                        {q.puzzleGrid && (
                          <div className="overflow-auto">
                            <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${q.puzzleGrid.size}, 1.4rem)` }}>
                              {q.puzzleGrid.grid.map((row: string[], rIdx: number) =>
                                row.map((cell: string, cIdx: number) => (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    className="w-5 h-5 flex items-center justify-center text-[11px] font-mono border border-slate-200 bg-slate-50"
                                  >
                                    {cell}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}

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
              {t("maxEventsReached")}
            </p>
          )}
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={goBackToMain}>{t("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Semua Jadwal
          </Button>
        </div>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!deleteConfirmUid} onOpenChange={(o) => !o && setDeleteConfirmUid(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteEvent")}?</AlertDialogTitle>
              <AlertDialogDescription>
                {t("cannotUndo")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmUid && removeEvent(deleteConfirmUid)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {t("delete")}
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
        <h1 className="text-2xl font-bold">{t("eventManagement")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t("clickCalendarToSelect")} ({t("maxEventsReached")})
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
                        {format(calendarMonth.date, "MMMM yyyy", { locale: dateLocale })}
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
                      <strong>{format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale })}</strong>
                      {" | "}{getEventsForDate(selectedDate).length} {t("eventCount")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 px-4 rounded-lg shadow-xs"
                    onClick={() => openManageViewForDate(selectedDate)}
                    disabled={saving}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("manageEventShort")} | {format(selectedDate, "d MMM yyyy", { locale: dateLocale })}
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
              {t("allEvents")}
              <Badge variant="secondary" className="ml-auto">{groupedDates.length} {t("dateCount")}</Badge>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder={t("filterByDate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">{t("allTime")}</SelectItem>
                  <SelectItem value="this_week">{t("thisWeek")}</SelectItem>
                  <SelectItem value="last_week">{t("lastWeek")}</SelectItem>
                  <SelectItem value="this_month">{t("thisMonth")}</SelectItem>
                  <SelectItem value="last_month">{t("lastMonth")}</SelectItem>
                  <SelectItem value="this_year">{t("thisYear")}</SelectItem>
                  <SelectItem value="custom">{t("customRange")}</SelectItem>
                </SelectContent>
              </Select>
              {filter === "custom" && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 text-sm" />
                          <span className="text-xs text-muted-foreground shrink-0">{t("until")}</span>
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
                {t("noEventsInRange")}
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {groupedDates.map((item) => {
                  return (
                    <li
                      key={item.dateStr}
                      className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors
                        ${item.isPast
                          ? "opacity-50 bg-muted/20 cursor-not-allowed"
                          : "hover:bg-accent/60 cursor-pointer hover:border-primary/40"}
                      `}
                      onClick={() => {
                        if (!item.isPast) {
                          openManageViewForDate(item.dateObj);
                        }
                      }}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">
                          {format(item.dateObj, "EEEE, d MMMM yyyy", { locale: dateLocale })}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${item.isPast ? "text-muted-foreground" : "text-green-600"}`} />
                          {item.eventsCount} {t("eventCount")}
                          {item.isPast && <span className="ml-1 text-[10px] uppercase font-bold text-muted-foreground">{t("pastLabel")}</span>}
                        </p>
                      </div>
                      {!item.isPast && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1 hover:bg-primary/10 hover:text-primary">
                          {t("manageEventShort")}
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