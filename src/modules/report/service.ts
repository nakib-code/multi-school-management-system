import { prisma } from "../../lib/prisma.js";

import type { ReportOverview } from "./interface.js";

const getSchoolReports = async (): Promise<ReportOverview["schools"]> => {
	const [total, active, pending, blocked, rejected] = await Promise.all([
		prisma.school.count(),

		prisma.school.count({
			where: {
				status: "ACTIVE",
			},
		}),

		prisma.school.count({
			where: {
				status: "PENDING",
			},
		}),

		prisma.school.count({
			where: {
				status: "BLOCKED",
			},
		}),

		prisma.school.count({
			where: {
				status: "REJECTED",
			},
		}),
	]);

	return {
		total,
		active,
		pending,
		blocked,
		rejected,
	};
};

const getUserReports = async (): Promise<ReportOverview["users"]> => {
	const [total, superAdmin, admin, manager, teacher, student, guardian] =
		await Promise.all([
			prisma.user.count(),

			prisma.user.count({
				where: {
					role: "SUPER_ADMIN",
				},
			}),

			prisma.user.count({
				where: {
					role: "ADMIN",
				},
			}),

			prisma.user.count({
				where: {
					role: "MANAGER",
				},
			}),

			prisma.user.count({
				where: {
					role: "TEACHER",
				},
			}),

			prisma.user.count({
				where: {
					role: "STUDENT",
				},
			}),

			prisma.user.count({
				where: {
					role: "GUARDIAN",
				},
			}),
		]);

	return {
		total,
		superAdmin,
		admin,
		manager,
		teacher,
		student,
		guardian,
	};
};

const getSubscriptionReports = async (): Promise<
	ReportOverview["subscriptions"]
> => {
	const [total, active, pending, expired, cancelled] = await Promise.all([
		prisma.schoolSubscription.count(),

		prisma.schoolSubscription.count({
			where: {
				status: "ACTIVE",
			},
		}),

		prisma.schoolSubscription.count({
			where: {
				status: "PENDING",
			},
		}),

		prisma.schoolSubscription.count({
			where: {
				status: "EXPIRED",
			},
		}),

		prisma.schoolSubscription.count({
			where: {
				status: "CANCELLED",
			},
		}),
	]);

	return {
		total,
		active,
		pending,
		expired,
		cancelled,
	};
};

const getPaymentReports = async (): Promise<ReportOverview["payments"]> => {
	const [
		totalPayments,
		verifiedPayments,
		pendingPayments,
		rejectedPayments,
		verifiedAmount,
		bkashAmount,
		nagadAmount,
		rocketAmount,
		pendingAmount,
	] = await Promise.all([
		prisma.subscriptionPayment.count(),

		prisma.subscriptionPayment.count({
			where: {
				status: "VERIFIED",
			},
		}),

		prisma.subscriptionPayment.count({
			where: {
				status: "PENDING",
			},
		}),

		prisma.subscriptionPayment.count({
			where: {
				status: "REJECTED",
			},
		}),

		prisma.subscriptionPayment.aggregate({
			_sum: {
				paidAmount: true,
			},
			where: {
				status: "VERIFIED",
			},
		}),

		prisma.subscriptionPayment.aggregate({
			_sum: {
				paidAmount: true,
			},
			where: {
				status: "VERIFIED",
				paymentMethod: "BKASH",
			},
		}),

		prisma.subscriptionPayment.aggregate({
			_sum: {
				paidAmount: true,
			},
			where: {
				status: "VERIFIED",
				paymentMethod: "NAGAD",
			},
		}),

		prisma.subscriptionPayment.aggregate({
			_sum: {
				paidAmount: true,
			},
			where: {
				status: "VERIFIED",
				paymentMethod: "ROCKET",
			},
		}),

		prisma.subscriptionPayment.aggregate({
			_sum: {
				paidAmount: true,
			},
			where: {
				status: "PENDING",
			},
		}),
	]);

	return {
		totalRevenue: Number(verifiedAmount._sum.paidAmount ?? 0),
		bkashRevenue: Number(bkashAmount._sum.paidAmount ?? 0),
		nagadRevenue: Number(nagadAmount._sum.paidAmount ?? 0),
		rocketRevenue: Number(rocketAmount._sum.paidAmount ?? 0),
		pendingAmount: Number(pendingAmount._sum.paidAmount ?? 0),
		totalPayments,
		verifiedPayments,
		pendingPayments,
		rejectedPayments,
	};
};

const getPackageReports = async (): Promise<ReportOverview["packages"]> => {
	const [total, active, inactive] = await Promise.all([
		prisma.package.count(),

		prisma.package.count({
			where: {
				isActive: true,
			},
		}),

		prisma.package.count({
			where: {
				isActive: false,
			},
		}),
	]);

	return {
		total,
		active,
		inactive,
	};
};

export const getReportOverview = async (): Promise<ReportOverview> => {
	const [schools, users, subscriptions, payments, packages] = await Promise.all(
		[
			getSchoolReports(),
			getUserReports(),
			getSubscriptionReports(),
			getPaymentReports(),
			getPackageReports(),
		],
	);

	return {
		schools,
		users,
		subscriptions,
		payments,
		packages,
	};
};

export const getSchoolReportOverview = async (schoolId: number) => {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [
		feeRows,
		pendingStudentPayments,
		salaryRows,
		activeStudents,
		activeTeachers,
		activeClasses,
		totalExams,
		totalResults,
		totalAttendance30d,
		presentAttendance30d,
		totalAdmissions,
		pendingAdmissions,
		approvedAdmissions,
		rejectedAdmissions,
	] = await Promise.all([
		prisma.studentFee.findMany({
			where: { schoolId },
			select: {
				amount: true,
				status: true,
				payments: {
					where: { status: "VERIFIED" },
					select: { paidAmount: true },
				},
			},
		}),
		prisma.studentPayment.count({
			where: { schoolId, status: "PENDING" },
		}),
		prisma.teacherSalary.findMany({
			where: { schoolId },
			select: { netSalary: true, status: true },
		}),
		prisma.student.count({ where: { schoolId, isActive: true } }),
		prisma.teacher.count({ where: { schoolId, isActive: true } }),
		prisma.schoolClass.count({ where: { schoolId, isActive: true } }),
		prisma.exam.count({ where: { schoolId } }),
		prisma.result.count({ where: { schoolId } }),
		prisma.attendance.count({
			where: { schoolId, date: { gte: thirtyDaysAgo } },
		}),
		prisma.attendance.count({
			where: {
				schoolId,
				date: { gte: thirtyDaysAgo },
				status: { in: ["PRESENT", "LATE"] },
			},
		}),
		prisma.admission.count({ where: { schoolId } }),
		prisma.admission.count({ where: { schoolId, status: "PENDING" } }),
		prisma.admission.count({ where: { schoolId, status: "APPROVED" } }),
		prisma.admission.count({ where: { schoolId, status: "REJECTED" } }),
	]);

	let totalBilled = 0;
	let totalCollected = 0;
	let totalDue = 0;
	let paidFeeCount = 0;
	let partialFeeCount = 0;
	let unpaidFeeCount = 0;

	for (const fee of feeRows) {
		const net = Math.max(0, Number(fee.amount));
		const paid =
			fee.status === "PAID"
				? net
				: fee.payments.reduce((pSum, p) => pSum + Number(p.paidAmount), 0);
		totalBilled += net;
		totalCollected += Math.min(net, paid);
		totalDue += fee.status === "WAIVED" ? 0 : Math.max(0, net - paid);
		if (fee.status === "PAID") paidFeeCount += 1;
		else if (fee.status === "PARTIAL") partialFeeCount += 1;
		else if (fee.status === "PENDING") unpaidFeeCount += 1;
	}

	let totalPayrollGross = 0;
	let totalPayrollPaid = 0;
	let totalPayrollPending = 0;
	let paidSalaryCount = 0;
	let unpaidSalaryCount = 0;

	for (const sal of salaryRows) {
		const amt = Number(sal.netSalary);
		totalPayrollGross += amt;
		if (sal.status === "PAID") {
			totalPayrollPaid += amt;
			paidSalaryCount += 1;
		} else {
			totalPayrollPending += amt;
			unpaidSalaryCount += 1;
		}
	}

	const attendanceRate30d =
		totalAttendance30d > 0
			? Math.round((presentAttendance30d / totalAttendance30d) * 1000) / 10
			: 0;

	return {
		fees: {
			totalBilled,
			totalCollected,
			totalDue,
			paidCount: paidFeeCount,
			partialCount: partialFeeCount,
			unpaidCount: unpaidFeeCount,
			pendingVerifications: pendingStudentPayments,
		},
		payroll: {
			totalRecords: salaryRows.length,
			totalGross: totalPayrollGross,
			totalPaid: totalPayrollPaid,
			totalPending: totalPayrollPending,
			paidCount: paidSalaryCount,
			unpaidCount: unpaidSalaryCount,
		},
		academics: {
			activeStudents,
			activeTeachers,
			activeClasses,
			totalExams,
			totalResults,
			totalAttendance30d,
			presentAttendance30d,
			attendanceRate30d,
		},
		admissions: {
			total: totalAdmissions,
			pending: pendingAdmissions,
			approved: approvedAdmissions,
			rejected: rejectedAdmissions,
		},
	};
};
