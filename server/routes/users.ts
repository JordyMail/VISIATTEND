import bcrypt from 'bcrypt';
import { Router } from 'express';
import { ActivityLogRepository } from '../db/repositories/ActivityLogRepository';
import { UserRepository } from '../db/repositories/UserRepository';
import { badRequest, created, getRequestIp, notFound, ok, serverError } from '../lib/http';
import { AttendanceService } from '../services/AttendanceService';

const router = Router();
const userRepository = new UserRepository();
const activityLogRepository = new ActivityLogRepository();
const attendanceService = new AttendanceService();

function toBoolean(value: unknown) {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
}

router.get('/', async (req, res) => {
    try {
        const users = await userRepository.findAll({
            role: typeof req.query.role === 'string' ? req.query.role : undefined,
            isActive: toBoolean(req.query.isActive),
        });
        return ok(res, users);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch users');
    }
});

router.get('/:id/dashboard', async (req, res) => {
    try {
        const dashboard = await attendanceService.getUserDashboard(Number(req.params.id));
        return ok(res, dashboard);
    } catch (error: any) {
        if (error instanceof Error && error.message === 'User not found') {
            return notFound(res, error.message);
        }

        return serverError(res, error, 'Failed to fetch user dashboard');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await userRepository.findById(Number(req.params.id));
        if (!user) {
            return notFound(res, 'User not found');
        }

        return ok(res, user);
    } catch (error) {
        return serverError(res, error, 'Failed to fetch user');
    }
});

router.post('/', async (req, res) => {
    try {
        const { fullName, userId, memberId, email, password, role, phoneNumber, dateOfBirth, category } = req.body || {};
        const resolvedUserId = userId || memberId;
        if (!fullName || !resolvedUserId || !email || !password) {
            return badRequest(res, 'fullName, userId, email, and password are required');
        }

        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) {
            return badRequest(res, 'Email already exists');
        }

        const existingUserId = await userRepository.findByUserId(resolvedUserId);
        if (existingUserId) {
            return badRequest(res, 'User ID already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await userRepository.create({
            fullName,
            userId: resolvedUserId,
            email,
            passwordHash,
            role: role || 'member',
            phoneNumber,
            dateOfBirth,
            category,
        });

        await activityLogRepository.log({
            action: 'USER_CREATED',
            entityType: 'users',
            entityId: user.id,
            description: `User ${user.full_name} was created`,
            ipAddress: getRequestIp(req) ?? undefined,
        });

        return created(res, user, 'User created successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to create user');
    }
});

router.put('/:id', async (req, res) => {
    try {
        const user = await userRepository.update(Number(req.params.id), req.body || {});
        if (!user) {
            return notFound(res, 'User not found');
        }

        return ok(res, user, 'User updated successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to update user');
    }
});

router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const user = await userRepository.toggleStatus(Number(req.params.id));
        if (!user) {
            return notFound(res, 'User not found');
        }

        return ok(res, user, 'User status updated');
    } catch (error) {
        return serverError(res, error, 'Failed to toggle user status');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await userRepository.delete(Number(req.params.id));
        if (!deleted) {
            return notFound(res, 'User not found');
        }

        return ok(res, null, 'User deleted successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to delete user');
    }
});

export default router;