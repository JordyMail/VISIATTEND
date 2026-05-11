import { Router } from 'express';
import { handleFlutterCheckIn, handleFlutterRegisterAndAttend } from '../../controllers/flutter/attendanceController';

const router = Router();

router.post('/check-in', handleFlutterCheckIn);

router.post('/register', handleFlutterRegisterAndAttend);

export default router;