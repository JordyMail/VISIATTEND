// client/pages/superadmin/AuditLogs.tsx
import { useState, useEffect, useCallback } from "react";
import { Activity, Search, RefreshCw, Download, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { settingsApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface ActivityLog {
  id: number; action: string; entity_type?: string; entity_id?: number;
  description?: string; ip_address?: string; created_at: string; user_name?: string;
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN:                "bg-green-100 text-green-700",
  LOGOUT:               "bg-gray-100 text-gray-600",
  CREATE_USER:          "bg-blue-100 text-blue-700",
  UPDATE_USER:          "bg-yellow-100 text-yellow-700",
  DELETE_USER:          "bg-red-100 text-red-700",
  TOGGLE_USER_STATUS:   "bg-orange-100 text-orange-700",
  RESET_PASSWORD:       "bg-pink-100 text-pink-700",
  CREATE_EVENT:         "bg-cyan-100 text-cyan-700",
  UPDATE_EVENT:         "bg-sky-100 text-sky-700",
  DELETE_EVENT:         "bg-rose-100 text-rose-700",
  MANUAL_ATTENDANCE:    "bg-purple-100 text-purple-700",
  UPDATE_ATTENDANCE:    "bg-violet-100 text-violet-700",
  DELETE_ATTENDANCE:    "bg-red-100 text-red-600",
  GENERATE_REPORT:      "bg-indigo-100 text-indigo-700",
  UPDATE_SETTINGS:      "bg-amber-100 text-amber-700",
  CREATE_ANNOUNCEMENT:  "bg-teal-100 text-teal-700",
  ENROLL_USER:          "bg-lime-100 text-lime-700",
};

const PAGE_SIZE = 50;

export default function AuditLogs() {
  const [logs, setLogs]       = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const load = useCallback(async (off = 0, replace = true) => {
    setLoading(true);
    try {
      const r = await settingsApi.getActivityLogs(PAGE_SIZE, off);
      const data: ActivityLog[] = r.data.data;
      if (replace) setLogs(data);
      else         setLogs((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(off + data.length);
    } catch { toast({ title: "Error", description: "Gagal memuat audit log", variant: "destructive" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(0); }, []);

  const handleLoadMore = () => load(offset, false);

  const exportCSV = () => {
    const headers = ["Waktu","User","Aksi","Entity","Deskripsi","IP"];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString("id-ID"),
      l.user_name || "System",
      l.action,
      `${l.entity_type || "-"}${l.entity_id ? `#${l.entity_id}` : ""}`,
      `"${(l.description || "-").replace(/"/g,'""')}"`,
      l.ip_address || "-",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Client-side filter
  const filtered = logs.filter((l) => {
    const matchAction = filterAction === "all" || l.action === filterAction;
    const matchSearch = !search || [l.user_name, l.action, l.description, l.entity_type]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    return matchAction && matchSearch;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Histori seluruh aktivitas sistem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(0)} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari user, aksi, deskripsi..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              {uniqueActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Menampilkan {filtered.length} dari {logs.length} log dimuat
        </p>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{l.user_name || "System"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ACTION_COLOR[l.action] || "bg-gray-100 text-gray-600"}`}>
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.entity_type || "-"}{l.entity_id ? ` #${l.entity_id}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {l.description || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {l.ip_address || "-"}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      Tidak ada log ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {hasMore && !loading && (
          <div className="p-4 text-center border-t">
            <Button variant="outline" onClick={handleLoadMore} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Muat Lebih Banyak
            </Button>
          </div>
        )}
        {loading && logs.length > 0 && (
          <div className="p-4 text-center border-t">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto" />
          </div>
        )}
      </Card>
    </div>
  );
}