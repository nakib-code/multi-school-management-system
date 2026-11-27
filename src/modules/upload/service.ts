import crypto from "node:crypto";
import env from "../../config/env.js";
import type { UserRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { UploadCategory } from "./validation.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB (fits Vercel 4.5 MB base64 payload limit)
const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3 MB (fits Vercel 4.5 MB base64 payload limit)

const SCHOOL_ADMIN_ONLY_CATEGORIES = new Set<UploadCategory>([
	"SCHOOL_LOGO",
	"SCHOOL_PROFILE",
]);

function detectMimeFromMagicBytes(buf: Buffer): string | null {
	if (buf.length < 4) return null;
	// JPEG: FF D8 FF
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
		return "image/jpeg";
	}
	// PNG: 89 50 4E 47
	if (
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47
	) {
		return "image/png";
	}
	// WEBP: RIFF....WEBP
	if (
		buf.length >= 12 &&
		buf.subarray(0, 4).toString("ascii") === "RIFF" &&
		buf.subarray(8, 12).toString("ascii") === "WEBP"
	) {
		return "image/webp";
	}
	// PDF: %PDF
	if (buf.subarray(0, 4).toString("ascii") === "%PDF") {
		return "application/pdf";
	}
	return null;
}

function assertCloudinaryConfigured() {
	if (
		!env.cloudinary_cloud_name ||
		!env.cloudinary_api_key ||
		!env.cloudinary_api_secret
	) {
		throw new AppError(
			503,
			"Cloud file storage is not configured (missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET)",
		);
	}
	return {
		cloudName: env.cloudinary_cloud_name,
		apiKey: env.cloudinary_api_key,
		apiSecret: env.cloudinary_api_secret,
	};
}

function signCloudinaryParams(
	params: Record<string, string | number>,
	apiSecret: string,
): string {
	const sorted = Object.keys(params)
		.sort()
		.map((k) => `${k}=${params[k]}`)
		.join("&");
	return crypto
		.createHash("sha1")
		.update(`${sorted}${apiSecret}`)
		.digest("hex");
}

export const uploadFile = async (input: {
	actor: { userId: number; role: UserRole; schoolId?: number };
	dataUrl: string;
	category: UploadCategory;
}) => {
	const { actor, dataUrl, category } = input;

	// Role authorization for school-level branding uploads
	if (
		SCHOOL_ADMIN_ONLY_CATEGORIES.has(category) &&
		!["ADMIN", "MANAGER"].includes(actor.role)
	) {
		throw new AppError(
			403,
			"Only school administrators or managers can upload institution logos/banners",
		);
	}

	const commaIndex = dataUrl.indexOf(";base64,");
	if (commaIndex === -1) {
		throw new AppError(400, "Invalid base64 data URL");
	}
	const base64Data = dataUrl.slice(commaIndex + 8);
	const buffer = Buffer.from(base64Data, "base64");

	// Validate actual binary magic bytes (never trust extension or client MIME)
	const detectedMime = detectMimeFromMagicBytes(buffer);
	if (!detectedMime) {
		throw new AppError(
			400,
			"Unsupported file content. Allowed formats: JPEG, PNG, WEBP, and PDF.",
		);
	}

	const isPdf = detectedMime === "application/pdf";
	if (isPdf && category !== "DOCUMENT") {
		throw new AppError(400, "PDF files are only allowed for DOCUMENT uploads");
	}

	const maxBytes = isPdf ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
	if (buffer.length > maxBytes) {
		throw new AppError(400, "File size exceeds limit (3MB)");
	}

	const { cloudName, apiKey, apiSecret } = assertCloudinaryConfigured();
	const folder = `madrasaos/${actor.schoolId ? `school-${actor.schoolId}` : "platform"}/${category.toLowerCase()}`;
	const publicId = `${category.toLowerCase()}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
	const timestamp = Math.floor(Date.now() / 1000);
	const resourceType = isPdf ? "raw" : "image";

	const signature = signCloudinaryParams(
		{ folder, public_id: publicId, timestamp },
		apiSecret,
	);

	const form = new FormData();
	form.append("file", dataUrl);
	form.append("api_key", apiKey);
	form.append("timestamp", String(timestamp));
	form.append("folder", folder);
	form.append("public_id", publicId);
	form.append("signature", signature);

	const res = await fetch(
		`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
		{ method: "POST", body: form },
	);

	if (!res.ok) {
		const errText = await res.text().catch(() => "");
		throw new AppError(
			502,
			`Cloud upload failed: ${errText || res.statusText}`,
		);
	}

	const uploaded = (await res.json()) as {
		secure_url: string;
		public_id: string;
		bytes: number;
		resource_type: string;
	};

	const record = await prisma.uploadedFile.create({
		data: {
			schoolId: actor.schoolId ?? null,
			uploadedById: actor.userId,
			publicId: uploaded.public_id,
			url: uploaded.secure_url,
			resourceType: uploaded.resource_type,
			mimeType: detectedMime,
			bytes: uploaded.bytes || buffer.length,
			folder,
			category,
		},
	});

	// Auto-link USER_AVATAR and SCHOOL_LOGO when appropriate
	if (category === "USER_AVATAR") {
		await prisma.user.update({
			where: { id: actor.userId },
			data: { avatarUrl: uploaded.secure_url },
		});
	} else if (category === "SCHOOL_LOGO" && actor.schoolId) {
		await prisma.school.update({
			where: { id: actor.schoolId },
			data: { logo: uploaded.secure_url },
		});
	}

	return record;
};

export const deleteUploadedFile = async (
	actor: { userId: number; role: UserRole; schoolId?: number },
	fileId: number,
) => {
	const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
	if (!file) {
		throw new AppError(404, "Uploaded file not found");
	}

	const isOwner = file.uploadedById === actor.userId;
	const isPlatformFileForSuperAdmin =
		actor.role === "SUPER_ADMIN" && file.schoolId === null;
	const isSameSchoolAdmin =
		actor.role === "ADMIN" &&
		actor.schoolId !== undefined &&
		file.schoolId === actor.schoolId;

	if (!isOwner && !isPlatformFileForSuperAdmin && !isSameSchoolAdmin) {
		throw new AppError(403, "You are not authorized to delete this file");
	}

	if (
		env.cloudinary_cloud_name &&
		env.cloudinary_api_key &&
		env.cloudinary_api_secret
	) {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = signCloudinaryParams(
			{ public_id: file.publicId, timestamp },
			env.cloudinary_api_secret,
		);
		const form = new FormData();
		form.append("public_id", file.publicId);
		form.append("api_key", env.cloudinary_api_key);
		form.append("timestamp", String(timestamp));
		form.append("signature", signature);
		await fetch(
			`https://api.cloudinary.com/v1_1/${env.cloudinary_cloud_name}/${file.resourceType}/destroy`,
			{ method: "POST", body: form },
		).catch(() => {});
	}

	await prisma.uploadedFile.delete({ where: { id: fileId } });
	return { id: fileId, deleted: true };
};

export const listMyUploads = async (actor: {
	userId: number;
	role: UserRole;
	schoolId?: number;
}) => {
	return prisma.uploadedFile.findMany({
		where:
			actor.role === "SUPER_ADMIN"
				? { schoolId: null }
				: actor.role === "ADMIN" && actor.schoolId
					? { schoolId: actor.schoolId }
					: { uploadedById: actor.userId },
		orderBy: { createdAt: "desc" },
		take: 50,
	});
};
