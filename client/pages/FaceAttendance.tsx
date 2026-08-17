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
const CHALLENGE_TIMEOUT_MS = 9000;

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

type ChallengeType = "blink" | "turn_left" | "turn_right" | "smile";

type MeshPoint = {
  x: number;
  y: number;
  z?: number;
};

type FaceMetrics = {
  ear: number;
  yaw: number;
  smile: number;
};

type ChallengeSession = {
  challenge: ChallengeType;
  startedAt: number;
  deadlineAt: number;
  baselineCount: number;
  earSum: number;
  yawSum: number;
  smileSum: number;
  maxEarDrop: number;
  maxYawLeft: number;
  maxYawRight: number;
  maxSmileRise: number;
};

const CHALLENGE_LABEL: Record<ChallengeType, string> = {
  blink: "Blink (kedip sekali)",
  turn_left: "Turn head left",
  turn_right: "Turn head right",
  smile: "Smile",
};

const CHALLENGES: ChallengeType[] = ["blink", "turn_left", "turn_right", "smile"];

const getOverlayStyle = (faceDetection: FaceDetection, frameSize: FrameSize) => ({
  left: `${(faceDetection.box.x / Math.max(frameSize.width, 1)) * 100}%`,
  top: `${(faceDetection.box.y / Math.max(frameSize.height, 1)) * 100}%`,
  width: `${(faceDetection.box.w / Math.max(frameSize.width, 1)) * 100}%`,
  height: `${(faceDetection.box.h / Math.max(frameSize.height, 1)) * 100}%`,
});

function distance(points: MeshPoint[], a: number, b: number): number {
  const p1 = points[a];
  const p2 = points[b];
  if (!p1 || !p2) return 0;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function extractMetrics(points: MeshPoint[]): FaceMetrics | null {
  if (points.length < 387) {
    return null;
  }

  const leftEyeOpen = distance(points, 159, 145);
  const leftEyeWidth = Math.max(distance(points, 33, 133), 1e-6);
  const rightEyeOpen = distance(points, 386, 374);
  const rightEyeWidth = Math.max(distance(points, 362, 263), 1e-6);
  const ear = ((leftEyeOpen / leftEyeWidth) + (rightEyeOpen / rightEyeWidth)) / 2;

  const leftEyeCorner = points[33];
  const rightEyeCorner = points[263];
  const noseTip = points[1];
  const eyeMidX = (leftEyeCorner.x + rightEyeCorner.x) / 2;
  const interEye = Math.max(Math.abs(rightEyeCorner.x - leftEyeCorner.x), 1e-6);
  const yaw = (noseTip.x - eyeMidX) / interEye;

  const mouthWidth = distance(points, 61, 291);
  const mouthOpen = Math.max(distance(points, 13, 14), 1e-6);
  const smile = mouthWidth / mouthOpen;

  return { ear, yaw, smile };
}

export default function FaceAttendance() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRequestRef = useRef(false);
  const faceMeshRef = useRef<any>(null);
  const meshTimerRef = useRef<number | null>(null);
  const meshBusyRef = useRef(false);
  const challengeRef = useRef<ChallengeSession | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Arahkan wajah ke kamera untuk memulai Active Liveness challenge.");
  const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 16, height: 9 });
  const [challenge, setChallenge] = useState<ChallengeType | null>(null);
  const [challengeRemainMs, setChallengeRemainMs] = useState(0);

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

  const resetChallenge = () => {
    challengeRef.current = null;
    setChallenge(null);
    setChallengeRemainMs(0);
  };

  const runVerify = async (activePayload: {
    challenge: ChallengeType;
    durationMs: number;
    metrics: Record<string, number>;
  }) => {
    const frame = captureFrame();
    if (!frame) {
      setProcessing(false);
      toast({
        title: "Attendance gagal",
        description: "Gagal mengambil frame dari kamera.",
        variant: "destructive",
      });
      return;
    }

    setFaceDetection(null);
    setFrameSize({ width: frame.width, height: frame.height });
    setStatusText("Challenge sukses. Memverifikasi wajah...");

    try {
      const response = await faceAiApi.verifyAttendance({
        imageBase64: frame.imageBase64,
        activeLiveness: {
          passed: true,
          challenge: activePayload.challenge,
          durationMs: activePayload.durationMs,
          metrics: activePayload.metrics,
        },
      });

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
        description: `${profile.name} berhasil dikenali setelah Active Liveness challenge.`,
      });
      navigate("/user-dashboard");
    } catch (error: any) {
      const responseData = error.response?.data?.data;
      const code = responseData?.code;
      const errorTitle = code === "ACTIVE_LIVENESS_REQUIRED"
        ? "Active Liveness wajib"
        : "Attendance gagal";
      const errorDesc = error.response?.data?.message || "Wajah belum dikenali. Registrasi dulu sebelum attendance.";

      toast({
        title: errorTitle,
        description: errorDesc,
        variant: "destructive",
      });

      setFaceDetection(responseData?.faceDetection ?? null);
      setStatusText(errorDesc);
      setProcessing(false);
      resetChallenge();
    }
  };

  const failChallenge = (reason: string) => {
    toast({
      title: "Active Liveness gagal",
      description: reason,
      variant: "destructive",
    });
    setStatusText(reason);
    setProcessing(false);
    resetChallenge();
  };

  const processChallenge = (points: MeshPoint[]) => {
    const session = challengeRef.current;
    if (!session || !challenge) {
      return;
    }

    const now = Date.now();
    const remain = Math.max(session.deadlineAt - now, 0);
    setChallengeRemainMs(remain);

    if (remain <= 0) {
      failChallenge("Challenge timeout. Ulangi attendance dan lakukan gerakan sesuai instruksi.");
      return;
    }

    const metrics = extractMetrics(points);
    if (!metrics) {
      return;
    }

    if (session.baselineCount < 8) {
      session.baselineCount += 1;
      session.earSum += metrics.ear;
      session.yawSum += metrics.yaw;
      session.smileSum += metrics.smile;
      setStatusText(`Kalibrasi challenge: ${CHALLENGE_LABEL[session.challenge]}...`);
      return;
    }

    const baseEar = session.earSum / Math.max(session.baselineCount, 1);
    const baseYaw = session.yawSum / Math.max(session.baselineCount, 1);
    const baseSmile = session.smileSum / Math.max(session.baselineCount, 1);

    const earDrop = (baseEar - metrics.ear) / Math.max(baseEar, 1e-6);
    const yawDelta = metrics.yaw - baseYaw;
    const smileRise = (metrics.smile - baseSmile) / Math.max(baseSmile, 1e-6);

    session.maxEarDrop = Math.max(session.maxEarDrop, earDrop);
    session.maxYawLeft = Math.min(session.maxYawLeft, yawDelta);
    session.maxYawRight = Math.max(session.maxYawRight, yawDelta);
    session.maxSmileRise = Math.max(session.maxSmileRise, smileRise);

    let passed = false;
    if (session.challenge === "blink") {
      passed = earDrop > 0.22;
    } else if (session.challenge === "turn_left") {
      passed = yawDelta < -0.12;
    } else if (session.challenge === "turn_right") {
      passed = yawDelta > 0.12;
    } else if (session.challenge === "smile") {
      passed = smileRise > 0.2;
    }

    if (!passed) {
      return;
    }

    const durationMs = now - session.startedAt;
    const payloadMetrics: Record<string, number> = {
      baseEar,
      baseYaw,
      baseSmile,
      earDrop,
      yawDelta,
      smileRise,
      maxEarDrop: session.maxEarDrop,
      maxYawLeft: session.maxYawLeft,
      maxYawRight: session.maxYawRight,
      maxSmileRise: session.maxSmileRise,
    };

    setStatusText(`Challenge sukses: ${CHALLENGE_LABEL[session.challenge]}.`);
    challengeRef.current = null;
    setChallenge(null);
    setChallengeRemainMs(0);
    void runVerify({
      challenge: session.challenge,
      durationMs,
      metrics: payloadMetrics,
    });
  };

  const startChallenge = () => {
    if (processing || !cameraReady) {
      return;
    }

    const selected = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    const now = Date.now();

    challengeRef.current = {
      challenge: selected,
      startedAt: now,
      deadlineAt: now + CHALLENGE_TIMEOUT_MS,
      baselineCount: 0,
      earSum: 0,
      yawSum: 0,
      smileSum: 0,
      maxEarDrop: 0,
      maxYawLeft: 0,
      maxYawRight: 0,
      maxSmileRise: 0,
    };

    setProcessing(true);
    setChallenge(selected);
    setChallengeRemainMs(CHALLENGE_TIMEOUT_MS);
    setStatusText(`Active challenge: ${CHALLENGE_LABEL[selected]}. Selesaikan dalam ${Math.round(CHALLENGE_TIMEOUT_MS / 1000)} detik.`);
  };

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

  useEffect(() => {
    if (!cameraReady || cameraError) {
      return;
    }

    let disposed = false;

    const initFaceMesh = async () => {
      try {
        const mp = await import("@mediapipe/face_mesh");
        if (disposed) return;

        const mesh = new mp.FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        mesh.onResults((results: any) => {
          const points = results?.multiFaceLandmarks?.[0] as MeshPoint[] | undefined;
          if (!points || points.length === 0) {
            return;
          }
          processChallenge(points);
        });

        faceMeshRef.current = mesh;

        meshTimerRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || meshBusyRef.current) {
            return;
          }

          const current = challengeRef.current;
          if (!current) {
            return;
          }

          meshBusyRef.current = true;
          try {
            await mesh.send({ image: video });
          } catch {
            // Ignore transient frame failures.
          } finally {
            meshBusyRef.current = false;
          }
        }, 120);
      } catch {
        setStatusText("Gagal memuat MediaPipe Face Mesh. Coba refresh halaman.");
      }
    };

    void initFaceMesh();

    return () => {
      disposed = true;
      if (meshTimerRef.current) {
        window.clearInterval(meshTimerRef.current);
        meshTimerRef.current = null;
      }
      const mesh = faceMeshRef.current;
      if (mesh && typeof mesh.close === "function") {
        void mesh.close();
      }
      faceMeshRef.current = null;
    };
  }, [cameraError, cameraReady, challenge]);

  useEffect(() => {
    if (!cameraReady || cameraError) {
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
        setFaceDetection(preview.detected ? (preview.faceDetection as FaceDetection) : null);
      } catch {
        setFaceDetection(null);
      } finally {
        previewRequestRef.current = false;
      }
    }, PREVIEW_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cameraError, cameraReady]);

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
                Active Liveness
              </div>
              <h1 className="text-lg font-bold">Attendance wajah dengan challenge acak</h1>
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl flex-1 gap-4 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center">
          <Card className="mx-auto w-full max-w-[42rem] rounded-[24px] border-white/60 bg-white/85 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <CardContent className="space-y-4 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanFace className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Attendance Check</h2>
                  <p className="text-sm text-slate-500">Face Detection to Active Liveness to Recognition</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-600">{statusText}</div>

              {challenge && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <div className="font-semibold">Challenge: {CHALLENGE_LABEL[challenge]}</div>
                  <div>Waktu tersisa: {(challengeRemainMs / 1000).toFixed(1)} detik</div>
                </div>
              )}
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
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" className="h-11 rounded-2xl" disabled={!cameraReady || processing} onClick={startChallenge}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Start Active Attendance
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
