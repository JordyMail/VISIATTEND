import { Router } from 'express';
import {
	handleFlutterCheckIn,
	handleFlutterFaceCheckIn,
	handleFlutterFaceRegisterCapture,
	handleFlutterFaceRegisterFinalize,
	handleFlutterFaceRegisterStart,
	handleFlutterRegisterMember,
} from '../../controllers/flutter/attendanceController';

const router = Router();

router.post('/check-in', handleFlutterCheckIn);
router.post('/face/register/start', handleFlutterFaceRegisterStart);
router.post('/face/register-capture', handleFlutterFaceRegisterCapture);
router.post('/face/register', handleFlutterFaceRegisterFinalize);
router.post('/face/check-in', handleFlutterFaceCheckIn);

router.post('/register', handleFlutterRegisterMember);

export default router;