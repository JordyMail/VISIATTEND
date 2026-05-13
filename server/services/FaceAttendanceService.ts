import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

type PythonBridgeResponse<T> = {
    success: boolean;
    data?: T;
    message?: string;
    details?: unknown;
};

export interface CaptureRegistrationSampleResult {
    sessionId: string;
    sampleCount: number;
    remainingCaptures: number;
    readyForProfile: boolean;
    duplicateCapture: boolean;
    embeddingDimension: number;
    faceDetection: {
        confidence: number;
        box: {
            x: number;
            y: number;
            w: number;
            h: number;
        };
        landmarks: Array<{ x: number; y: number }>;
    };
}

export interface FinalizeRegistrationResult {
    sessionId: string;
    userId: string;
    name: string;
    registeredSamples: number;
    storagePath: string;
}

export interface VerifyFaceResult {
    matched: boolean;
    matchedUserId: string | null;
    matchedName: string | null;
    confidence: number;
    code: string;
    threshold: number;
    faceDetection: {
        confidence: number;
        box: {
            x: number;
            y: number;
            w: number;
            h: number;
        };
        landmarks: Array<{ x: number; y: number }>;
    };
}

export class FaceAttendanceService {
    private readonly projectRoot: string;
    private readonly bridgeScript: string;
    private readonly pythonExecutable: string;

    constructor() {
        this.projectRoot = process.env.FACE_AI_PROJECT_ROOT
            ? path.resolve(process.env.FACE_AI_PROJECT_ROOT)
            : path.resolve(process.cwd(), 'face-ai');

        this.bridgeScript = process.env.FACE_AI_BRIDGE_SCRIPT
            ? path.resolve(process.env.FACE_AI_BRIDGE_SCRIPT)
            : path.resolve(this.projectRoot, 'app', 'backend_bridge.py');

        const defaultWindowsPython = path.resolve(this.projectRoot, 'venv', 'Scripts', 'python.exe');
        const defaultUnixPython = path.resolve(this.projectRoot, 'venv', 'bin', 'python');
        this.pythonExecutable = process.env.FACE_AI_PYTHON_EXECUTABLE
            ? path.resolve(process.env.FACE_AI_PYTHON_EXECUTABLE)
            : existsSync(defaultWindowsPython)
                ? defaultWindowsPython
                : existsSync(defaultUnixPython)
                    ? defaultUnixPython
                    : 'python';
    }

    async captureRegistrationSample(input: { imageBase64: string; sessionId?: string }) {
        return this.runCommand<CaptureRegistrationSampleResult>('capture-registration', input);
    }

    async finalizeRegistration(input: { sessionId: string; userId: string; name: string }) {
        return this.runCommand<FinalizeRegistrationResult>('finalize-registration', input);
    }

    async verifyFace(input: { imageBase64: string; threshold?: number; userId?: string }) {
        return this.runCommand<VerifyFaceResult>('verify', input);
    }

    private async runCommand<T>(command: 'capture-registration' | 'finalize-registration' | 'verify', payload: unknown): Promise<T> {
        if (!existsSync(this.bridgeScript)) {
            throw new Error(`Face AI bridge script not found at ${this.bridgeScript}`);
        }

        return new Promise<T>((resolve, reject) => {
            const child = spawn(this.pythonExecutable, [this.bridgeScript, command], {
                cwd: this.projectRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (error) => {
                reject(error);
            });

            child.on('close', (code) => {
                const trimmedStdout = stdout.trim();
                let parsed: PythonBridgeResponse<T> | null = null;

                if (trimmedStdout) {
                    try {
                        parsed = JSON.parse(trimmedStdout) as PythonBridgeResponse<T>;
                    } catch (error) {
                        reject(new Error(`Failed to parse face AI response: ${trimmedStdout || stderr || String(error)}`));
                        return;
                    }
                }

                if (code !== 0 || !parsed?.success || !parsed.data) {
                    const message = parsed?.message || stderr.trim() || 'Face AI command failed';
                    reject(new Error(message));
                    return;
                }

                resolve(parsed.data);
            });

            child.stdin.write(JSON.stringify(payload));
            child.stdin.end();
        });
    }
}