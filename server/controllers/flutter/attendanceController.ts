import { RequestHandler } from 'express';
import { badRequest, ok, serverError } from '../../lib/http';
import { AttendanceService } from '../../services/AttendanceService';
import { FaceAttendanceService } from '../../services/FaceAttendanceService';
import { FaceRegistrationDraftService } from '../../services/FaceRegistrationDraftService';

const attendanceService = new AttendanceService();
const faceAttendanceService = new FaceAttendanceService();
const faceRegistrationDraftService = new FaceRegistrationDraftService();

function resolveAttendanceDate(value?: string) {
    return value || new Date().toISOString().slice(0, 10);
}

function resolveCheckInTime(value?: string) {
    return value || new Date().toISOString();
}

export const handleFlutterCheckIn: RequestHandler = async (req, res) => {
    try {
        const { attendanceDate, checkInTime } = req.body || {};
        if (!attendanceDate || !checkInTime) {
            return badRequest(res, 'attendanceDate and checkInTime are required');
        }

        const result = await attendanceService.processFlutterAttendance({
            attendanceDate,
            checkInTime,
            userId: req.body?.userId,
            memberId: req.body?.memberId,
            email: req.body?.email,
            deviceInfo: req.body?.deviceInfo,
            notes: req.body?.notes,
        });

        return ok(res, result, result.requiresRegistration ? result.message : 'Attendance processed successfully');
    } catch (error) {
        if (error instanceof Error && error.message === 'userId, memberId, or email is required') {
            return badRequest(res, error.message);
        }

        return serverError(res, error, 'Failed to process flutter attendance');
    }
};

export const handleFlutterRegisterMember: RequestHandler = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, dateOfBirth, category, attendanceDate, checkInTime } = req.body || {};
        if (!fullName || !email || !phoneNumber || !dateOfBirth || !category) {
            return badRequest(res, 'fullName, email, phoneNumber, dateOfBirth, and category are required');
        }

        if (attendanceDate && checkInTime) {
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

            return ok(res, result, 'Member registered and attendance recorded successfully');
        }

        const result = await attendanceService.registerMember({
            fullName,
            email,
            phoneNumber,
            userId: req.body?.userId || req.body?.memberId,
            dateOfBirth,
            category,
        });

        return ok(res, result, 'Member registered successfully');
    } catch (error) {
        if (error instanceof Error && (error.message === 'Email already registered' || error.message === 'User ID already registered')) {
            return badRequest(res, error.message);
        }

        return serverError(res, error, 'Failed to register member from flutter attendance');
    }
};

export const handleFlutterFaceRegisterStart: RequestHandler = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, dateOfBirth, category } = req.body || {};
        if (!fullName || !email || !phoneNumber || !dateOfBirth || !category) {
            return badRequest(res, 'fullName, email, phoneNumber, dateOfBirth, and category are required');
        }

        const preparedRegistration = await attendanceService.prepareMemberRegistration({
            fullName,
            email,
            phoneNumber,
            userId: req.body?.userId || req.body?.memberId,
            dateOfBirth,
            category,
        });

        const registrationDraft = await faceRegistrationDraftService.createDraft(preparedRegistration);

        return ok(res, {
            nextStep: 'face-training',
            requiredCaptures: 3,
            sessionId: registrationDraft.sessionId,
            registrationDraft,
        }, 'Registration form saved. Continue with 3 face captures.');
    } catch (error) {
        if (error instanceof Error && (error.message === 'Email already registered' || error.message === 'User ID already registered')) {
            return badRequest(res, error.message);
        }

        return serverError(res, error, 'Failed to start face registration');
    }
};

export const handleFlutterFaceRegisterCapture: RequestHandler = async (req, res) => {
    try {
        const { imageBase64, sessionId } = req.body || {};
        if (!sessionId || !imageBase64) {
            return badRequest(res, 'sessionId and imageBase64 are required');
        }

        const registrationDraft = await faceRegistrationDraftService.getDraft(sessionId);
        if (!registrationDraft) {
            return badRequest(res, 'Registration form session not found. Submit the form before face capture.');
        }

        const result = await faceAttendanceService.captureRegistrationSample({
            imageBase64,
            sessionId,
        });

        return ok(res, {
            nextStep: result.readyForProfile ? 'face-register-finalize' : 'face-training',
            registrationDraft,
            ...result,
        }, 'Face training sample processed successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to capture face training sample');
    }
};

export const handleFlutterFaceRegisterFinalize: RequestHandler = async (req, res) => {
    let registeredUser: Awaited<ReturnType<AttendanceService['registerMember']>>['user'] | null = null;

    try {
        const { sessionId } = req.body || {};
        if (!sessionId) {
            return badRequest(res, 'sessionId is required');
        }

        const registrationDraft = await faceRegistrationDraftService.getDraft(sessionId);
        const fullName = registrationDraft?.fullName || req.body?.fullName;
        const email = registrationDraft?.email || req.body?.email;
        const phoneNumber = registrationDraft?.phoneNumber || req.body?.phoneNumber;
        const dateOfBirth = registrationDraft?.dateOfBirth || req.body?.dateOfBirth;
        const category = registrationDraft?.category || req.body?.category;
        const userId = registrationDraft?.userId || req.body?.userId || req.body?.memberId;

        if (!fullName || !email || !phoneNumber || !dateOfBirth || !category) {
            return badRequest(res, 'A registration draft was not found. Send fullName, email, phoneNumber, dateOfBirth, and category together with sessionId.');
        }

        const registration = await attendanceService.registerMember({
            fullName,
            email,
            phoneNumber,
            userId,
            dateOfBirth,
            category,
        });
        registeredUser = registration.user;

        const faceRegistration = await faceAttendanceService.finalizeRegistration({
            sessionId,
            userId: registration.user.user_id,
            name: registration.user.full_name,
        });

        if (registrationDraft) {
            await faceRegistrationDraftService.deleteDraft(sessionId);
        }

        const dashboard = await attendanceService.getUserDashboard(registration.user.id);

        return ok(res, {
            nextStep: 'user-dashboard',
            requiresRegistration: false,
            user: registration.user,
            dashboard,
            faceRegistration,
        }, 'Member and face profile registered successfully');
    } catch (error) {
        if (registeredUser) {
            await attendanceService.rollbackMemberRegistration(registeredUser.id);
        }

        if (error instanceof Error && (error.message === 'Email already registered' || error.message === 'User ID already registered')) {
            return badRequest(res, error.message);
        }

        return serverError(res, error, 'Failed to finalize face registration');
    }
};

export const handleFlutterFaceCheckIn: RequestHandler = async (req, res) => {
    try {
        const { imageBase64 } = req.body || {};
        if (!imageBase64) {
            return badRequest(res, 'imageBase64 is required');
        }

        const faceVerification = await faceAttendanceService.verifyFace({
            imageBase64,
            threshold: req.body?.threshold,
            userId: req.body?.userId || req.body?.memberId,
        });

        if (!faceVerification.matched || !faceVerification.matchedUserId) {
            return ok(res, {
                requiresRegistration: true,
                nextStep: 'registration',
                faceVerification,
            }, 'Face not recognized. Registration is required before attendance can be recorded.');
        }

        const result = await attendanceService.processFlutterAttendance({
            attendanceDate: resolveAttendanceDate(req.body?.attendanceDate),
            checkInTime: resolveCheckInTime(req.body?.checkInTime),
            userId: faceVerification.matchedUserId,
            deviceInfo: req.body?.deviceInfo,
            confidenceScore: faceVerification.confidence,
            notes: req.body?.notes,
        });

        return ok(res, {
            ...result,
            faceVerification,
        }, 'Face attendance processed successfully');
    } catch (error) {
        return serverError(res, error, 'Failed to process face attendance');
    }
};
