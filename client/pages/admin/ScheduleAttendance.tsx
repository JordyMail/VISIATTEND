// client/pages/admin/ScheduleAttendance.tsx
import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, Trash2, Info, CalendarCheck, Plus } from "lucide-react";
import { attendanceScheduleApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { format, parseISO, isToday, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const calendarClassNames = {
  months: "flex flex-col",
  month_caption: "flex justify-center items-center h-9 relative mb-1",
  caption_label: "text-sm font-medium",
  nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1 h-9",
  button_previous:
    "h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background opacity-50 hover:opacity-100 transition-opacity",
  button_next:
    "h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background opacity-50 hover:opacity-100 transition-opacity",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "text-muted-foreground w-9 h-9 flex items-center justify-center font-normal text-[0.8rem]",
  week: "flex w-full",
  day: "relative w-9 h-9 flex items-center justify-center p-0 text-sm",
  day_button:
    "w-9 h-9 rounded-full font-normal hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  selected: "!bg-green-500 !text-white rounded-full hover:!bg-green-600 font-semibold",
  today: "bg-accent text-accent-foreground rounded-full font-bold",
  outside: "text-muted-foreground opacity-40",
  disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
  hidden: "invisible",
};

export default function ScheduleAttendance() {
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await attendanceScheduleApi.getAll();
      const dates: Date[] = (r.data.data as string[]).map((d) => parseISO(d));
      setScheduledDates(dates);
    } catch {
      toast({ title: "Error", description: "Gagal memuat jadwal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const isScheduled = (d: Date) => scheduledDates.some((s) => isSameDay(s, d));

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    // If already scheduled, deselect pending (can only remove from list)
    if (isScheduled(day)) {
      setPendingDate(undefined);
      return;
    }
    // Toggle pending selection
    setPendingDate((prev) => (prev && isSameDay(prev, day) ? undefined : day));
  };

  const handleSavePending = async () => {
    if (!pendingDate || saving) return;
    setSaving(true);
    try {
      await attendanceScheduleApi.addDate(toDateStr(pendingDate));
      setScheduledDates((prev) => [...prev, pendingDate]);
      toast({
        title: "Tanggal ditambahkan",
        description: `${format(pendingDate, "d MMMM yyyy", { locale: id })} berhasil dijadwalkan`,
      });
      setPendingDate(undefined);
    } catch {
      toast({ title: "Error", description: "Gagal menyimpan jadwal", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddToday = () => {
    const today = new Date();
    if (isScheduled(today)) {
      toast({ description: "Hari ini sudah terjadwal" });
      return;
    }
    setPendingDate(today);
    setMonth(today);
  };

  const handleRemove = async (d: Date) => {
    if (saving) return;
    setSaving(true);
    try {
      await attendanceScheduleApi.removeDate(toDateStr(d));
      setScheduledDates((prev) => prev.filter((s) => !isSameDay(s, d)));
      toast({ title: "Berhasil", description: "Tanggal dihapus dari jadwal" });
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sortedDates = [...scheduledDates].sort((a, b) => a.getTime() - b.getTime());
  const todayScheduled = isScheduled(new Date());

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Schedule Attendance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pilih tanggal kapan attendance dibuka. User hanya bisa attendance pada tanggal yang dipilih.
          </p>
        </div>
        <Button
          onClick={handleAddToday}
          disabled={saving || todayScheduled}
          variant={todayScheduled ? "outline" : "default"}
          className="gap-2 shrink-0"
        >
          <CalendarCheck className="h-4 w-4" />
          {todayScheduled ? "Hari ini sudah aktif" : "Aktifkan Hari Ini"}
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Klik tanggal untuk memilih (hijau = dipilih), lalu klik{" "}
          <strong>"Tambahkan Tanggal"</strong> untuk menyimpan jadwal.
          Gunakan ikon 🗑 di daftar untuk menghapus.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <Card>
          <CardContent className="p-5">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DayPicker
                mode="single"
                selected={pendingDate}
                onSelect={handleDayClick}
                month={month}
                onMonthChange={setMonth}
                disabled={saving}
                classNames={calendarClassNames}
                modifiers={{ scheduled: scheduledDates }}
                modifiersClassNames={{
                  scheduled: "!bg-primary !text-primary-foreground rounded-full font-semibold hover:!bg-primary/90",
                }}
                components={{
                  Chevron: (props) =>
                    props.orientation === "left" ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    ),
                }}
              />
            )}

            {/* Pending selection + save button */}
            <div className="mt-4 space-y-2">
              {pendingDate ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      Dipilih:{" "}
                      <strong>{format(pendingDate, "EEEE, d MMMM yyyy", { locale: id })}</strong>
                    </span>
                  </div>
                  <Button
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSavePending}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {saving ? "Menyimpan..." : "Tambahkan Tanggal"}
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

        {/* Scheduled dates list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Tanggal Terjadwal
              <Badge variant="secondary" className="ml-auto">{scheduledDates.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedDates.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada jadwal attendance.
                <br />
                Klik tanggal di kalender lalu tekan{" "}
                <strong>"Tambahkan Tanggal"</strong>.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {sortedDates.map((d) => {
                  const todayItem = isToday(d);
                  return (
                    <li
                      key={toDateStr(d)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                        todayItem ? "border-green-300 bg-green-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {format(d, "EEEE, d MMMM yyyy", { locale: id })}
                        </span>
                        {todayItem && (
                          <Badge className="bg-green-500 text-white text-xs px-2">
                            Hari ini
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        onClick={() => handleRemove(d)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
