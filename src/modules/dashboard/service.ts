import {
	AdmissionPaymentStatus,
	PaymentMethod,
	PaymentStatus,
	SalaryPaymentMethod,
	SalaryPaymentStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import {
	getCurrentDhakaMonth,
	getDhakaDayRange,
	getDhakaStartOfToday,
	getTodayDhakaDateKey,
	resolveMonthOrCustomDateRange,
	roundMoney,
} from "../../utils/dhakaDate.js";
import { computeFeeFinancials } from "../student-fee/service.js";

type DashboardRole =
	| "SUPER_ADMIN"
	| "ADMIN"
	| "MANAGER"
	| "TEACHER"
	| "STUDENT"
	| "GUARDIAN";

interface DashboardUser {
	userId: number;
	role: DashboardRole;
	schoolId?: number;
}

const getSuperAdminDashboard = async () => {
	const [
		totalSchools,
		pendingSchools,
		activeSchools,
		blockedSchools,
		rejectedSchools,
	] = await Promise.all([
		prisma.school.count(),
		prisma.school.count({ where: { status: "PENDING" } }),
		prisma.school.count({ where: { status: "ACTIVE" } }),
		prisma.school.count({ where: { status: "BLOCKED" } }),
		prisma.school.count({ where: { status: "REJECTED" } }),
	]);

	return {
		role: "SUPER_ADMIN" as const,
		stats: {
			totalSchools,
			pendingSchools,
			activeSchools,
			blockedSchools,
			rejectedSchools,
		},
	};
};

const getSchoolDashboard = async (user: DashboardUser) => {
	if (!user.schoolId) {
		throw new Error("School information not found");
	}

	const schoolId = user.schoolId;
	const currentMonth = getCurrentDhakaMonth();
	const todayKey = getTodayDhakaDateKey();
	const { rangeStart: monthStart, rangeEnd: monthEnd } =
		resolveMonthOrCustomDateRange(currentMonth);
	const { start: todayStart, end: todayEnd } = getDhakaDayRange(todayKey);
	const dhakaStartOfToday = getDhakaStartOfToday();

	const [
		totalStudents,
		totalTeachers,
		totalManagers,
		totalClasses,
		totalSections,
		totalSubjects,
		monthStudentPayments,
		monthAdmissionPayments,
		monthManualIncome,
		monthCustomExpenses,
		monthSalaryPayments,
		todayCashStudentPayments,
		todayCashAdmissionPayments,
		todayCashManualIncome,
		todayCashCustomExpenses,
		todayCashSalaryPayments,
		pendingPaymentVerifications,
		overdueFeesCount,
	] = await Promise.all([
		prisma.student.count({ where: { schoolId } }),
		prisma.teacher.count({ where: { schoolId } }),
		prisma.manager.count({ where: { schoolId } }),
		prisma.schoolClass.count({ where: { schoolId } }),
		prisma.section.count({ where: { schoolId } }),
		prisma.subject.count({ where: { schoolId } }),
		prisma.studentPayment.aggregate({
			where: {
				schoolId,
				status: PaymentStatus.VERIFIED,
				paidAt: { gte: monthStart, lte: monthEnd },
			},
			_sum: { paidAmount: true },
		}),
		prisma.admissionPayment.aggregate({
			where: {
				schoolId,
				status: AdmissionPaymentStatus.PAID,
				studentFee: { is: null },
				OR: [
					{ paidAt: { gte: monthStart, lte: monthEnd } },
					{ paidAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
				],
			},
			_sum: { amount: true },
		}),
		prisma.incomeEntry.aggregate({
			where: {
				schoolId,
				incomeDate: { gte: monthStart, lte: monthEnd },
			},
			_sum: { amount: true },
		}),
		prisma.customExpenseEntry.aggregate({
			where: {
				schoolId,
				billingMonth: currentMonth,
			},
			_sum: { amount: true },
		}),
		prisma.salaryPayment.aggregate({
			where: {
				schoolId,
				status: SalaryPaymentStatus.COMPLETED,
				paidAt: { gte: monthStart, lte: monthEnd },
			},
			_sum: { amount: true },
		}),
		prisma.studentPayment.aggregate({
			where: {
				schoolId,
				status: PaymentStatus.VERIFIED,
				paymentMethod: PaymentMethod.CASH,
				paidAt: { gte: todayStart, lte: todayEnd },
			},
			_sum: { paidAmount: true },
		}),
		prisma.admissionPayment.aggregate({
			where: {
				schoolId,
				status: AdmissionPaymentStatus.PAID,
				paymentMethod: "CASH",
				studentFee: { is: null },
				OR: [
					{ paidAt: { gte: todayStart, lte: todayEnd } },
					{ paidAt: null, createdAt: { gte: todayStart, lte: todayEnd } },
				],
			},
			_sum: { amount: true },
		}),
		prisma.incomeEntry.aggregate({
			where: {
				schoolId,
				paymentMethod: PaymentMethod.CASH,
				incomeDate: { gte: todayStart, lte: todayEnd },
			},
			_sum: { amount: true },
		}),
		prisma.customExpenseEntry.aggregate({
			where: {
				schoolId,
				paymentMethod: PaymentMethod.CASH,
				entryDate: { gte: todayStart, lte: todayEnd },
			},
			_sum: { amount: true },
		}),
		prisma.salaryPayment.aggregate({
			where: {
				schoolId,
				status: SalaryPaymentStatus.COMPLETED,
				paymentMethod: SalaryPaymentMethod.CASH,
				paidAt: { gte: todayStart, lte: todayEnd },
			},
			_sum: { amount: true },
		}),
		prisma.studentPayment.count({
			where: { schoolId, status: PaymentStatus.PENDING },
		}),
		prisma.studentFee.count({
			where: {
				schoolId,
				OR: [
					{ status: "OVERDUE" },
					{
						status: { in: ["PENDING", "PARTIAL"] },
						dueDate: { lt: dhakaStartOfToday },
					},
				],
			},
		}),
	]);

	const monthlyIncome = roundMoney(
		Number(monthStudentPayments._sum.paidAmount ?? 0) +
			Number(monthAdmissionPayments._sum.amount ?? 0) +
			Number(monthManualIncome._sum.amount ?? 0),
	);
	const monthlyCustomExpense = roundMoney(
		Number(monthCustomExpenses._sum.amount ?? 0),
	);
	const monthlyPayrollExpense = roundMoney(
		Number(monthSalaryPayments._sum.amount ?? 0),
	);
	const monthlyTotalExpense = roundMoney(
		monthlyCustomExpense + monthlyPayrollExpense,
	);
	const monthlyNetBalance = roundMoney(monthlyIncome - monthlyTotalExpense);

	const todayCashCollected = roundMoney(
		Number(todayCashStudentPayments._sum.paidAmount ?? 0) +
			Number(todayCashAdmissionPayments._sum.amount ?? 0) +
			Number(todayCashManualIncome._sum.amount ?? 0),
	);
	const todayCashSpent = roundMoney(
		Number(todayCashCustomExpenses._sum.amount ?? 0) +
			Number(todayCashSalaryPayments._sum.amount ?? 0),
	);
	const todayCashInHand = roundMoney(todayCashCollected - todayCashSpent);

	return {
		role: user.role,
		stats: {
			totalStudents,
			totalTeachers,
			totalManagers,
			totalClasses,
			totalSections,
			totalSubjects,
		},
		finance: {
			billingMonth: currentMonth,
			todayDate: todayKey,
			monthlyIncome,
			monthlyCustomExpense,
			monthlyPayrollExpense,
			monthlyTotalExpense,
			monthlyNetBalance,
			monthlyStatus:
				monthlyNetBalance >= 0 ? ("SURPLUS" as const) : ("DEFICIT" as const),
			todayCashCollected,
			todayCashSpent,
			todayCashInHand,
			pendingPaymentVerifications,
			overdueFeesCount,
		},
	};
};

const getTeacherDashboard = async (user: DashboardUser) => {
	if (!user.schoolId) {
		throw new Error("School information not found");
	}

	const schoolId = user.schoolId;
	const teacher = await prisma.teacher.findFirst({
		where: { userId: user.userId, schoolId },
		select: { id: true },
	});

	if (!teacher) {
		return {
			role: user.role,
			stats: {
				assignedClasses: 0,
				assignedStudents: 0,
				hefzStudents: 0,
				pendingLeaveRequests: 0,
				todayMarkedAttendance: 0,
			},
		};
	}

	const assignments = await prisma.teacherAssignment.findMany({
		where: { schoolId, teacherId: teacher.id },
		select: { classId: true, sectionId: true },
	});

	const classIds = [...new Set(assignments.map((a) => a.classId))];
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);

	const [
		assignedStudents,
		hefzStudents,
		pendingLeaveRequests,
		todayMarkedAttendance,
	] = await Promise.all([
		classIds.length > 0
			? prisma.enrollment.count({
					where: {
						schoolId,
						status: "ACTIVE",
						classId: { in: classIds },
					},
				})
			: Promise.resolve(0),
		prisma.hefzEnrollment.count({
			where: { schoolId, ustadId: teacher.id, status: "ACTIVE" },
		}),
		classIds.length > 0
			? prisma.leaveRequest.count({
					where: {
						schoolId,
						status: "PENDING",
						student: {
							enrollments: {
								some: { status: "ACTIVE", classId: { in: classIds } },
							},
						},
					},
				})
			: Promise.resolve(0),
		prisma.attendance.count({
			where: {
				schoolId,
				markedBy: user.userId,
				date: { gte: today },
			},
		}),
	]);

	return {
		role: user.role,
		stats: {
			assignedClasses: classIds.length,
			assignedStudents,
			hefzStudents,
			pendingLeaveRequests,
			todayMarkedAttendance,
		},
	};
};

const getStudentDashboard = async (user: DashboardUser) => {
	if (!user.schoolId) {
		throw new Error("School information not found");
	}

	const schoolId = user.schoolId;
	const student = await prisma.student.findFirst({
		where: { userId: user.userId, schoolId },
		select: { id: true },
	});

	if (!student) {
		return {
			role: user.role,
			stats: {
				attendanceTotal30d: 0,
				attendancePresent30d: 0,
				unpaidFees: 0,
				totalResults: 0,
				unreadNotifications: 0,
			},
		};
	}

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [
		attendanceTotal30d,
		attendancePresent30d,
		unpaidFeeRows,
		totalResults,
		unreadNotifications,
	] = await Promise.all([
		prisma.attendance.count({
			where: { schoolId, studentId: student.id, date: { gte: thirtyDaysAgo } },
		}),
		prisma.attendance.count({
			where: {
				schoolId,
				studentId: student.id,
				date: { gte: thirtyDaysAgo },
				status: { in: ["PRESENT", "LATE"] },
			},
		}),
		prisma.studentFee.findMany({
			where: {
				schoolId,
				studentId: student.id,
				status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
			},
			select: {
				amount: true,
				waivedAmount: true,
				status: true,
				dueDate: true,
				payments: {
					where: { status: "VERIFIED" },
					select: { paidAmount: true },
				},
			},
		}),
		prisma.result.count({
			where: { schoolId, studentId: student.id },
		}),
		prisma.notification.count({
			where: { recipientId: user.userId, isRead: false },
		}),
	]);

	const now = new Date();
	const unpaidFees = unpaidFeeRows.filter(
		(fee) => computeFeeFinancials(fee, now).due > 0,
	).length;

	return {
		role: user.role,
		stats: {
			attendanceTotal30d,
			attendancePresent30d,
			unpaidFees,
			totalResults,
			unreadNotifications,
		},
	};
};

const getGuardianDashboard = async (user: DashboardUser) => {
	if (!user.schoolId) {
		throw new Error("School information not found");
	}

	const schoolId = user.schoolId;
	const guardian = await prisma.guardian.findFirst({
		where: { userId: user.userId, schoolId },
		select: {
			id: true,
			students: { select: { studentId: true } },
		},
	});

	const studentIds = guardian?.students.map((s) => s.studentId) ?? [];

	if (studentIds.length === 0) {
		const unreadNotifications = await prisma.notification.count({
			where: { recipientId: user.userId, isRead: false },
		});
		return {
			role: user.role,
			stats: {
				linkedChildren: 0,
				unpaidFees: 0,
				totalDueAmount: 0,
				pendingLeaveRequests: 0,
				unreadNotifications,
			},
		};
	}

	const [unpaidFeeRows, pendingLeaveRequests, unreadNotifications] =
		await Promise.all([
			prisma.studentFee.findMany({
				where: {
					schoolId,
					studentId: { in: studentIds },
					status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
				},
				select: {
					amount: true,
					waivedAmount: true,
					status: true,
					dueDate: true,
					payments: {
						where: { status: "VERIFIED" },
						select: { paidAmount: true },
					},
				},
			}),
			prisma.leaveRequest.count({
				where: {
					schoolId,
					studentId: { in: studentIds },
					status: "PENDING",
				},
			}),
			prisma.notification.count({
				where: { recipientId: user.userId, isRead: false },
			}),
		]);

	const now = new Date();
	let unpaidFees = 0;
	let totalDueAmount = 0;
	for (const fee of unpaidFeeRows) {
		const fin = computeFeeFinancials(fee, now);
		if (fin.due > 0) {
			unpaidFees += 1;
			totalDueAmount = roundMoney(totalDueAmount + fin.due);
		}
	}

	return {
		role: user.role,
		stats: {
			linkedChildren: studentIds.length,
			unpaidFees,
			totalDueAmount,
			pendingLeaveRequests,
			unreadNotifications,
		},
	};
};

export const getDashboard = async (user: DashboardUser) => {
	switch (user.role) {
		case "SUPER_ADMIN":
			return getSuperAdminDashboard();

		case "ADMIN":
		case "MANAGER":
			return getSchoolDashboard(user);

		case "TEACHER":
			return getTeacherDashboard(user);

		case "STUDENT":
			return getStudentDashboard(user);

		case "GUARDIAN":
			return getGuardianDashboard(user);

		default:
			return {
				role: user.role,
				stats: {},
			};
	}
};
