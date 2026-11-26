import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	bulkMarkAttendanceController,
	cancelLeaveRequestController,
	createAttendanceController,
	createHolidayController,
	createLeaveRequestController,
	deleteAttendanceController,
	deleteHolidayController,
	getAttendanceByIdController,
	getAttendanceHistoryController,
	getAttendanceSettingsController,
	getAttendancesController,
	getDayAttendanceController,
	getHolidaysController,
	getLeaveRequestsController,
	getMonthlyReportController,
	getMyLinkedStudentsController,
	getPublishedReportsController,
	getStudentCalendarController,
	publishMonthlyReportController,
	reviewLeaveRequestController,
	updateAttendanceController,
	updateAttendanceSettingsController,
} from "./controller.js";
import {
	attendanceParamsSchema,
	attendanceSchoolParamsSchema,
	bulkAttendanceSchema,
	createAttendanceSchema,
	createHolidaySchema,
	createLeaveRequestSchema,
	dayAttendanceQuerySchema,
	holidayListQuerySchema,
	leaveRequestListQuerySchema,
	monthlyReportQuerySchema,
	publishedReportsQuerySchema,
	publishMonthlyReportSchema,
	reviewLeaveRequestSchema,
	studentCalendarQuerySchema,
	updateAttendanceSchema,
	updateAttendanceSettingsSchema,
} from "./validation.js";

const router = Router();

const ALL_SCHOOL_ROLES = [
	UserRole.ADMIN,
	UserRole.MANAGER,
	UserRole.TEACHER,
	UserRole.GUARDIAN,
	UserRole.STUDENT,
] as const;

// --- Core Attendance ---

router.post(
	"/schools/:schoolId/attendances",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(createAttendanceSchema),
	createAttendanceController,
);

router.post(
	"/schools/:schoolId/attendances/bulk",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(bulkAttendanceSchema),
	bulkMarkAttendanceController,
);

router.get(
	"/schools/:schoolId/attendances/day",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(dayAttendanceQuerySchema),
	getDayAttendanceController,
);

router.get(
	"/schools/:schoolId/attendances/calendar",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(studentCalendarQuerySchema),
	getStudentCalendarController,
);

router.get(
	"/schools/:schoolId/attendances/my-students",
	authenticate,
	authorize(UserRole.GUARDIAN, UserRole.STUDENT),
	requireSchoolAccess,
	getMyLinkedStudentsController,
);

router.get(
	"/schools/:schoolId/attendances",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(attendanceSchoolParamsSchema),
	getAttendancesController,
);

router.get(
	"/schools/:schoolId/attendances/:id/history",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(attendanceParamsSchema),
	getAttendanceHistoryController,
);

router.get(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(attendanceParamsSchema),
	getAttendanceByIdController,
);

router.patch(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(updateAttendanceSchema),
	updateAttendanceController,
);

router.delete(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(attendanceParamsSchema),
	deleteAttendanceController,
);

// --- Monthly Reports ---

router.get(
	"/schools/:schoolId/attendance-reports/published",
	authenticate,
	authorize(UserRole.GUARDIAN, UserRole.STUDENT),
	requireSchoolAccess,
	validateRequest(publishedReportsQuerySchema),
	getPublishedReportsController,
);

router.get(
	"/schools/:schoolId/attendance-reports",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(monthlyReportQuerySchema),
	getMonthlyReportController,
);

router.post(
	"/schools/:schoolId/attendance-reports/publish",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(publishMonthlyReportSchema),
	publishMonthlyReportController,
);

// --- Settings & Holidays ---

router.get(
	"/schools/:schoolId/attendance-settings",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	getAttendanceSettingsController,
);

router.patch(
	"/schools/:schoolId/attendance-settings",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateAttendanceSettingsSchema),
	updateAttendanceSettingsController,
);

router.get(
	"/schools/:schoolId/holidays",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(holidayListQuerySchema),
	getHolidaysController,
);

router.post(
	"/schools/:schoolId/holidays",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createHolidaySchema),
	createHolidayController,
);

router.delete(
	"/schools/:schoolId/holidays/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(attendanceParamsSchema),
	deleteHolidayController,
);

// --- Leave Requests ---

router.post(
	"/schools/:schoolId/leave-requests",
	authenticate,
	authorize(UserRole.GUARDIAN),
	requireSchoolAccess,
	validateRequest(createLeaveRequestSchema),
	createLeaveRequestController,
);

router.get(
	"/schools/:schoolId/leave-requests",
	authenticate,
	authorize(...ALL_SCHOOL_ROLES),
	requireSchoolAccess,
	validateRequest(leaveRequestListQuerySchema),
	getLeaveRequestsController,
);

router.patch(
	"/schools/:schoolId/leave-requests/:id/cancel",
	authenticate,
	authorize(UserRole.GUARDIAN),
	requireSchoolAccess,
	validateRequest(attendanceParamsSchema),
	cancelLeaveRequestController,
);

router.patch(
	"/schools/:schoolId/leave-requests/:id/review",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(reviewLeaveRequestSchema),
	reviewLeaveRequestController,
);

export const attendanceRoutes = router;
