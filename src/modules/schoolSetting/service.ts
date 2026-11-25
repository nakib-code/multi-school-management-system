import { prisma } from "../../lib/prisma.js";
import { DEFAULT_SCHOOL_FEATURES } from "../../middleware/schoolFeature.js";
import AppError from "../../utils/appError.js";

import type {
	UpdateAdmissionFeeInput,
	UpdateSchoolFeaturesInput,
	UpdateSchoolPaymentMethodsInput,
} from "./interface.js";

const schoolSettingSelect = {
	id: true,
	schoolId: true,
	admissionFee: true,
	hasGeneralSection: true,
	hasHefzSection: true,
	hasPublicWebsite: true,
	hasOnlineAdmission: true,
	hasTeacherPayroll: true,
	smsEnabled: true,
	bkashNumber: true,
	bkashType: true,
	nagadNumber: true,
	nagadType: true,
	rocketNumber: true,
	rocketType: true,
	feePaymentInstruction: true,
	createdAt: true,
	updatedAt: true,
} as const;

const ensureSchoolExists = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
		select: { id: true, status: true },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	return school;
};

// ======================================================
// GET ADMISSION FEE & SCHOOL SETTING
// ======================================================

export const getAdmissionFee = async (schoolId: number) => {
	await ensureSchoolExists(schoolId);

	const setting = await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: {},
		create: {
			schoolId,
			admissionFee: 0,
		},
		select: schoolSettingSelect,
	});

	return {
		...setting,
		admissionFee: Number(setting.admissionFee),
	};
};

// ======================================================
// UPDATE ADMISSION FEE
// ======================================================

export const updateAdmissionFee = async (
	schoolId: number,
	input: UpdateAdmissionFeeInput,
) => {
	const school = await ensureSchoolExists(schoolId);

	if (school.status !== "ACTIVE") {
		throw new AppError(400, "School is not active");
	}

	const setting = await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: {
			admissionFee: input.admissionFee,
			...(input.bkashNumber !== undefined
				? { bkashNumber: input.bkashNumber || null }
				: {}),
			...(input.nagadNumber !== undefined
				? { nagadNumber: input.nagadNumber || null }
				: {}),
			...(input.rocketNumber !== undefined
				? { rocketNumber: input.rocketNumber || null }
				: {}),
		},
		create: {
			schoolId,
			admissionFee: input.admissionFee,
			...(input.bkashNumber !== undefined
				? { bkashNumber: input.bkashNumber || null }
				: {}),
			...(input.nagadNumber !== undefined
				? { nagadNumber: input.nagadNumber || null }
				: {}),
			...(input.rocketNumber !== undefined
				? { rocketNumber: input.rocketNumber || null }
				: {}),
		},
		select: schoolSettingSelect,
	});

	return {
		...setting,
		admissionFee: Number(setting.admissionFee),
	};
};

// ======================================================
// GET SCHOOL FEATURE FLAGS
// ======================================================

export const getSchoolFeatures = async (schoolId: number) => {
	await ensureSchoolExists(schoolId);

	const setting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: {
			schoolId: true,
			hasGeneralSection: true,
			hasHefzSection: true,
			hasPublicWebsite: true,
			hasOnlineAdmission: true,
			hasTeacherPayroll: true,
			smsEnabled: true,
		},
	});

	return setting ?? { schoolId, ...DEFAULT_SCHOOL_FEATURES };
};

// ======================================================
// UPDATE SCHOOL FEATURE FLAGS (SUPER ADMIN ONLY)
// ======================================================

export const updateSchoolFeatures = async (
	schoolId: number,
	input: UpdateSchoolFeaturesInput,
) => {
	await ensureSchoolExists(schoolId);

	const data = {
		...(input.hasGeneralSection !== undefined
			? { hasGeneralSection: input.hasGeneralSection }
			: {}),
		...(input.hasHefzSection !== undefined
			? { hasHefzSection: input.hasHefzSection }
			: {}),
		...(input.hasPublicWebsite !== undefined
			? { hasPublicWebsite: input.hasPublicWebsite }
			: {}),
		...(input.hasOnlineAdmission !== undefined
			? { hasOnlineAdmission: input.hasOnlineAdmission }
			: {}),
		...(input.hasTeacherPayroll !== undefined
			? { hasTeacherPayroll: input.hasTeacherPayroll }
			: {}),
		...(input.smsEnabled !== undefined ? { smsEnabled: input.smsEnabled } : {}),
	};

	const setting = await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: data,
		create: {
			schoolId,
			admissionFee: 0,
			...DEFAULT_SCHOOL_FEATURES,
			...data,
		},
		select: schoolSettingSelect,
	});

	return {
		...setting,
		admissionFee: Number(setting.admissionFee),
	};
};

// ======================================================
// GET SCHOOL PAYMENT METHODS (SCHOOL ADMIN / MANAGER / GUARDIAN)
// ======================================================

export const getSchoolPaymentMethods = async (schoolId: number) => {
	await ensureSchoolExists(schoolId);

	const setting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: {
			schoolId: true,
			bkashNumber: true,
			bkashType: true,
			nagadNumber: true,
			nagadType: true,
			rocketNumber: true,
			rocketType: true,
			feePaymentInstruction: true,
		},
	});

	return (
		setting ?? {
			schoolId,
			bkashNumber: null,
			bkashType: "PERSONAL" as const,
			nagadNumber: null,
			nagadType: "PERSONAL" as const,
			rocketNumber: null,
			rocketType: "PERSONAL" as const,
			feePaymentInstruction: null,
		}
	);
};

// ======================================================
// UPDATE SCHOOL PAYMENT METHODS (SCHOOL ADMIN / MANAGER)
// ======================================================

export const updateSchoolPaymentMethods = async (
	schoolId: number,
	input: UpdateSchoolPaymentMethodsInput,
) => {
	const school = await ensureSchoolExists(schoolId);

	if (school.status !== "ACTIVE") {
		throw new AppError(400, "School is not active");
	}

	const data = {
		...(input.bkashNumber !== undefined
			? { bkashNumber: input.bkashNumber || null }
			: {}),
		...(input.bkashType !== undefined ? { bkashType: input.bkashType } : {}),
		...(input.nagadNumber !== undefined
			? { nagadNumber: input.nagadNumber || null }
			: {}),
		...(input.nagadType !== undefined ? { nagadType: input.nagadType } : {}),
		...(input.rocketNumber !== undefined
			? { rocketNumber: input.rocketNumber || null }
			: {}),
		...(input.rocketType !== undefined ? { rocketType: input.rocketType } : {}),
		...(input.feePaymentInstruction !== undefined
			? { feePaymentInstruction: input.feePaymentInstruction || null }
			: {}),
	};

	const setting = await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: data,
		create: {
			schoolId,
			admissionFee: 0,
			...data,
		},
		select: {
			schoolId: true,
			bkashNumber: true,
			bkashType: true,
			nagadNumber: true,
			nagadType: true,
			rocketNumber: true,
			rocketType: true,
			feePaymentInstruction: true,
			updatedAt: true,
		},
	});

	return setting;
};
