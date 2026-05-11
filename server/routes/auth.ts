import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { ActivityLogRepository } from '../db/repositories/ActivityLogRepository';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { UserRepository } from '../db/repositories/UserRepository';
import { badRequest, created, getRequestIp, notFound, ok, serverError, unauthorized } from '../lib/http';
import { generateMemberId } from '../lib/member-id';

const router = Router();
const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const activityLogRepository = new ActivityLogRepository();

const JWT_SECRET = process.env.JWT_SECRET || 'visiattend-secret';
const ACCESS_TOKEN_EXPIRES_IN = '12h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

function sanitizeUser(user: any) {
    if (!user) {
        return null;
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
}

function createTokens(user: any) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return { accessToken, refreshToken };
}

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return badRequest(res, 'Email and password are required');
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return unauthorized(res, 'Email atau password salah');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return unauthorized(res, 'Email atau password salah');
        }

        if (!user.is_active) {
            return unauthorized(res, 'User account is inactive');
        }

        const tokens = createTokens(user);
        await sessionRepository.create({
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress: getRequestIp(req),
        });
        await userRepository.updateLastLogin(user.id);
        await activityLogRepository.log({
            userId: user.id,
            action: 'AUTH_LOGIN',
            entityType: 'users',
            entityId: user.id,
            description: `User ${user.email} logged in`,
            ipAddress: getRequestIp(req) ?? undefined,
        });

        return ok(res, {
            user: sanitizeUser(await userRepository.findById(user.id)),
            tokens,
        }, 'Login successful');
    } catch (error) {
        return serverError(res, error, 'Failed to login');
    }
});

router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword, phoneNumber, userId, memberId, dateOfBirth, category } = req.body || {};

        if (!fullName || !email || !password || !confirmPassword || !phoneNumber) {
            return badRequest(res, 'fullName, email, password, confirmPassword, and phoneNumber are required');
        }

        if (password !== confirmPassword) {
            return badRequest(res, 'Passwords do not match');
        }

        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return badRequest(res, 'Email already registered');
        }

        const resolvedUserId = userId || memberId || generateMemberId();
        const existingUserId = await userRepository.findByUserId(resolvedUserId);
        if (existingUserId) {
            return badRequest(res, 'User ID already registered');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await userRepository.create({
            fullName,
            email,
            userId: resolvedUserId,
            passwordHash,
            role: 'member',
            phoneNumber,
            dateOfBirth,
            category,
        });

        await activityLogRepository.log({
            userId: user.id,
            action: 'AUTH_REGISTER',
            entityType: 'users',
            entityId: user.id,
            description: `New member registered with email ${email}`,
            ipAddress: getRequestIp(req) ?? undefined,
        });

        return created(res, { userId: user.id, user_id: user.user_id }, 'Registration successful');
    } catch (error) {
        return serverError(res, error, 'Failed to register user');
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body || {};

        if (!refreshToken) {
            return badRequest(res, 'refreshToken is required');
        }

        const session = await sessionRepository.findByRefreshToken(refreshToken);
        if (!session) {
            return unauthorized(res, 'Invalid refresh token');
        }

        let payload: any;
        try {
            payload = jwt.verify(refreshToken, JWT_SECRET);
        } catch {
            return unauthorized(res, 'Refresh token expired');
        }

        const user = await userRepository.findById(Number(payload.sub));
        if (!user) {
            return notFound(res, 'User not found');
        }

        const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        await sessionRepository.updateLastActivity(session.id);

        return ok(res, { accessToken }, 'Token refreshed successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to refresh token');
    }
});

router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return unauthorized(res, 'Authorization token is required');
        }

        const token = authHeader.replace('Bearer ', '');
        let payload: any;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch {
            return unauthorized(res, 'Invalid or expired token');
        }

        const user = await userRepository.findById(Number(payload.sub));
        if (!user) {
            return notFound(res, 'User not found');
        }

        return ok(res, { user: sanitizeUser(user) });
    } catch (error) {
        return serverError(res, error, 'Failed to get profile');
    }
});

router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const accessToken = authHeader.replace('Bearer ', '');
            const session = await sessionRepository.findByAccessToken(accessToken);
            if (session) {
                await sessionRepository.delete(session.id);
            }
        }

        return ok(res, null, 'Logout successful');
    } catch (error) {
        return serverError(res, error, 'Failed to logout');
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
        return badRequest(res, 'Email is required');
    }

    return ok(res, null, 'Password reset flow is ready for integration');
});

router.post('/verify-reset-code', async (_req, res) => {
    return ok(res, { valid: true }, 'Reset code verified');
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body || {};
        if (!email || !newPassword) {
            return badRequest(res, 'email and newPassword are required');
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return notFound(res, 'User not found');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await userRepository.updatePassword(user.id, passwordHash);
        return ok(res, null, 'Password has been updated');
    } catch (error) {
        return serverError(res, error, 'Failed to reset password');
    }
});

export default router;