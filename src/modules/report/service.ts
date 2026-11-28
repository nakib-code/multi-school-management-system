import {
	type AdmissionPaymentStatus,
	type AdmissionStatus,
	type EnrollmentStatus,
	FeeStatus,
	type FeeType,
	PaymentStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import {
	getDhakaStartOfToday,
	roundMoney,
	toDhakaDateKey,
} from "../../utils/dhakaDate.js";
import { computeFeeFinancials } from "../student-fee/service.js";

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
		admissionPayments,
	] = await Promise.all([
		prisma.studentFee.findMany({
			where: { schoolId },
			select: {
				feeType: true,
				amount: true,
				waivedAmount: true,
				dueDate: true,
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
		prisma.admissionPayment.findMany({
			where: { schoolId },
			select: {
				amount: true,
				status: true,
				admission: { select: { status: true } },
				studentFee: { select: { id: true } },
			},
		}),
	]);

	let totalBilled = 0;
	let totalCollected = 0;
	let totalDue = 0;
	let totalWaived = 0;
	let paidFeeCount = 0;
	let partialFeeCount = 0;
	let unpaidFeeCount = 0;

	const feeTypeMap = new Map<
		FeeType,
		{
			feeType: FeeType;
			count: number;
			billed: number;
			collected: number;
			due: number;
			waived: number;
		}
	>();

	const now = new Date();
	for (const fee of feeRows) {
		const fin = computeFeeFinancials(fee, now);
		const isFullyWaivedWithoutPayment =
			fin.effectiveStatus === FeeStatus.WAIVED && fin.paid === 0;

		if (!isFullyWaivedWithoutPayment) {
			totalBilled = roundMoney(totalBilled + fin.billed);
			totalCollected = roundMoney(totalCollected + fin.paid);
			totalDue = roundMoney(totalDue + fin.due);
		}
		if (fin.waived > 0) {
			totalWaived = roundMoney(totalWaived + fin.waived);
		}

		if (fin.effectiveStatus === FeeStatus.PAID) paidFeeCount += 1;
		else if (fin.effectiveStatus === FeeStatus.PARTIAL) partialFeeCount += 1;
		else if (
			fin.effectiveStatus === FeeStatus.PENDING ||
			fin.effectiveStatus === FeeStatus.OVERDUE
		) {
			unpaidFeeCount += 1;
		}

		const bucket = feeTypeMap.get(fee.feeType) ?? {
			feeType: fee.feeType,
			count: 0,
			billed: 0,
			collected: 0,
			due: 0,
			waived: 0,
		};
		bucket.count += 1;
		if (!isFullyWaivedWithoutPayment) {
			bucket.billed = roundMoney(bucket.billed + fin.billed);
			bucket.collected = roundMoney(bucket.collected + fin.paid);
			bucket.due = roundMoney(bucket.due + fin.due);
		}
		if (fin.waived > 0) {
			bucket.waived = roundMoney(bucket.waived + fin.waived);
		}
		feeTypeMap.set(fee.feeType, bucket);
	}

	let admissionTotalExpected = 0;
	let admissionCollectedVerified = 0;
	let admissionPendingPayment = 0;
	let admissionUnlinkedCollected = 0;

	for (const ap of admissionPayments) {
		const amt = Math.max(0, Number(ap.amount));
		const isRejectedAdmission = ap.admission?.status === "REJECTED";
		if (ap.status === "PAID") {
			admissionTotalExpected += amt;
			admissionCollectedVerified += amt;
			if (!ap.studentFee) {
				admissionUnlinkedCollected += amt;
			}
		} else if (
			!isRejectedAdmission &&
			(ap.status === "PENDING" || ap.status === "FAILED")
		) {
			admissionTotalExpected += amt;
			admissionPendingPayment += amt;
		}
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
			totalWaived,
			paidCount: paidFeeCount,
			partialCount: partialFeeCount,
			unpaidCount: unpaidFeeCount,
			pendingVerifications: pendingStudentPayments,
			byFeeType: [...feeTypeMap.values()],
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
			totalExpected: admissionTotalExpected,
			collectedVerified: admissionCollectedVerified,
			pendingPayment: admissionPendingPayment,
			unlinkedCollected: admissionUnlinkedCollected,
		},
	};
};

// ======================================================
// CLASS-WISE CHARTS & ACCOUNTING REPORTS (ADMIN/MANAGER)
// ======================================================

const getSchoolHeaderInfo = async (schoolId: number) => {
	return prisma.school.findUnique({
		where: { id: schoolId },
		select: {
			id: true,
			name: true,
			code: true,
			logo: true,
			address: true,
			phone: true,
			email: true,
		},
	});
};

export interface AdmissionChartFilter {
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	status?: AdmissionStatus;
	paymentStatus?: AdmissionPaymentStatus;
}

export const getAdmissionChartReport = async (
	schoolId: number,
	query: AdmissionChartFilter = {},
) => {
	const [school, admissions] = await Promise.all([
		getSchoolHeaderInfo(schoolId),
		prisma.admission.findMany({
			where: {
				schoolId,
				...(query.classId !== undefined ? { classId: query.classId } : {}),
				...(query.sectionId !== undefined
					? { sectionId: query.sectionId }
					: {}),
				...(query.academicYear !== undefined
					? { academicYear: query.academicYear }
					: {}),
				...(query.status !== undefined ? { status: query.status } : {}),
				...(query.paymentStatus !== undefined
					? { payment: { is: { status: query.paymentStatus } } }
					: {}),
			},
			select: {
				id: true,
				applicationNo: true,
				studentName: true,
				nameBangla: true,
				guardianName: true,
				guardianPhone: true,
				academicYear: true,
				status: true,
				createdAt: true,
				class: { select: { id: true, name: true, code: true } },
				section: { select: { id: true, name: true } },
				payment: {
					select: {
						amount: true,
						paymentMethod: true,
						status: true,
						transactionId: true,
						senderNumber: true,
						paidAt: true,
					},
				},
			},
			orderBy: [{ class: { name: "asc" } }, { createdAt: "asc" }],
		}),
	]);

	let approvedCount = 0;
	let pendingCount = 0;
	let rejectedCount = 0;
	let totalExpected = 0;
	let totalCollected = 0;
	let totalPending = 0;
	let paidCount = 0;
	let unpaidCount = 0;

	const rows = admissions.map((adm, idx) => {
		const fee = adm.payment ? Number(adm.payment.amount) : 0;
		const payStatus = adm.payment?.status ?? (fee > 0 ? "PENDING" : "NONE");

		if (adm.status === "APPROVED") approvedCount += 1;
		else if (adm.status === "REJECTED") rejectedCount += 1;
		else pendingCount += 1;

		if (adm.payment && adm.payment.status !== "CANCELLED") {
			if (adm.payment.status === "PAID") {
				totalExpected += fee;
				totalCollected += fee;
				paidCount += 1;
			} else if (adm.status !== "REJECTED") {
				totalExpected += fee;
				totalPending += fee;
				unpaidCount += 1;
			}
		}

		return {
			serial: idx + 1,
			id: adm.id,
			applicationNo: adm.applicationNo,
			studentName: adm.studentName,
			nameBangla: adm.nameBangla,
			guardianName: adm.guardianName,
			guardianPhone: adm.guardianPhone,
			classId: adm.class.id,
			className: adm.class.name,
			sectionName: adm.section?.name ?? null,
			academicYear: adm.academicYear,
			admissionFee: fee,
			paymentMethod: adm.payment?.paymentMethod ?? null,
			trxId: adm.payment?.transactionId ?? null,
			senderNumber: adm.payment?.senderNumber ?? null,
			paymentStatus: payStatus,
			admissionStatus: adm.status,
			createdAt: adm.createdAt,
		};
	});

	return {
		school,
		filters: query,
		rows,
		summary: {
			totalApplicants: rows.length,
			approvedCount,
			pendingCount,
			rejectedCount,
			totalExpected,
			totalCollected,
			totalPending,
			paidCount,
			unpaidCount,
		},
	};
};

export interface FeeChartFilter {
	feeType?: "ALL" | FeeType;
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	billingMonth?: string;
	examId?: number;
	status?: FeeStatus;
}

export const getFeeChartReport = async (
	schoolId: number,
	query: FeeChartFilter = {},
) => {
	const hasEnrollmentFilter =
		query.classId !== undefined ||
		query.sectionId !== undefined ||
		query.academicYear !== undefined;

	const dhakaTodayStart = getDhakaStartOfToday();
	const feeStatusWhere =
		query.status === FeeStatus.OVERDUE
			? {
					OR: [
						{ status: FeeStatus.OVERDUE },
						{
							status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
							dueDate: { lt: dhakaTodayStart },
						},
					],
				}
			: query.status !== undefined
				? { status: query.status }
				: {};

	const [school, fees] = await Promise.all([
		getSchoolHeaderInfo(schoolId),
		prisma.studentFee.findMany({
			where: {
				schoolId,
				...(query.feeType !== undefined && query.feeType !== "ALL"
					? { feeType: query.feeType }
					: {}),
				...(query.billingMonth !== undefined
					? { billingMonth: query.billingMonth }
					: {}),
				...(query.examId !== undefined ? { examId: query.examId } : {}),
				...feeStatusWhere,
				...(hasEnrollmentFilter
					? {
							enrollment: {
								...(query.classId !== undefined
									? { classId: query.classId }
									: {}),
								...(query.sectionId !== undefined
									? { sectionId: query.sectionId }
									: {}),
								...(query.academicYear !== undefined
									? { academicYear: query.academicYear }
									: {}),
							},
						}
					: {}),
			},
			select: {
				id: true,
				feeType: true,
				title: true,
				amount: true,
				grossAmount: true,
				concessionAmount: true,
				concessionType: true,
				waivedAmount: true,
				waiverReason: true,
				dueDate: true,
				status: true,
				academicYear: true,
				billingMonth: true,
				exam: { select: { id: true, name: true } },
				student: {
					select: {
						id: true,
						studentId: true,
						firstName: true,
						lastName: true,
					},
				},
				enrollment: {
					select: {
						rollNumber: true,
						academicYear: true,
						class: { select: { id: true, name: true, code: true } },
						section: { select: { id: true, name: true } },
					},
				},
				payments: {
					where: { status: "VERIFIED" },
					select: { paidAmount: true },
				},
			},
		}),
	]);

	fees.sort((a, b) => {
		const classCmp = a.enrollment.class.name.localeCompare(
			b.enrollment.class.name,
		);
		if (classCmp !== 0) return classCmp;
		const rollA = a.enrollment.rollNumber ?? Number.MAX_SAFE_INTEGER;
		const rollB = b.enrollment.rollNumber ?? Number.MAX_SAFE_INTEGER;
		if (rollA !== rollB) return rollA - rollB;
		const nameA = `${a.student.firstName} ${a.student.lastName ?? ""}`.trim();
		const nameB = `${b.student.firstName} ${b.student.lastName ?? ""}`.trim();
		const nameCmp = nameA.localeCompare(nameB);
		if (nameCmp !== 0) return nameCmp;
		return a.dueDate.getTime() - b.dueDate.getTime();
	});

	let totalBilled = 0;
	let totalCollected = 0;
	let totalDue = 0;
	let totalWaived = 0;
	let paidCount = 0;
	let partialCount = 0;
	let pendingCount = 0;
	let overdueCount = 0;
	let waivedCount = 0;

	const byFeeTypeMap = new Map<
		FeeType,
		{
			feeType: FeeType;
			count: number;
			billed: number;
			collected: number;
			due: number;
			waived: number;
		}
	>();

	const now = new Date();
	const evaluatedFees = fees
		.map((fee) => ({
			fee,
			fin: computeFeeFinancials(fee, now),
		}))
		.filter(({ fin }) => {
			if (query.status === FeeStatus.OVERDUE) return fin.isOverdue;
			if (
				query.status === FeeStatus.PENDING ||
				query.status === FeeStatus.PARTIAL
			) {
				return fin.effectiveStatus === query.status;
			}
			return true;
		});

	const rows = evaluatedFees.map(({ fee, fin }, idx) => {
		const isFullyWaivedWithoutPayment =
			fin.effectiveStatus === FeeStatus.WAIVED && fin.paid === 0;

		if (!isFullyWaivedWithoutPayment) {
			totalBilled = roundMoney(totalBilled + fin.billed);
			totalCollected = roundMoney(totalCollected + fin.paid);
			totalDue = roundMoney(totalDue + fin.due);
		}
		if (fin.waived > 0) {
			totalWaived = roundMoney(totalWaived + fin.waived);
		}

		if (fin.effectiveStatus === FeeStatus.PAID) paidCount += 1;
		else if (fin.effectiveStatus === FeeStatus.PARTIAL) partialCount += 1;
		else if (fin.effectiveStatus === FeeStatus.WAIVED) waivedCount += 1;
		else if (fin.effectiveStatus === FeeStatus.OVERDUE) overdueCount += 1;
		else pendingCount += 1;

		const bucket = byFeeTypeMap.get(fee.feeType) ?? {
			feeType: fee.feeType,
			count: 0,
			billed: 0,
			collected: 0,
			due: 0,
			waived: 0,
		};
		bucket.count += 1;
		if (!isFullyWaivedWithoutPayment) {
			bucket.billed = roundMoney(bucket.billed + fin.billed);
			bucket.collected = roundMoney(bucket.collected + fin.paid);
			bucket.due = roundMoney(bucket.due + fin.due);
		}
		if (fin.waived > 0) {
			bucket.waived = roundMoney(bucket.waived + fin.waived);
		}
		byFeeTypeMap.set(fee.feeType, bucket);

		return {
			serial: idx + 1,
			id: fee.id,
			studentId: fee.student.id,
			studentCode: fee.student.studentId,
			rollNumber: fee.enrollment.rollNumber,
			studentName:
				`${fee.student.firstName} ${fee.student.lastName ?? ""}`.trim(),
			className: fee.enrollment.class.name,
			sectionName: fee.enrollment.section?.name ?? null,
			academicYear: fee.academicYear ?? fee.enrollment.academicYear,
			feeType: fee.feeType,
			title: fee.title,
			billingMonth: fee.billingMonth,
			examName: fee.exam?.name ?? null,
			grossAmount:
				fee.grossAmount !== null ? roundMoney(Number(fee.grossAmount)) : null,
			concessionAmount: roundMoney(Number(fee.concessionAmount ?? 0)),
			concessionType: fee.concessionType ?? null,
			billed: fin.billed,
			paid: fin.paid,
			waived: fin.waived,
			waiverReason: fee.waiverReason ?? null,
			due: fin.due,
			isOverdue: fin.isOverdue,
			status: fin.effectiveStatus,
			dueDate: fee.dueDate,
		};
	});

	return {
		school,
		filters: query,
		rows,
		summary: {
			totalInvoices: rows.length,
			totalBilled,
			totalCollected,
			totalDue,
			totalWaived,
			paidCount,
			partialCount,
			pendingCount,
			overdueCount,
			waivedCount,
			byFeeType: [...byFeeTypeMap.values()],
		},
	};
};

export interface DefaulterListFilter {
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	feeType?: "ALL" | FeeType;
	status?: "ALL_DUE" | "OVERDUE" | "PENDING" | "PARTIAL";
	search?: string;
}

export const getDefaulterListReport = async (
	schoolId: number,
	query: DefaulterListFilter = {},
) => {
	const hasEnrollmentFilter =
		query.classId !== undefined ||
		query.sectionId !== undefined ||
		query.academicYear !== undefined;

	const [school, unpaidFees] = await Promise.all([
		getSchoolHeaderInfo(schoolId),
		prisma.studentFee.findMany({
			where: {
				schoolId,
				status: {
					in: [FeeStatus.PENDING, FeeStatus.PARTIAL, FeeStatus.OVERDUE],
				},
				...(query.feeType !== undefined && query.feeType !== "ALL"
					? { feeType: query.feeType }
					: {}),
				...(hasEnrollmentFilter
					? {
							enrollment: {
								...(query.classId !== undefined
									? { classId: query.classId }
									: {}),
								...(query.sectionId !== undefined
									? { sectionId: query.sectionId }
									: {}),
								...(query.academicYear !== undefined
									? { academicYear: query.academicYear }
									: {}),
							},
						}
					: {}),
			},
			select: {
				id: true,
				feeType: true,
				title: true,
				amount: true,
				waivedAmount: true,
				dueDate: true,
				status: true,
				billingMonth: true,
				studentId: true,
				student: {
					select: {
						id: true,
						studentId: true,
						firstName: true,
						lastName: true,
						nameBangla: true,
						phone: true,
						fatherName: true,
						fatherPhone: true,
						guardians: {
							orderBy: { isPrimary: "desc" },
							take: 1,
							select: {
								guardian: {
									select: {
										user: { select: { name: true, phone: true } },
									},
								},
							},
						},
					},
				},
				enrollment: {
					select: {
						rollNumber: true,
						academicYear: true,
						class: { select: { id: true, name: true, code: true } },
						section: { select: { id: true, name: true } },
					},
				},
				payments: {
					where: { status: PaymentStatus.VERIFIED },
					select: { paidAmount: true, paidAt: true },
				},
			},
		}),
	]);

	const now = new Date();
	const studentIds = [...new Set(unpaidFees.map((f) => f.studentId))];

	const lastPayments =
		studentIds.length > 0
			? await prisma.studentPayment.groupBy({
					by: ["studentId"],
					where: {
						schoolId,
						studentId: { in: studentIds },
						status: PaymentStatus.VERIFIED,
					},
					_max: { paidAt: true },
				})
			: [];

	const lastPaymentMap = new Map<number, string | null>(
		lastPayments.map((lp) => [
			lp.studentId,
			lp._max.paidAt ? toDhakaDateKey(lp._max.paidAt) : null,
		]),
	);

	interface StudentDefaulterBucket {
		studentId: number;
		studentCode: string;
		rollNumber: number | null;
		studentName: string;
		nameBangla: string | null;
		className: string;
		sectionName: string | null;
		academicYear: string;
		guardianName: string | null;
		guardianPhone: string | null;
		unpaidFeeCount: number;
		overdueFeeCount: number;
		partialFeeCount: number;
		totalBilled: number;
		totalPaid: number;
		totalWaived: number;
		totalDue: number;
		overdueDue: number;
		oldestDueDate: string | null;
		lastPaymentDate: string | null;
		feeTitles: string[];
	}

	const grouped = new Map<number, StudentDefaulterBucket>();

	for (const fee of unpaidFees) {
		const fin = computeFeeFinancials(fee, now);
		if (fin.due <= 0) continue;

		if (query.status === "OVERDUE" && !fin.isOverdue) continue;
		if (query.status === "PENDING" && fin.effectiveStatus !== FeeStatus.PENDING)
			continue;
		if (query.status === "PARTIAL" && fin.effectiveStatus !== FeeStatus.PARTIAL)
			continue;

		const primaryGuardian = fee.student.guardians[0]?.guardian?.user;
		const existing = grouped.get(fee.studentId) ?? {
			studentId: fee.student.id,
			studentCode: fee.student.studentId,
			rollNumber: fee.enrollment.rollNumber,
			studentName:
				`${fee.student.firstName} ${fee.student.lastName ?? ""}`.trim(),
			nameBangla: fee.student.nameBangla ?? null,
			className: fee.enrollment.class.name,
			sectionName: fee.enrollment.section?.name ?? null,
			academicYear: fee.enrollment.academicYear,
			guardianName: primaryGuardian?.name ?? fee.student.fatherName ?? null,
			guardianPhone:
				primaryGuardian?.phone ??
				fee.student.fatherPhone ??
				fee.student.phone ??
				null,
			unpaidFeeCount: 0,
			overdueFeeCount: 0,
			partialFeeCount: 0,
			totalBilled: 0,
			totalPaid: 0,
			totalWaived: 0,
			totalDue: 0,
			overdueDue: 0,
			oldestDueDate: null,
			lastPaymentDate: lastPaymentMap.get(fee.studentId) ?? null,
			feeTitles: [],
		};

		existing.unpaidFeeCount += 1;
		if (fin.isOverdue) {
			existing.overdueFeeCount += 1;
			existing.overdueDue = roundMoney(existing.overdueDue + fin.due);
		}
		if (fin.effectiveStatus === FeeStatus.PARTIAL) {
			existing.partialFeeCount += 1;
		}
		existing.totalBilled = roundMoney(existing.totalBilled + fin.billed);
		existing.totalPaid = roundMoney(existing.totalPaid + fin.paid);
		existing.totalWaived = roundMoney(existing.totalWaived + fin.waived);
		existing.totalDue = roundMoney(existing.totalDue + fin.due);
		existing.feeTitles.push(fee.title);

		const dueKey = toDhakaDateKey(fee.dueDate);
		if (!existing.oldestDueDate || dueKey < existing.oldestDueDate) {
			existing.oldestDueDate = dueKey;
		}

		grouped.set(fee.studentId, existing);
	}

	const q = query.search?.trim().toLowerCase();
	const filteredBuckets = [...grouped.values()]
		.filter((row) => {
			if (!q) return true;
			return (
				row.studentName.toLowerCase().includes(q) ||
				(row.nameBangla?.toLowerCase().includes(q) ?? false) ||
				row.studentCode.toLowerCase().includes(q) ||
				(row.guardianName?.toLowerCase().includes(q) ?? false) ||
				(row.guardianPhone?.toLowerCase().includes(q) ?? false) ||
				row.className.toLowerCase().includes(q) ||
				(row.rollNumber !== null && String(row.rollNumber).includes(q))
			);
		})
		.sort((a, b) => {
			if (b.overdueDue !== a.overdueDue) return b.overdueDue - a.overdueDue;
			if (b.totalDue !== a.totalDue) return b.totalDue - a.totalDue;
			const classCmp = a.className.localeCompare(b.className);
			if (classCmp !== 0) return classCmp;
			return (
				(a.rollNumber ?? Number.MAX_SAFE_INTEGER) -
				(b.rollNumber ?? Number.MAX_SAFE_INTEGER)
			);
		});

	let totalDueAmount = 0;
	let totalOverdueAmount = 0;
	let totalUnpaidInvoices = 0;
	let overdueStudentsCount = 0;

	const rows = filteredBuckets.map((item, idx) => {
		totalDueAmount = roundMoney(totalDueAmount + item.totalDue);
		totalOverdueAmount = roundMoney(totalOverdueAmount + item.overdueDue);
		totalUnpaidInvoices += item.unpaidFeeCount;
		if (item.overdueFeeCount > 0) overdueStudentsCount += 1;

		return {
			serial: idx + 1,
			...item,
			isOverdue: item.overdueFeeCount > 0,
		};
	});

	return {
		school,
		filters: query,
		summary: {
			totalDefaulters: rows.length,
			overdueStudentsCount,
			totalUnpaidInvoices,
			totalDueAmount,
			totalOverdueAmount,
		},
		rows,
	};
};

export interface RosterChartFilter {
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	status?: EnrollmentStatus;
}

export const getStudentRosterChartReport = async (
	schoolId: number,
	query: RosterChartFilter = {},
) => {
	const [school, enrollments] = await Promise.all([
		getSchoolHeaderInfo(schoolId),
		prisma.enrollment.findMany({
			where: {
				schoolId,
				...(query.classId !== undefined ? { classId: query.classId } : {}),
				...(query.sectionId !== undefined
					? { sectionId: query.sectionId }
					: {}),
				...(query.academicYear !== undefined
					? { academicYear: query.academicYear }
					: {}),
				...(query.status !== undefined ? { status: query.status } : {}),
			},
			select: {
				id: true,
				rollNumber: true,
				academicYear: true,
				status: true,
				class: { select: { id: true, name: true, code: true } },
				section: { select: { id: true, name: true } },
				student: {
					select: {
						id: true,
						studentId: true,
						firstName: true,
						lastName: true,
						nameBangla: true,
						gender: true,
						phone: true,
						fatherName: true,
						fatherPhone: true,
						residentialType: true,
						isActive: true,
						guardians: {
							orderBy: { isPrimary: "desc" },
							take: 1,
							select: {
								guardian: {
									select: {
										user: { select: { name: true, phone: true } },
									},
								},
							},
						},
					},
				},
			},
		}),
	]);

	enrollments.sort((a, b) => {
		const classCmp = a.class.name.localeCompare(b.class.name);
		if (classCmp !== 0) return classCmp;
		const secA = a.section?.name ?? "";
		const secB = b.section?.name ?? "";
		const secCmp = secA.localeCompare(secB);
		if (secCmp !== 0) return secCmp;
		const rollA = a.rollNumber ?? Number.MAX_SAFE_INTEGER;
		const rollB = b.rollNumber ?? Number.MAX_SAFE_INTEGER;
		if (rollA !== rollB) return rollA - rollB;
		const nameA = `${a.student.firstName} ${a.student.lastName ?? ""}`.trim();
		const nameB = `${b.student.firstName} ${b.student.lastName ?? ""}`.trim();
		return nameA.localeCompare(nameB);
	});

	let activeCount = 0;
	let completedCount = 0;
	let transferredCount = 0;
	let droppedCount = 0;
	let residentialCount = 0;
	let nonResidentialCount = 0;
	let dayCareCount = 0;

	const rows = enrollments.map((en, idx) => {
		if (en.status === "ACTIVE") activeCount += 1;
		else if (en.status === "COMPLETED") completedCount += 1;
		else if (en.status === "TRANSFERRED") transferredCount += 1;
		else droppedCount += 1;

		if (en.student.residentialType === "RESIDENTIAL") residentialCount += 1;
		else if (en.student.residentialType === "DAY_CARE") dayCareCount += 1;
		else nonResidentialCount += 1;

		const primaryGuardian = en.student.guardians[0]?.guardian?.user;

		return {
			serial: idx + 1,
			enrollmentId: en.id,
			studentRecordId: en.student.id,
			studentId: en.student.studentId,
			rollNumber: en.rollNumber,
			studentName:
				`${en.student.firstName} ${en.student.lastName ?? ""}`.trim(),
			nameBangla: en.student.nameBangla,
			gender: en.student.gender,
			residentialType: en.student.residentialType,
			className: en.class.name,
			sectionName: en.section?.name ?? null,
			academicYear: en.academicYear,
			guardianName: primaryGuardian?.name ?? en.student.fatherName ?? null,
			guardianPhone:
				primaryGuardian?.phone ??
				en.student.fatherPhone ??
				en.student.phone ??
				null,
			status: en.status,
		};
	});

	return {
		school,
		filters: query,
		rows,
		summary: {
			totalStudents: rows.length,
			activeCount,
			completedCount,
			transferredCount,
			droppedCount,
			residentialCount,
			nonResidentialCount,
			dayCareCount,
		},
	};
};
