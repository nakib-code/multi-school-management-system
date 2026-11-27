import crypto from "node:crypto";
import env from "../../config/env.js";
import {
	invalidateExternalWebsiteOriginsCache,
	normalizeWebsiteOrigin,
} from "../../lib/corsOrigins.js";
import { prisma } from "../../lib/prisma.js";
import { DEFAULT_SCHOOL_FEATURES } from "../../middleware/schoolFeature.js";
import AppError from "../../utils/appError.js";
import { comparePassword, hashPassword } from "../../utils/password.js";

import type {
	UpdateAdmissionFeeInput,
	UpdateSchoolFeaturesInput,
	UpdateSchoolPaymentMethodsInput,
	UpdateWebsiteConnectionInput,
} from "./interface.js";

const schoolSettingSelect = {
	id: true,
	schoolId: true,
	admissionFee: true,
	hasGeneralSection: true,
	hasHefzSection: true,
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

// ======================================================
// EXTERNAL WEBSITE CONNECTION & LANDING ADMIN CREDENTIALS
// ======================================================

const hashConnectionKey = (key: string) =>
	crypto.createHash("sha256").update(key.trim()).digest("hex");

const verifyKeyTimingSafe = (rawKey: string, storedHash: string): boolean => {
	const candidate = hashConnectionKey(rawKey);
	const a = Buffer.from(candidate, "hex");
	const b = Buffer.from(storedHash, "hex");
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
};

const getApiBaseUrl = () => {
	const base = (env.backend_url?.trim() || "http://localhost:5000").replace(
		/\/+$/,
		"",
	);
	return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
};

export const getWebsiteConnection = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
		select: {
			id: true,
			name: true,
			code: true,
			schoolSetting: {
				select: {
					externalWebsiteUrl: true,
					websiteConnectionKeyHash: true,
					websiteConnectionKeyPreview: true,
					landingAdminEmail: true,
					landingAdminPasswordHash: true,
					hasOnlineAdmission: true,
				},
			},
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const setting = school.schoolSetting;
	return {
		schoolId: school.id,
		schoolName: school.name,
		schoolCode: school.code,
		externalWebsiteUrl: setting?.externalWebsiteUrl ?? null,
		hasConnectionKey: Boolean(setting?.websiteConnectionKeyHash),
		keyPreview: setting?.websiteConnectionKeyPreview ?? null,
		landingAdminEmail: setting?.landingAdminEmail ?? null,
		hasLandingAdminPassword: Boolean(setting?.landingAdminPasswordHash),
		apiBaseUrl: getApiBaseUrl(),
		hasOnlineAdmission:
			setting?.hasOnlineAdmission ?? DEFAULT_SCHOOL_FEATURES.hasOnlineAdmission,
	};
};

export const updateWebsiteConnection = async (
	schoolId: number,
	input: UpdateWebsiteConnectionInput,
) => {
	const school = await ensureSchoolExists(schoolId);
	if (school.status !== "ACTIVE") {
		throw new AppError(400, "School is not active");
	}

	let normalizedUrl: string | null | undefined;
	if (input.externalWebsiteUrl !== undefined) {
		if (
			input.externalWebsiteUrl === null ||
			input.externalWebsiteUrl.trim() === ""
		) {
			normalizedUrl = null;
		} else {
			const parsed = normalizeWebsiteOrigin(input.externalWebsiteUrl);
			if (!parsed) {
				throw new AppError(
					400,
					"External website URL must be a valid https:// origin (or http://localhost:* in development)",
				);
			}
			normalizedUrl = parsed;
		}
	}

	let normalizedEmail: string | null | undefined;
	if (input.landingAdminEmail !== undefined) {
		if (
			input.landingAdminEmail === null ||
			input.landingAdminEmail.trim() === ""
		) {
			normalizedEmail = null;
		} else {
			normalizedEmail = input.landingAdminEmail.trim().toLowerCase();
		}
	}

	let passwordHash: string | undefined;
	if (
		input.landingAdminPassword !== undefined &&
		input.landingAdminPassword.trim() !== ""
	) {
		passwordHash = await hashPassword(input.landingAdminPassword);
	}

	const data = {
		...(normalizedUrl !== undefined
			? { externalWebsiteUrl: normalizedUrl }
			: {}),
		...(normalizedEmail !== undefined
			? { landingAdminEmail: normalizedEmail }
			: {}),
		...(passwordHash !== undefined
			? { landingAdminPasswordHash: passwordHash }
			: {}),
		...(input.hasOnlineAdmission !== undefined
			? { hasOnlineAdmission: input.hasOnlineAdmission }
			: {}),
	};

	await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: data,
		create: {
			schoolId,
			admissionFee: 0,
			...data,
		},
	});

	invalidateExternalWebsiteOriginsCache();

	return getWebsiteConnection(schoolId);
};

export const rotateWebsiteConnectionKey = async (schoolId: number) => {
	const school = await ensureSchoolExists(schoolId);
	if (school.status !== "ACTIVE") {
		throw new AppError(400, "School is not active");
	}

	const rawKey = `mos_live_${crypto.randomBytes(16).toString("hex")}`;
	const keyHash = hashConnectionKey(rawKey);
	const keyPreview = `...${rawKey.slice(-4)}`;

	await prisma.schoolSetting.upsert({
		where: { schoolId },
		update: {
			websiteConnectionKeyHash: keyHash,
			websiteConnectionKeyPreview: keyPreview,
		},
		create: {
			schoolId,
			admissionFee: 0,
			websiteConnectionKeyHash: keyHash,
			websiteConnectionKeyPreview: keyPreview,
		},
	});

	const state = await getWebsiteConnection(schoolId);
	return {
		...state,
		connectionKey: rawKey,
	};
};

export const verifyWebsiteConnection = async (
	schoolId: number,
	connectionKey: string,
) => {
	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Valid school ID is required");
	}
	if (!connectionKey.trim()) {
		throw new AppError(400, "Connection key is required");
	}

	const school = await prisma.school.findFirst({
		where: { id: schoolId, status: "ACTIVE" },
		select: {
			id: true,
			name: true,
			code: true,
			logo: true,
			phone: true,
			email: true,
			address: true,
			schoolSetting: {
				select: {
					admissionFee: true,
					hasOnlineAdmission: true,
					bkashNumber: true,
					nagadNumber: true,
					rocketNumber: true,
					feePaymentInstruction: true,
					websiteConnectionKeyHash: true,
				},
			},
		},
	});

	const storedHash = school?.schoolSetting?.websiteConnectionKeyHash;
	if (
		!school ||
		!storedHash ||
		!verifyKeyTimingSafe(connectionKey, storedHash)
	) {
		throw new AppError(401, "Invalid school ID or website connection key");
	}

	const setting = school.schoolSetting;
	return {
		connected: true,
		school: {
			id: school.id,
			name: school.name,
			code: school.code,
			logo: school.logo,
			phone: school.phone,
			email: school.email,
			address: school.address,
		},
		admissionFee: Number(setting?.admissionFee ?? 0),
		hasOnlineAdmission:
			setting?.hasOnlineAdmission ?? DEFAULT_SCHOOL_FEATURES.hasOnlineAdmission,
		paymentMethods: {
			bkashNumber: setting?.bkashNumber ?? null,
			nagadNumber: setting?.nagadNumber ?? null,
			rocketNumber: setting?.rocketNumber ?? null,
			instruction: setting?.feePaymentInstruction ?? null,
		},
	};
};

export const verifyLandingAdminLogin = async (input: {
	schoolId: number;
	connectionKey: string;
	email: string;
	password: string;
}) => {
	if (!Number.isInteger(input.schoolId) || input.schoolId <= 0) {
		throw new AppError(400, "Valid school ID is required");
	}
	if (!input.connectionKey.trim()) {
		throw new AppError(401, "Website connection key is required");
	}

	const school = await prisma.school.findFirst({
		where: { id: input.schoolId, status: "ACTIVE" },
		select: {
			id: true,
			name: true,
			code: true,
			schoolSetting: {
				select: {
					websiteConnectionKeyHash: true,
					landingAdminEmail: true,
					landingAdminPasswordHash: true,
				},
			},
		},
	});

	const setting = school?.schoolSetting;
	if (
		!school ||
		!setting?.websiteConnectionKeyHash ||
		!verifyKeyTimingSafe(input.connectionKey, setting.websiteConnectionKeyHash)
	) {
		throw new AppError(401, "Invalid school connection credentials");
	}

	if (!setting.landingAdminEmail || !setting.landingAdminPasswordHash) {
		throw new AppError(
			401,
			"Landing admin login has not been configured in School Settings yet",
		);
	}

	const normalizedEmail = input.email.trim().toLowerCase();
	if (normalizedEmail !== setting.landingAdminEmail.toLowerCase()) {
		throw new AppError(401, "Invalid email or password");
	}

	const validPassword = await comparePassword(
		input.password,
		setting.landingAdminPasswordHash,
	);
	if (!validPassword) {
		throw new AppError(401, "Invalid email or password");
	}

	return {
		authenticated: true,
		school: {
			id: school.id,
			name: school.name,
			code: school.code,
		},
		email: setting.landingAdminEmail,
	};
};
