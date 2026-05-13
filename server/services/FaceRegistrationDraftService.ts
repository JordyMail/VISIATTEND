import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export interface FaceRegistrationDraft {
    sessionId: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    userId: string;
    dateOfBirth?: string;
    category?: 'student' | 'other';
    createdAt: string;
    updatedAt: string;
}

export class FaceRegistrationDraftService {
    private readonly draftsDir: string;

    constructor() {
        this.draftsDir = process.env.FACE_REGISTRATION_DRAFT_DIR
            ? path.resolve(process.env.FACE_REGISTRATION_DRAFT_DIR)
            : path.resolve(process.cwd(), 'storage', 'face-registration-drafts');
    }

    async createDraft(input: Omit<FaceRegistrationDraft, 'sessionId' | 'createdAt' | 'updatedAt'>) {
        const sessionId = randomBytes(16).toString('hex');
        const timestamp = new Date().toISOString();
        const draft: FaceRegistrationDraft = {
            sessionId,
            ...input,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        await this.ensureDirectory();
        await writeFile(this.getDraftPath(sessionId), JSON.stringify(draft, null, 2), 'utf8');

        return draft;
    }

    async getDraft(sessionId: string) {
        try {
            const raw = await readFile(this.getDraftPath(sessionId), 'utf8');
            return JSON.parse(raw) as FaceRegistrationDraft;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }

            throw error;
        }
    }

    async deleteDraft(sessionId: string) {
        await rm(this.getDraftPath(sessionId), { force: true });
    }

    private async ensureDirectory() {
        await mkdir(this.draftsDir, { recursive: true });
    }

    private getDraftPath(sessionId: string) {
        return path.resolve(this.draftsDir, `${sessionId}.json`);
    }
}