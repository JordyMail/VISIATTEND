// client/pages/user/Schedules.tsx
import { useState, useEffect } from "react";
import { CalendarDays, MapPin, Clock, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { scheduleApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Schedule {
  id: number; event_id: number; event_name: string; event_code: string; event_type: string;
  scheduled_date: string; start_time: string; end_time?: string; location?: string; notes?: string;
}
interface Event { id: number; event_code: string; event_name: string; }

const EVENT_TYPE_COLOR: Record<string, string> = {
  worship:    "bg-blue-100 text-blue-700 border-blue-200",
  meeting:    "bg-green-100 text-green-700 border-green-200",
  study:      "bg-purple-100 text-purple-700 border-purple-200",
  fellowship: "bg-orange-100 text-orange-700 border-orange-200",
  outreach:   "bg-red-100 text-red-700 border-red-200",
};
const EVENT_TYPE_LABEL: Record<string, string> = {
  worship: "Ibadah", meeting: "Meeting", study: "Bible Study",
  fellowship: "Persekutuan", outreach: "Pelayanan",
};

export default function UserSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents]       = useState<Event[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [filterEvent, setFilterEvent]  = useState("all");

  useEffect(() => {
    eventApi.getAll({ isActive: true }).then((r) => setEvents(r.data.data)).catch(() => {});
    loadSchedules();
  }, []);

  const loadSchedules = async (upcoming = true, evId = "all") => {
    setLoading(true);
    try {
      const r = await scheduleApi.getAll({
        upcoming,
        eventId: evId !== "all" ? parseInt(evId) : undefined,
      });
      setSchedules(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat jadwal", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleFilter = () => {
    setShowUpcoming(showUpcoming);
    loadSchedules(showUpcoming, filterEvent);
  };

  // Group by month
  const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
    const key = new Date(s.scheduled_date).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  const isToday = (d: string) => d === new Date().toISOString().split("T")[0];
  const isPast  = (d: string) => new Date(d) < new Date(new Date().toISOString().split("T")[0]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jadwal Kegiatan</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Lihat jadwal ibadah dan kegiatan organisasi</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              <Button size="sm"
                variant={showUpcoming ? "default" : "outline"}
                onClick={() => { setShowUpcoming(true); loadSchedules(true, filterEvent); }}>
                Mendatang
              </Button>
              <Button size="sm"
                variant={!showUpcoming ? "default" : "outline"}
                onClick={() => { setShowUpcoming(false); loadSchedules(false, filterEvent); }}>
                Semua
              </Button>
            </div>
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Event</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.event_code} – {e.event_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleFilter} className="gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Tidak ada jadwal ditemukan</p>
          </CardContent>
        </Card>
      ) : Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{month}</h2>
          <div className="space-y-3">
            {items.map((s) => (
              <Card key={s.id} className={`transition-all ${isToday(s.scheduled_date) ? "border-primary shadow-md" : isPast(s.scheduled_date) ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex gap-4">
                      {/* Date block */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white
                        ${isToday(s.scheduled_date) ? "bg-primary" : isPast(s.scheduled_date) ? "bg-gray-400" : "bg-gray-700"}`}>
                        <span className="text-xs font-medium">
                          {new Date(s.scheduled_date).toLocaleDateString("id-ID", { month: "short" }).toUpperCase()}
                        </span>
                        <span className="text-xl font-bold leading-tight">
                          {new Date(s.scheduled_date).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{s.event_name}</p>
                          {isToday(s.scheduled_date) && (
                            <Badge className="bg-primary text-white text-xs">Hari Ini</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{s.start_time}{s.end_time ? ` – ${s.end_time}` : ""}</span>
                        </div>
                        {s.location && (
                          <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{s.location}</span>
                          </div>
                        )}
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{s.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`self-start flex-shrink-0 ${EVENT_TYPE_COLOR[s.event_type]}`}>
                      {EVENT_TYPE_LABEL[s.event_type] || s.event_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}