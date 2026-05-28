// client/pages/user/CheckIn.tsx
import { useState, useEffect } from "react";
import { CheckCircle2, QrCode, Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { attendanceApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Event { id: number; event_code: string; event_name: string; event_type: string; }

export default function UserCheckin() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [mode, setMode]       = useState<"button" | "qr">("button");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ status: string; message: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

  useEffect(() => {
    eventApi.getAll({ isActive: true }).then((r) => setEvents(r.data.data)).catch(() => {});
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const r = await attendanceApi.getMy({ startDate: today, endDate: today });
      setTodayAttendance(r.data.data);
    } catch { /* ignore */ }
  };

  const handleCheckin = async () => {
    if (mode === "button" && !eventId)
      return toast({ title: "Pilih event terlebih dahulu", variant: "destructive" });
    if (mode === "qr" && !qrToken.trim())
      return toast({ title: "Masukkan kode QR", variant: "destructive" });

    setLoading(true);
    setSuccess(null);
    try {
      const payload = mode === "qr"
        ? { qrToken: qrToken.trim() }
        : { eventId: parseInt(eventId) };
      const r = await attendanceApi.checkIn(payload);
      const { status, message } = r.data;
      setSuccess({ status, message });
      toast({ title: "Check-in berhasil!", description: message });
      setQrToken("");
      setEventId("");
      loadTodayAttendance();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Check-in gagal";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const STATUS_BADGE: Record<string, string> = {
    present: "bg-green-100 text-green-700 border-green-200",
    late:    "bg-yellow-100 text-yellow-700 border-yellow-200",
    absent:  "bg-red-100 text-red-700 border-red-200",
    excused: "bg-blue-100 text-blue-700 border-blue-200",
    sick:    "bg-orange-100 text-orange-700 border-orange-200",
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check In</h1>
        <p className="text-muted-foreground mt-1">Catat kehadiran kamu hari ini</p>
      </div>

      {/* Success */}
      {success && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Check-in berhasil!</p>
              <p className="text-sm text-green-700">{success.message}</p>
              <Badge className={`mt-1 text-xs ${STATUS_BADGE[success.status]}`}>
                {success.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Metode Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "button" ? "default" : "outline"}
              onClick={() => setMode("button")}
              className="gap-2"
            >
              <Calendar className="w-4 h-4" />
              Pilih Event
            </Button>
            <Button
              variant={mode === "qr" ? "default" : "outline"}
              onClick={() => setMode("qr")}
              className="gap-2"
            >
              <QrCode className="w-4 h-4" />
              Kode QR
            </Button>
          </div>

          {mode === "button" && (
            <div className="space-y-2">
              <Label>Pilih Event</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih event hari ini..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.event_code} — {e.event_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "qr" && (
            <div className="space-y-2">
              <Label>Kode QR / Token</Label>
              <Input
                placeholder="Masukkan kode QR dari admin..."
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
              />
              <p className="text-xs text-muted-foreground">
                Minta kode QR kepada admin atau scan QR yang tersedia di lokasi.
              </p>
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleCheckin}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Check In Sekarang</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Today's attendance */}
      {todayAttendance.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kehadiran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{a.event_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE[a.status]}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}