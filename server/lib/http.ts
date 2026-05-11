import { Request, Response } from 'express';

export function ok(res: Response, data: unknown, message?: string) {
    return res.json({ success: true, message, data });
}

export function created(res: Response, data: unknown, message?: string) {
    return res.status(201).json({ success: true, message, data });
}

export function badRequest(res: Response, message: string, details?: unknown) {
    return res.status(400).json({ success: false, message, details });
}

export function unauthorized(res: Response, message: string = 'Unauthorized') {
    return res.status(401).json({ success: false, message });
}

export function notFound(res: Response, message: string = 'Data not found') {
    return res.status(404).json({ success: false, message });
}

export function serverError(res: Response, error: unknown, fallbackMessage: string = 'Internal server error') {
    console.error(fallbackMessage, error);
    return res.status(500).json({ success: false, message: fallbackMessage });
}

export function getRequestIp(req: Request) {
    return req.ip || req.socket.remoteAddress || null;
}