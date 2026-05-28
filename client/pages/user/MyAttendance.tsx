// client/pages/user/MyAttendance.tsx
import { useState, useEffect } from "react";
import { Download, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { attendanceApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface AttendanceRecord {
  id: number;
  event_name: string;
  event_code: string;
  event_type: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  device_info?: string;
  notes?: string;
}

interface Event { id: number; event_code: string; event_name: string; }

const STATUS_STYLE: Record<string, string> = {
  present: "bg-green-100 text-green-700 border-green-200",
  late:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  absent:  "bg-red-100 text-red-700 border-red-200",
  excused: "bg-blue-100 text-blue-700 border-blue-200",
  sick:    "bg-orange-100 text-orange-700 border-orange-200",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Hadir", late: "Terlambat", absent: "Absen", excused: "Izin", sick: "Sakit",
};

export default function UserMyAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterEvent,  setFilterEvent]  = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStart,  setFilterStart]  = useState("");
  const [filterEnd,    setFilterEnd]    = useState("");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    eventApi.getAll({ isActive: true }).then((r) => setEvents(r.data.data)).catch(() => {});
    loadAttendance();
  }, []);

  const loadAttendance = async (params?: any) => {
    setLoading(true);
    try {
      const r = await attendanceApi.getMy({
        eventId:   params?.eventId   || (filterEvent  !== "all" ? parseInt(filterEvent)  : undefined),
        status:    params?.status    || (filterStatus !== "all" ? filterStatus            : undefined),
        startDate: params?.startDate || filterStart || undefined,
        endDate:   params?.endDate   || filterEnd   || undefined,
      });
      setRecords(r.data.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data kehadiran", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleFilter = () => loadAttendance({
    eventId:   filterEvent  !== "all" ? parseInt(filterEvent)  : undefined,
    status:    filterStatus !== "all" ? filterStatus            : undefined,
    startDate: filterStart || undefined,
    endDate:   filterEnd   || undefined,
  });

  const handleReset = () => {
    setFilterEvent("all"); setFilterStatus("all");
    setFilterStart(""); setFilterEnd(""); setSearch("");
    attendanceApi.getMy({}).then((r) => setRecords(r.data.data)).catch(() => {});
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    return r.event_name.toLowerCase().includes(search.toLowerCase()) ||
           r.event_code.toLowerCase().includes(search.toLowerCase());
  });

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Tanggal","Event","Status","Check In","Check Out","Keterangan"];
    const rows = filtered.map((r) => [
      new Date(r.attendance_date).toLocaleDateString("id-ID"),
      `${r.event_code} - ${r.event_name}`,
      STATUS_LABEL[r.status] || r.status,
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "-",
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "-",
      r.notes || "-",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `riwayat_kehadiran_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });

  // Summary
  const present  = records.filter((r) => r.status === "present").length;
  const late     = records.filter((r) => r.status === "late").length;
  const absent   = records.filter((r) => r.status === "absent").length;
  const excused  = records.filter((r) => ["excused","sick"].includes(r.status)).length;
  const pct      = records.length ? (((present + late) / records.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Kehadiran</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Data kehadiran pribadi kamu</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total",      value: records.length, color: "text-foreground" },
          { label: "Hadir",      value: present,        color: "text-green-600" },
          { label: "Terlambat",  value: late,           color: "text-yellow-600" },
          { label: "Absen",      value: absent,         color: "text-red-600" },
          { label: "Izin/Sakit", value: excused,        color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari event..." value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterEvent} onValueChange={setFilterEvent}>
              <SelectTrigger><SelectValue placeholder="Semua event" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Event</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.event_code} – {e.event_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="present">Hadir</SelectItem>
                <SelectItem value="late">Terlambat</SelectItem>
                <SelectItem value="absent">Absen</SelectItem>
                <SelectItem value="excused">Izin</SelectItem>
                <SelectItem value="sick">Sakit</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            <Input type="date" value={filterEnd}   onChange={(e) => setFilterEnd(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleFilter} className="gap-2"><Filter className="w-4 h-4" /> Filter</Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead>Keluar</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{formatDate(r.attendance_date)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.event_name}</p>
                        <p className="text-xs text-muted-foreground">{r.event_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLE[r.status]}>
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.check_in_time ? formatTime(r.check_in_time) : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.check_out_time ? formatTime(r.check_out_time) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.notes || "-"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      Tidak ada data kehadiran
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Menampilkan {filtered.length} dari {records.length} data · Tingkat kehadiran: <strong>{pct}%</strong>
      </p>
    </div>
  );
}