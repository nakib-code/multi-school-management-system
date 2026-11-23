import type { UserRole } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

/**
 * For STUDENT returns [ownStudentId].
 * For GUARDIAN returns linked studentIds.
 * For ADMIN / MANAGER / TEACHER returns null (unrestricted within school).
 */
export async function resolveScopedStudentIds(
	schoolId: number,
	user: { userId: number; role: UserRole },
): Promise<number[] | null> {
	if (user.role === "STUDENT") {
		const student = await prisma.student.findFirst({
			where: { userId: user.userId, schoolId },
			select: { id: true },
		});
		return student ? [student.id] : [];
	}

	if (user.role === "GUARDIAN") {
		const guardian = await prisma.guardian.findFirst({
			where: { userId: user.userId, schoolId },
			select: {
				students: { select: { studentId: true } },
			},
		});
		return guardian ? guardian.students.map((s) => s.studentId) : [];
	}

	return null;
}

/**
 * For TEACHER returns own teacherId (or -1 if not found).
 * For ADMIN / MANAGER returns null (unrestricted within school).
 */
export async function resolveScopedTeacherId(
	schoolId: number,
	user: { userId: number; role: UserRole },
): Promise<number | null> {
	if (user.role === "TEACHER") {
		const teacher = await prisma.teacher.findFirst({
			where: { userId: user.userId, schoolId },
			select: { id: true },
		});
		return teacher ? teacher.id : -1;
	}
	return null;
}
