import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type { UpdateAdmissionFeeInput } from "./interface.js";

// ======================================================
// GET ADMISSION FEE
// ======================================================

export const getAdmissionFee = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const setting = await prisma.schoolSetting.findUnique({
		where: {
			schoolId,
		},
		select: {
			id: true,
			schoolId: true,
			admissionFee: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!setting) {
		throw new AppError(404, "School setting not found");
	}

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
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "ACTIVE") {
		throw new AppError(400, "School is not active");
	}

	const setting = await prisma.schoolSetting.upsert({
		where: {
			schoolId,
		},
		update: {
			admissionFee: input.admissionFee,
		},
		create: {
			schoolId,
			admissionFee: input.admissionFee,
		},
		select: {
			id: true,
			schoolId: true,
			admissionFee: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return {
		...setting,
		admissionFee: Number(setting.admissionFee),
	};
};
