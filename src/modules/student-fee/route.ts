import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	bulkCreateStudentFeesController,
	createStudentFeeController,
	deleteStudentFeeController,
	getStudentFeeByIdController,
	getStudentFeesController,
	updateStudentFeeController,
} from "./controller.js";
import {
	bulkCreateStudentFeesSchema,
	createStudentFeeSchema,
	studentFeeParamsSchema,
	studentFeeSchoolParamsSchema,
	updateStudentFeeSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/student-fees/bulk",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(bulkCreateStudentFeesSchema),
	bulkCreateStudentFeesController,
);

router.post(
	"/schools/:schoolId/student-fees",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createStudentFeeSchema),
	createStudentFeeController,
);

router.get(
	"/schools/:schoolId/student-fees",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(studentFeeSchoolParamsSchema),
	getStudentFeesController,
);

router.get(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(studentFeeParamsSchema),
	getStudentFeeByIdController,
);

router.patch(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateStudentFeeSchema),
	updateStudentFeeController,
);

router.delete(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(studentFeeParamsSchema),
	deleteStudentFeeController,
);

export const studentFeeRoutes = router;
