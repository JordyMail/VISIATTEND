import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, ScanFace, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { setCurrentAttendanceUser } from "@/lib/attendanceFlow";
import { faceAiApi } from "@/services/api";

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

export default function FaceAttendance() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRequestRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Arahkan wajah ke kamera lalu lakukan attendance.");
  const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 16, height: 9 });

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
      } catch {
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

  const handleAttendance = async () => {
    const frame = captureFrame();
    if (!frame) {
      return;
    }

    setProcessing(true);
    setFaceDetection(null);
    setFrameSize({ width: frame.width, height: frame.height });
    setStatusText("Memverifikasi wajah...");

    try {
      const response = await faceAiApi.verifyAttendance({ imageBase64: frame.imageBase64 });
      const payload = response.data.data;
      setFaceDetection(payload.faceDetection ?? null);
      const profile = payload.member
        ? {
            userId: payload.matchedUserId,
            memberId: payload.member.memberId,
            name: payload.member.name,
            email: payload.member.email ?? "-",
            category: payload.profile?.category ?? "registered",
            phone: payload.profile?.phone ?? "-",
            birthday: payload.profile?.birthday ?? "-",
          }
        : payload.profile ?? {
            userId: payload.matchedUserId,
            name: payload.matchedName ?? payload.matchedUserId,
            email: "-",
            category: "registered",
            phone: "-",
            birthday: "-",
          };

      setCurrentAttendanceUser(profile);
      toast({
        title: "Attendance berhasil",
        description: `${profile.name} berhasil dikenali oleh AI face attendance.`,
      });
      navigate("/user-dashboard");
    } catch (error: any) {
      toast({
        title: "Attendance gagal",
        description: error.response?.data?.message || "Wajah belum dikenali. Registrasi dulu sebelum attendance.",
        variant: "destructive",
      });
      setFaceDetection(error.response?.data?.data?.faceDetection ?? null);
      setStatusText("Wajah belum dikenali. Registrasi dulu sebelum attendance.");
      setProcessing(false);
    }
  };

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,77,255,0.16),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_20%),linear-gradient(180deg,_rgba(248,250,252,0.99),_rgba(241,245,249,0.98))] p-3 md:p-4">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
        <section className="overflow-hidden rounded-[22px] bg-gradient-to-r from-[#7c4dff] via-[#5968ff] to-[#5da2ff] px-4 py-3 text-white shadow-[0_20px_60px_-40px_rgba(79,70,229,0.78)] md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-fit rounded-xl border-0 bg-white/15 px-3 text-white hover:bg-white/20"
              onClick={() => navigate("/attendance")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              AI Face Attendance
            </div>
            <h1 className="text-lg font-bold">Attendance wajah untuk user yang sudah registrasi</h1>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl flex-1 gap-4 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
          <Card className="rounded-[24px] border-white/60 bg-white/85 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanFace className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Attendance Check</h2>
                  <p className="text-xs text-slate-500">Verifikasi sekali scan.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">{statusText}</div>
            </CardContent>
          </Card>

          <Card className="flex-1 rounded-[28px] border-white/60 bg-white/85 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <CardContent className="flex h-full flex-col justify-center p-4 md:p-5">
              <div className="mx-auto w-full max-w-[42rem]">
                <div className="relative overflow-hidden rounded-[24px] bg-slate-950">
                {cameraError ? (
                  <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-white/80">{cameraError}</div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
                    {faceDetection && (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="absolute rounded-[18px] border-[3px] border-emerald-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]"
                          style={getOverlayStyle(faceDetection, frameSize)}
                        >
                          <div className="absolute -top-8 left-0 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                            YuNet {(faceDetection.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" className="h-11 rounded-2xl" disabled={!cameraReady || processing} onClick={handleAttendance}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Start Attendance
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => navigate("/attendance")}>Kembali ke Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}