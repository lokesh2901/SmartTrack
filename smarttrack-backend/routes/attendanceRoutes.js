import express from 'express';
// Assuming verifyToken is your custom middleware that handles authentication AND optional roles
import { verifyToken } from '../middleware/authMiddleware.js'; 
import {
    checkin,
    checkout,
    getCurrentAttendanceStatus,
    getAttendanceLogs, 
    exportMyAttendance, 
    exportAllAttendance,
    exportDailyAttendance,
    // ⭐ NEW ADDITION: Import the function for all employees' status
getEmployeesStatusByDate} from '../controllers/attendanceController.js';

const router = express.Router();

// --- EMPLOYEE ATTENDANCE & STATUS ---

// POST /api/attendance/checkin
router.post('/checkin', verifyToken(), checkin);

// POST /api/attendance/checkout
router.post('/checkout', verifyToken(), checkout);

// GET /api/attendance/status (Check if currently checked in/out for current user)
router.get('/status', verifyToken(), getCurrentAttendanceStatus);

// GET /api/attendance/logs?date=YYYY-MM-DD (Daily Summary/Segment View for Frontend)
router.get('/logs', verifyToken(), getAttendanceLogs);


// --- HR/ADMIN ROUTES ---

// ⭐ NEW ROUTE: GET /api/attendance/status/all (Get current day status for all employees)
router.get('/status/all', verifyToken(['hr', 'admin']), getEmployeesStatusByDate);


// --- EXPORT ROUTES ---

// GET /api/attendance/export/mine?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/export/mine', verifyToken(['employee', 'hr', 'admin']), exportMyAttendance);

// GET /api/attendance/export-daily?date=YYYY-MM-DD
router.get('/export-daily', verifyToken(['employee', 'hr', 'admin']), exportDailyAttendance);

// GET /api/attendance/export/all (HR/Admin downloads filtered logs)
router.get('/export/all', verifyToken(['hr', 'admin']), exportAllAttendance);


export default router;
