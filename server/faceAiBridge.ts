import { spawn } from "child_process";
import path from "path";

const FACE_AI_ROOT = process.env.FACE_AI_ROOT ?? path.resolve(process.cwd(), "face-ai");
const FACE_AI_PYTHON = process.env.FACE_AI_PYTHON ?? path.join(FACE_AI_ROOT, "venv", "Scripts", "python.exe");
const FACE_AI_BRIDGE = process.env.FACE_AI_BRIDGE ?? path.join(FACE_AI_ROOT, "app", "backend_bridge.py");

interface FaceAiBridgeEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  details?: Record<string, unknown>;
}

export async function runFaceAiCommand<T>(command: "preview-detection" | "capture-registration" | "finalize-registration" | "verify", payload: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    const processHandle = spawn(FACE_AI_PYTHON, [FACE_AI_BRIDGE, command], {
      cwd: FACE_AI_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    processHandle.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    processHandle.on("error", (error) => {
      reject(error);
    });

    processHandle.on("close", (code) => {
      const stdoutLines = stdout
        .trim()
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      for (const line of stdoutLines) {
        if (line.startsWith("[VERIFY_AUDIT]")) {
          console.log(line);
        }
      }

      const lastLine = stdoutLines.pop();

      if (!lastLine) {
        reject(new Error(stderr || `Face AI bridge returned no output (exit code ${code ?? "unknown"})`));
        return;
      }

      let parsed: FaceAiBridgeEnvelope<T>;

      try {
        parsed = JSON.parse(lastLine) as FaceAiBridgeEnvelope<T>;
      } catch (error) {
        reject(new Error(`Failed to parse Face AI bridge output: ${lastLine}`));
        return;
      }

      if (!parsed.success || !parsed.data) {
        reject(new Error(parsed.message || stderr || "Face AI bridge returned an error"));
        return;
      }

      resolve(parsed.data);
    });

    processHandle.stdin.write(JSON.stringify(payload));
    processHandle.stdin.end();
  });
}
