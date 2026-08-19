// client/pages/admin/QRManager.tsx
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react"; // IMPORT QR CODE
import { QrCode, Plus, Copy, CheckCircle, Clock, Loader2, RefreshCw, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { qrApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface QRToken {
  id: number; event_id: number; token: string;
  valid_date: string; expires_at: string; created_at: string;
}
interface Event {
  id: number;
  event_code: string;
  event_name: string;
  date_event?: string;
}

export default function QRManager() {
  const [events, setEvents]     = useState<Event[]>([]);
  const [tokens, setTokens]     = useState<QRToken[]>([]);
  const [loading, setLoading]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [viewQRDialog, setViewQRDialog]   = useState(false);
  const [selectedQR, setSelectedQR]       = useState<QRToken | null>(null);
  const [copiedId, setCopiedId]           = useState<number | null>(null);
  const [newToken, setNewToken]           = useState<any>(null);
  const [form, setForm] = useState({ eventId: "", validDate: "", expiryMinutes: "60" });

  useEffect(() => {
    eventApi
      .getAll({ isActive: true })
      .then((r) => {
        const visibleEvents = (r.data.data || []).filter((event: Event) => {
          if (!event.date_event) return true;
          const eventDate = new Date(`${event.date_event}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });
        setEvents(visibleEvents);
      })
      .catch(() => {});
  }, []);

  const loadTokens = async (evId: string) => {
    if (!evId) return;
    setLoading(true);
    try {
      const r = await qrApi.getByEvent(parseInt(evId));
      setTokens(r.data.data);
    } catch { 
      toast({ title: "Error", description: "Gagal memuat QR token", variant: "destructive" }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleEventChange = (v: string) => {
    setSelectedEvent(v);
    loadTokens(v);
  };

  const handleGenerate = async () => {
    if (!form.eventId)
      return toast({ title: "Validasi", description: "Pilih event terlebih dahulu", variant: "destructive" });
    setGenerating(true);
    try {
      const r = await qrApi.generate({
        eventId:       parseInt(form.eventId),
        validDate:     form.validDate || undefined,
        expiryMinutes: parseInt(form.expiryMinutes) || 60,
      });
      setNewToken(r.data.data);
      toast({ title: "QR berhasil dibuat!", description: "Bagikan token kepada anggota" });
      if (selectedEvent === form.eventId) loadTokens(form.eventId);
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal membuat QR", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const copyToken = (token: string, id: number) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast({ title: "Disalin!", description: "Token telah disalin ke clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadQR = (token: string) => {
    const svg = document.getElementById(`qr-${token.substring(0, 8)}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_Absensi_${new Date().toISOString().split('T')[0]}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast({ title: "Berhasil!", description: "QR Code telah didownload" });
  };

  const viewQR = (token: QRToken) => {
    setSelectedQR(token);
    setViewQRDialog(true);
  };

  const isExpired = (d: string) => new Date(d) < new Date();
  const formatDateTime = (d: string) => new Date(d).toLocaleString("id-ID");
  const timeRemaining = (d: string) => {
    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return "Kadaluarsa";
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}j ${m % 60}m lagi`;
    return `${m}m lagi`;
  };

  const selectedEventName = events.find(e => e.id.toString() === selectedEvent)?.event_name || "";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="w-6 h-6" /> QR Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Generate dan kelola QR token untuk absensi
          </p>
        </div>
        <Button 
          onClick={() => { 
            setForm({ 
              eventId: selectedEvent, 
              validDate: new Date().toISOString().split("T")[0], 
              expiryMinutes: "60" 
            }); 
            setNewToken(null); 
            setDialogOpen(true); 
          }} 
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Generate QR
        </Button>
      </div>

      {/* Token list filter */}
      <Card className="p-4">
        <div className="flex gap-3 items-center">
          <Select value={selectedEvent} onValueChange={handleEventChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pilih event untuk lihat token..." />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.event_code} – {e.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEvent && (
            <Button variant="outline" size="icon" onClick={() => loadTokens(selectedEvent)}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Tokens list */}
      {selectedEvent && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Token QR Tersedia</span>
              <span className="text-sm font-normal text-muted-foreground">
                {selectedEventName}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <QrCode className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-sm">Belum ada token untuk event ini</p>
              </div>
            ) : (
              <div className="divide-y">
                {tokens.map((t) => {
                  const expired = isExpired(t.expires_at);
                  return (
                    <div key={t.id} className={`flex items-center gap-4 px-5 py-4 ${expired ? "opacity-50" : ""}`}>
                      {/* QR Code Preview */}
                      {!expired && (
                        <div className="w-12 h-12 bg-white rounded-lg border p-1 flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
                             onClick={() => viewQR(t)}>
                          <QRCodeSVG 
                            value={t.token} 
                            size={40} 
                            level="L"
                          />
                        </div>
                      )}
                      {expired && (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
                          <Clock className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium truncate">{t.token.slice(0, 20)}...</p>
                        <p className="text-xs text-muted-foreground">
                          Valid: {new Date(t.valid_date).toLocaleDateString("id-ID")} · {expired ? "Kadaluarsa" : timeRemaining(t.expires_at)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={expired ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}>
                          {expired ? "Kadaluarsa" : "Aktif"}
                        </Badge>
                        {!expired && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" 
                              onClick={() => viewQR(t)} title="Lihat QR">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" 
                              onClick={() => copyToken(t.token, t.id)} title="Salin Token">
                              {copiedId === t.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View QR Dialog */}
      <Dialog open={viewQRDialog} onOpenChange={setViewQRDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>QR Code Absensi</DialogTitle>
            <DialogDescription>
              Scan QR ini untuk check-in di event: <strong>{selectedEventName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {selectedQR && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border-2 border-dashed border-primary flex justify-center">
                <QRCodeSVG 
                  id={`qr-${selectedQR.token.substring(0, 8)}`}
                  value={selectedQR.token} 
                  size={250} 
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                  {selectedQR.token}
                </p>
                <p className="text-xs text-muted-foreground">
                  Berlaku hingga: {formatDateTime(selectedQR.expires_at)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => copyToken(selectedQR.token, selectedQR.id)}>
                  <Copy className="w-4 h-4" /> Salin Token
                </Button>
                <Button variant="outline" className="flex-1 gap-2" 
                  onClick={() => downloadQR(selectedQR.token)}>
                  <Download className="w-4 h-4" /> Download QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate QR Token</DialogTitle>
            <DialogDescription>Buat token QR baru untuk absensi anggota</DialogDescription>
          </DialogHeader>

          {newToken ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-800 mb-3">QR Token Berhasil Dibuat!</p>
                
                {/* Tampilkan QR Code */}
                <div className="bg-white p-4 rounded-lg mb-3 flex justify-center">
                  <QRCodeSVG 
                    value={newToken.token} 
                    size={200} 
                    level="H"
                  />
                </div>
                
                <div className="bg-white rounded-lg p-3 font-mono text-sm break-all border">
                  {newToken.token}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Berlaku hingga: {formatDateTime(newToken.expiresAt)}
                </p>
              </div>
              <Button className="w-full gap-2" onClick={() => { 
                navigator.clipboard.writeText(newToken.token); 
                toast({ title: "Disalin!" }); 
              }}>
                <Copy className="w-4 h-4" /> Salin Token
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setNewToken(null)}>
                Generate Lagi
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">Event *</Label>
                  <Select value={form.eventId} onValueChange={(v) => setForm({ ...form, eventId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih event" /></SelectTrigger>
                    <SelectContent>
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          {e.event_code} – {e.event_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Tanggal Berlaku</Label>
                  <Input type="date" value={form.validDate} 
                    onChange={(e) => setForm({ ...form, validDate: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Kosongkan untuk hari ini</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Durasi Berlaku (menit)</Label>
                  <Select value={form.expiryMinutes} onValueChange={(v) => setForm({ ...form, expiryMinutes: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 menit</SelectItem>
                      <SelectItem value="60">1 jam</SelectItem>
                      <SelectItem value="120">2 jam</SelectItem>
                      <SelectItem value="180">3 jam</SelectItem>
                      <SelectItem value="360">6 jam</SelectItem>
                      <SelectItem value="1440">1 hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  Generate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}