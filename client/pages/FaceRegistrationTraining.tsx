import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, Loader2, ScanFace, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { clearPendingRegistrationProfile, getPendingRegistrationProfile, setCurrentAttendanceUser } from "@/lib/attendanceFlow";
import { faceAiApi } from "@/services/api";

const REQUIRED_SAMPLES = 3;
const MAX_CAPTURE_WIDTH = 640;
const JPEG_QUALITY = 0.82;
const PREVIEW_CAPTURE_WIDTH = 320;
const PREVIEW_JPEG_QUALITY = 0.68;
const PREVIEW_INTERVAL_MS = 700;

type FaceDetection = {
  confidence: number;
  box: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

type FrameSize = {
  width: number;
  height: number;
};

const getOverlayStyle = (faceDetection: FaceDetection, frameSize: FrameSize) => ({
  left: `${(faceDetection.box.x / Math.max(frameSize.width, 1)) * 100}%`,
  top: `${(faceDetection.box.y / Math.max(frameSize.height, 1)) * 100}%`,
  width: `${(faceDetection.box.w / Math.max(frameSize.width, 1)) * 100}%`,
  height: `${(faceDetection.box.h / Math.max(frameSize.height, 1)) * 100}%`,
});

export default function FaceRegistrationTraining() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRequestRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sampleCount, setSampleCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Arahkan wajah ke kamera lalu ambil 3 sampel training.");
  const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 16, height: 9 });

  const profile = getPendingRegistrationProfile();

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (error) {
        setCameraError("Kamera tidak bisa diakses. Pastikan izin camera sudah diberikan.");
      }
    };

    setupCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const captureFrame = (maxWidth = MAX_CAPTURE_WIDTH, quality = JPEG_QUALITY) => {
    const video = videoRef.current;
    if (!video) {
      return null;
    }

    const canvas = document.createElement("canvas");
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const captureWidth = Math.min(sourceWidth, maxWidth);
    const captureHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * captureWidth));

    canvas.width = captureWidth;
    canvas.height = captureHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return {
      imageBase64: canvas.toDataURL("image/jpeg", quality),
      width: canvas.width,
      height: canvas.height,
    };
  };

  useEffect(() => {
    if (!cameraReady || cameraError || processing) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      if (previewRequestRef.current) {
        return;
      }

      const frame = captureFrame(PREVIEW_CAPTURE_WIDTH, PREVIEW_JPEG_QUALITY);
      if (!frame) {
        return;
      }

      previewRequestRef.current = true;
      setFrameSize({ width: frame.width, height: frame.height });

      try {
        const response = await faceAiApi.previewDetection({ imageBase64: frame.imageBase64 });
        const preview = response.data.data;
        setFaceDetection(preview.detected ? preview.faceDetection ?? null : null);
      } catch {
        setFaceDetection(null);
      } finally {
        previewRequestRef.current = false;
      }
    }, PREVIEW_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cameraError, cameraReady, processing]);

  const finalizeRegistration = async (activeSessionId: string) => {
    if (!profile) {
      toast({
        title: "Registration data missing",
        description: "Data registrasi awal tidak ditemukan. Isi data lagi terlebih dahulu.",
        variant: "destructive",
      });
      navigate("/attendance/registration");
      return;
    }

    setStatusText("Training selesai. Menyimpan profil wajah...");

    try {
      const response = await faceAiApi.finalizeRegistration({
        sessionId: activeSessionId,
        profile,
      });

      const savedProfile = response.data.data.profile;
      setCurrentAttendanceUser(savedProfile);
      clearPendingRegistrationProfile();
      toast({
        title: "Registrasi wajah berhasil",
        description: "Profil wajah selesai ditraining dan user baru sudah dibuat.",
      });
      navigate("/user-dashboard");
    } catch (error: any) {
      toast({
        title: "Training gagal",
        description: error.response?.data?.message || "Gagal menyimpan hasil training wajah.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handleCapture = async () => {
    const frame = captureFrame();
    if (!frame) {
      toast({
        title: "Capture gagal",
        description: "Frame kamera tidak tersedia.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setFaceDetection(null);
    setFrameSize({ width: frame.width, height: frame.height });
    setStatusText("Memproses sampel wajah...");

    try {
      const response = await faceAiApi.captureRegistration({
        imageBase64: frame.imageBase64,
        sessionId,
      });

      const result = response.data.data;
      setSessionId(result.sessionId);
      setSampleCount(result.sampleCount);
      setFaceDetection(result.faceDetection ?? null);

      if (result.duplicateCapture) {
        setStatusText("Sampel terlalu mirip dengan capture sebelumnya. Coba ubah angle wajah sedikit.");
      } else {
        setStatusText(`Sampel ${result.sampleCount}/${REQUIRED_SAMPLES} berhasil direkam.`);
      }

      if (result.readyForProfile) {
        await finalizeRegistration(result.sessionId);
        return;
      }

      setProcessing(false);
    } catch (error: any) {
      toast({
        title: "Capture gagal",
        description: error.response?.data?.message || "Wajah belum terdeteksi dengan jelas.",
        variant: "destructive",
      });
      setStatusText("Capture gagal. Pastikan wajah terlihat jelas lalu coba lagi.");
      setFaceDetection(error.response?.data?.data?.faceDetection ?? null);
      setProcessing(false);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.16),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_20%),linear-gradient(180deg,_rgba(248,250,252,0.99),_rgba(241,245,249,0.98))] p-4 md:p-6 overflow-hidden flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        <section className="overflow-hidden rounded-[20px] bg-gradient-to-r from-[#7c4dff] via-[#5968ff] to-[#5da2ff] px-6 py-3.5 text-white shadow-md flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-[#e3dcff] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Face Registration Training
            </div>
            <h1 className="text-xl font-bold sm:text-2xl text-white">Training wajah 3 kali untuk registrasi awal</h1>
            <p className="text-xs text-white/85">Setelah 3 sampel valid direkam, sistem akan langsung membuat user baru dan masuk ke dashboard user.</p>
          </div>
        </section>

        <div className="flex-1 grid gap-4 lg:grid-cols-[1.35fr_0.65fr] min-h-0 overflow-hidden">
          <Card className="h-full flex flex-col min-h-0 rounded-[24px] border-white/60 bg-white/85 shadow-lg backdrop-blur-sm overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-hidden justify-between gap-4">
              <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950 rounded-[20px] p-2 relative">
                {cameraError ? (
                  <div className="flex items-center justify-center px-6 text-center text-sm text-white/80">
                    {cameraError}
                  </div>
                ) : (
                  <div className="relative aspect-video h-full max-h-full max-w-full mx-auto rounded-[16px] overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {faceDetection && (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="absolute rounded-[14px] border-[3px] border-emerald-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]"
                          style={getOverlayStyle(faceDetection, frameSize)}
                        >
                          <div className="absolute -top-7 left-0 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                            YuNet {(faceDetection.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row flex-shrink-0">
                <Button
                  type="button"
                  className="h-12 rounded-2xl flex-1 justify-center gap-2"
                  disabled={!cameraReady || processing || !profile}
                  onClick={handleCapture}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Capture Training Sample
                </Button>

                <Button type="button" variant="outline" className="h-12 rounded-2xl gap-2" onClick={() => navigate("/attendance/registration")}>Kembali ke Form</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col min-h-0 rounded-[24px] border-white/60 bg-white/85 shadow-lg backdrop-blur-sm overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-4 md:p-6 min-h-0 justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ScanFace className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 leading-tight">Training Progress</h2>
                  <p className="text-xs text-slate-500">Wajib 3 sampel wajah valid.</p>
                </div>
              </div>

              <div className="space-y-2 flex-shrink-0">
                <Progress value={(sampleCount / REQUIRED_SAMPLES) * 100} className="h-2.5" />
              </div>

              <div className="flex-grow flex flex-col justify-center items-center rounded-2xl bg-slate-50 p-4 text-center min-h-[100px]">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Captured Samples</p>
                <p className="mt-2 text-5xl font-extrabold text-slate-900 tracking-tight">{sampleCount}/{REQUIRED_SAMPLES}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm flex-shrink-0">
                {statusText}
              </div>

              {sampleCount >= REQUIRED_SAMPLES && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                  3 sampel sudah cukup. Sistem sedang menyiapkan profil user.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
