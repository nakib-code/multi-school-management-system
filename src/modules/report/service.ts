import type {
	AdmissionPaymentStatus,
	AdmissionStatus,
	EnrollmentStatus,
	FeeStatus,
	FeeType,
} from "../../generated/prisma/client.js";
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
		admissionPayments,
	] = await Promise.all([
		prisma.studentFee.findMany({
			where: { schoolId },
			select: {
				feeType: true,
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
		prisma.admissionPayment.findMany({
			where: { schoolId },
			select: {
				amount: true,
				status: true,
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

	for (const fee of feeRows) {
		const net = Math.max(0, Number(fee.amount));
		const paid =
			fee.status === "PAID"
				? net
				: fee.payments.reduce((pSum, p) => pSum + Number(p.paidAmount), 0);
		const collected = Math.min(net, paid);
		const due = fee.status === "WAIVED" ? 0 : Math.max(0, net - paid);
		const waived = fee.status === "WAIVED" ? net : 0;

		if (fee.status !== "WAIVED") {
			totalBilled += net;
			totalCollected += collected;
			totalDue += due;
		} else {
			totalWaived += waived;
		}

		if (fee.status === "PAID") paidFeeCount += 1;
		else if (fee.status === "PARTIAL") partialFeeCount += 1;
		else if (fee.status === "PENDING") unpaidFeeCount += 1;

		const bucket = feeTypeMap.get(fee.feeType) ?? {
			feeType: fee.feeType,
			count: 0,
			billed: 0,
			collected: 0,
			due: 0,
			waived: 0,
		};
		bucket.count += 1;
		if (fee.status !== "WAIVED") {
			bucket.billed += net;
			bucket.collected += collected;
			bucket.due += due;
		} else {
			bucket.waived += waived;
		}
		feeTypeMap.set(fee.feeType, bucket);
	}

	let admissionTotalExpected = 0;
	let admissionCollectedVerified = 0;
	let admissionPendingPayment = 0;
	let admissionUnlinkedCollected = 0;

	for (const ap of admissionPayments) {
		const amt = Math.max(0, Number(ap.amount));
		if (ap.status !== "CANCELLED") {
			admissionTotalExpected += amt;
		}
		if (ap.status === "PAID") {
			admissionCollectedVerified += amt;
			if (!ap.studentFee) {
				admissionUnlinkedCollected += amt;
			}
		} else if (ap.status === "PENDING" || ap.status === "FAILED") {
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
			totalExpected += fee;
			if (adm.payment.status === "PAID") {
				totalCollected += fee;
				paidCount += 1;
			} else {
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
				...(query.status !== undefined ? { status: query.status } : {}),
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

	const rows = fees.map((fee, idx) => {
		const billed = Math.max(0, Number(fee.amount));
		const verifiedPaid = fee.payments.reduce(
			(s, p) => s + Number(p.paidAmount),
			0,
		);
		const paid =
			fee.status === "PAID" ? billed : Math.min(billed, verifiedPaid);
		const due = fee.status === "WAIVED" ? 0 : Math.max(0, billed - paid);
		const waived = fee.status === "WAIVED" ? billed : 0;

		if (fee.status !== "WAIVED") {
			totalBilled += billed;
			totalCollected += paid;
			totalDue += due;
		} else {
			totalWaived += waived;
		}

		if (fee.status === "PAID") paidCount += 1;
		else if (fee.status === "PARTIAL") partialCount += 1;
		else if (fee.status === "WAIVED") waivedCount += 1;
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
		if (fee.status !== "WAIVED") {
			bucket.billed += billed;
			bucket.collected += paid;
			bucket.due += due;
		} else {
			bucket.waived += waived;
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
			billed,
			paid,
			due,
			status: fee.status,
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
			waivedCount,
			byFeeType: [...byFeeTypeMap.values()],
		},
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
	let droppedCount = 0;
	let residentialCount = 0;
	let nonResidentialCount = 0;
	let dayCareCount = 0;

	const rows = enrollments.map((en, idx) => {
		if (en.status === "ACTIVE") activeCount += 1;
		else if (en.status === "COMPLETED") completedCount += 1;
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
			droppedCount,
			residentialCount,
			nonResidentialCount,
			dayCareCount,
		},
	};
};
