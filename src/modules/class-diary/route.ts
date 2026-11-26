import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createClassDiaryController,
	deleteClassDiaryController,
	getClassDiariesController,
	getClassDiaryByIdController,
	updateClassDiaryController,
} from "./controller.js";
import {
	classDiaryIdParamsSchema,
	classDiaryListQuerySchema,
	createClassDiarySchema,
	updateClassDiarySchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/class-diaries",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(createClassDiarySchema),
	createClassDiaryController,
);

router.get(
	"/schools/:schoolId/class-diaries",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(classDiaryListQuerySchema),
	getClassDiariesController,
);

router.get(
	"/schools/:schoolId/class-diaries/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(classDiaryIdParamsSchema),
	getClassDiaryByIdController,
);

router.patch(
	"/schools/:schoolId/class-diaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(updateClassDiarySchema),
	updateClassDiaryController,
);

router.delete(
	"/schools/:schoolId/class-diaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(classDiaryIdParamsSchema),
	deleteClassDiaryController,
);

export const classDiaryRoutes = router;
