// client/pages/user/CheckIn.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, QrCode, Loader2, Calendar, CalendarDays, Scan, Camera, StopCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { attendanceApi, eventApi, attendanceScheduleApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Event { id: number; event_code: string; event_name: string; event_type: string; }

export default function UserCheckin() {
  const navigate = useNavigate();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean | null>(null);
  const [events, setEvents]   = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [mode, setMode]       = useState<"button" | "qr" | "scan">("button");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ status: string; message: string } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    attendanceScheduleApi.checkToday()
      .then((r) => setIsAttendanceOpen(r.data.isOpen))
      .catch(() => setIsAttendanceOpen(false));
    eventApi.getAll({ isActive: true }).then((r) => setEvents(r.data.data)).catch(() => {});
    loadTodayAttendance();
    
    return () => {
      // Cleanup scanner on unmount
      stopScanning();
    };
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const r = await attendanceApi.getMy({ startDate: today, endDate: today });
      setTodayAttendance(r.data.data);
    } catch { /* ignore */ }
  };

  const startScanning = async () => {
    setScanning(true);
    
    try {
      // Dynamic import html5-qrcode
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" }, // Kamera belakang
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // QR Code berhasil di-scan
          console.log('QR Scanned:', decodedText);
          setQrToken(decodedText);
          stopScanning();
          
          // Auto check-in dengan token yang di-scan
          toast({ title: "QR Terdeteksi!", description: "Memproses check-in..." });
          handleCheckin(decodedText);
        },
        (errorMessage: string) => {
          // Scanning error (biasanya karena belum ada QR di frame)
          // Tidak perlu toast, biarkan user menyesuaikan posisi
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      toast({ 
        title: "Error", 
        description: "Gagal mengakses kamera. Pastikan kamera diizinkan.", 
        variant: "destructive" 
      });
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
    setScanning(false);
  };

  const handleCheckin = async (token?: string) => {
    const useToken = token || qrToken;
    
    if (mode === "button" && !eventId)
      return toast({ title: "Pilih event terlebih dahulu", variant: "destructive" });
    if ((mode === "qr" || mode === "scan") && !useToken?.trim())
      return toast({ title: "Masukkan kode QR atau scan terlebih dahulu", variant: "destructive" });

    setLoading(true);
    setSuccess(null);
    try {
      const payload = (mode === "qr" || mode === "scan")
        ? { qrToken: useToken!.trim() }
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

  const STATUS_LABEL: Record<string, string> = {
    present: "Hadir",
    late: "Terlambat",
    absent: "Absen",
    excused: "Izin",
    sick: "Sakit",
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">

      {/* ── Attendance Closed Overlay ───────────────────────────────── */}
      {isAttendanceOpen === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <CalendarDays className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Attendance Belum Dibuka</h2>
            <p className="mt-2 text-sm text-gray-500">
              Attendance hari ini belum dijadwalkan oleh admin. Silakan coba lagi pada tanggal yang telah ditentukan.
            </p>
            <button
              onClick={() => navigate("/user/dashboard")}
              className="mt-6 w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              ← Back Home
            </button>
          </div>
        </div>
      )}

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
                {STATUS_LABEL[success.status] || success.status}
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
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={mode === "button" ? "default" : "outline"}
              onClick={() => { setMode("button"); stopScanning(); }}
              className="gap-2"
              size="sm"
            >
              <Calendar className="w-4 h-4" />
              Pilih
            </Button>
            <Button
              variant={mode === "qr" ? "default" : "outline"}
              onClick={() => { setMode("qr"); stopScanning(); }}
              className="gap-2"
              size="sm"
            >
              <QrCode className="w-4 h-4" />
              Token
            </Button>
            <Button
              variant={mode === "scan" ? "default" : "outline"}
              onClick={() => { setMode("scan"); }}
              className="gap-2"
              size="sm"
            >
              <Scan className="w-4 h-4" />
              Scan
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
                Minta kode QR kepada admin atau salin token dari QR Code.
              </p>
            </div>
          )}

          {mode === "scan" && (
            <div className="space-y-2">
              <Label>Scan QR Code</Label>
              
              {/* QR Scanner Area */}
              {!scanning ? (
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/30">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Arahkan kamera ke QR Code yang disediakan admin
                  </p>
                  <Button onClick={startScanning} className="gap-2">
                    <Scan className="w-4 h-4" /> Mulai Scan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div id="qr-reader" ref={scannerDivRef} className="rounded-xl overflow-hidden border-2 border-primary" />
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={stopScanning}
                  >
                    <StopCircle className="w-4 h-4" /> Berhenti Scan
                  </Button>
                </div>
              )}
            </div>
          )}

          {mode !== "scan" && (
            <Button
              className="w-full gap-2"
              onClick={() => handleCheckin()}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Check In Sekarang</>
              )}
            </Button>
          )}
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
                    {new Date(a.check_in_time).toLocaleTimeString("id-ID", { 
                      hour: "2-digit", minute: "2-digit" 
                    })}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE[a.status]}>
                  {STATUS_LABEL[a.status] || a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}