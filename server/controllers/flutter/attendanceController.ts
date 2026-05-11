import { RequestHandler } from 'express';
import { badRequest, ok, serverError } from '../../lib/http';
import { AttendanceService } from '../../services/AttendanceService';

const attendanceService = new AttendanceService();

export const handleFlutterCheckIn: RequestHandler = async (req, res) => {
    try {
        const { attendanceDate, checkInTime } = req.body || {};
        if (!attendanceDate || !checkInTime) {
            return badRequest(res, 'attendanceDate and checkInTime are required');
        }

        const result = await attendanceService.processFaceAttendance({
            attendanceDate,
            checkInTime,
            userId: req.body?.userId,
            memberId: req.body?.memberId,
            email: req.body?.email,
            fullName: req.body?.fullName,
            phoneNumber: req.body?.phoneNumber,
            dateOfBirth: req.body?.dateOfBirth,
            category: req.body?.category,
            deviceInfo: req.body?.deviceInfo,
            notes: req.body?.notes,
        });

        return ok(res, result, result.requiresRegistration ? result.message : 'Attendance processed successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to process flutter attendance');
    }
};

export const handleFlutterRegisterAndAttend: RequestHandler = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, dateOfBirth, category, attendanceDate, checkInTime } = req.body || {};
        if (!fullName || !email || !phoneNumber || !dateOfBirth || !category || !attendanceDate || !checkInTime) {
            return badRequest(res, 'fullName, email, phoneNumber, dateOfBirth, category, attendanceDate, and checkInTime are required');
        }

        const result = await attendanceService.registerAndAttend({
            fullName,
            email,
            phoneNumber,
            userId: req.body?.userId || req.body?.memberId,
            dateOfBirth,
            category,
            attendanceDate,
            checkInTime,
            deviceInfo: req.body?.deviceInfo,
            notes: req.body?.notes,
        });
        const dashboard = await attendanceService.getUserDashboard(result.user.id);

        return ok(res, {
            nextStep: 'user-dashboard',
            dashboard,
            ...result,
        }, 'Member registered and attendance recorded successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to register member from flutter attendance');
    }
};