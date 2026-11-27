import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.js";
import { hashPassword } from "../../../utils/password.js";
import {
	rejectOnlineAdmissionPayment,
	submitOnlinePaymentTrx,
	verifyOnlineAdmissionPayment,
} from "../../admission/service.js";
import { getSchoolFeaturesController } from "../../schoolSetting/controller.js";
import { changePassword, updateMe } from "../service.js";

const restorers: Array<() => void> = [];

function stubDelegate(
	modelName: keyof typeof prisma,
	overrides: Record<string, unknown>,
) {
	const originalDesc = Object.getOwnPropertyDescriptor(prisma, modelName);
	const originalVal = prisma[modelName];
	Object.defineProperty(prisma, modelName, {
		value: overrides,
		configurable: true,
		writable: true,
	});
	restorers.push(() => {
		if (originalDesc) {
			Object.defineProperty(prisma, modelName, originalDesc);
		} else {
			Object.defineProperty(prisma, modelName, {
				value: originalVal,
				configurable: true,
				writable: true,
			});
		}
	});
}

afterEach(() => {
	while (restorers.length > 0) {
		restorers.pop()?.();
	}
});

describe("Admission Online Payment TrxID Flow", () => {
	it("submits TrxID and normalizes it to uppercase", async () => {
		let capturedUpdate: Record<string, unknown> | undefined;
		stubDelegate("admission", {
			findFirst: async () => ({
				id: 10,
				schoolId: 1,
				status: "PENDING",
				payment: {
					id: 50,
					paymentMethod: "ONLINE",
					status: "PENDING",
					transactionId: null,
					remarks: null,
				},
			}),
		});
		stubDelegate("admissionPayment", {
			findFirst: async () => null,
			update: async (args: { data: Record<string, unknown> }) => {
				capturedUpdate = args.data;
				return {
					id: 50,
					admissionId: 10,
					schoolId: 1,
					amount: 1500,
					paymentMethod: "BKASH",
					status: "PENDING",
					transactionId: "9K2L8M4N",
					paidAt: null,
					remarks: "Sender: 01711111111",
					updatedAt: new Date(),
				};
			},
		});

		const result = await submitOnlinePaymentTrx({
			applicationNo: "ADM-123",
			guardianPhone: "01711111111",
			paymentMethod: "BKASH",
			transactionId: " 9k2l8m4n ",
			senderPhone: "01711111111",
		});

		assert.equal(result.transactionId, "9K2L8M4N");
		assert.equal(result.amount, 1500);
		assert.equal(capturedUpdate?.transactionId, "9K2L8M4N");
		assert.equal(capturedUpdate?.paymentMethod, "BKASH");
	});

	it("rejects duplicate transaction IDs with 409", async () => {
		stubDelegate("admission", {
			findFirst: async () => ({
				id: 10,
				schoolId: 1,
				status: "PENDING",
				payment: {
					id: 50,
					paymentMethod: "ONLINE",
					status: "PENDING",
					transactionId: null,
					remarks: null,
				},
			}),
		});
		stubDelegate("admissionPayment", {
			findFirst: async () => ({ id: 99 }),
		});

		await assert.rejects(
			() =>
				submitOnlinePaymentTrx({
					applicationNo: "ADM-123",
					guardianPhone: "01711111111",
					paymentMethod: "NAGAD",
					transactionId: "DUP12345",
				}),
			(err: { statusCode?: number; message?: string }) => {
				assert.equal(err.statusCode, 409);
				return true;
			},
		);
	});

	it("verifies and rejects online admission payments cleanly", async () => {
		let lastUpdateData: Record<string, unknown> = {};
		stubDelegate("$transaction", (async (
			fn: (tx: typeof prisma) => Promise<unknown>,
		) => fn(prisma)) as unknown as Record<string, unknown>);
		stubDelegate("admission", {
			findFirst: async () => ({
				id: 10,
				schoolId: 1,
				status: "PENDING",
				payment: {
					id: 50,
					paymentMethod: "BKASH",
					status: "PENDING",
					transactionId: "TRX999",
					remarks: "Sender: 01711111111",
				},
			}),
		});
		stubDelegate("admissionPayment", {
			updateMany: async (args: { data: Record<string, unknown> }) => {
				lastUpdateData = args.data;
				return { count: 1 };
			},
			findUniqueOrThrow: async () => ({
				id: 50,
				admissionId: 10,
				schoolId: 1,
				amount: 1500,
				paymentMethod: "BKASH",
				status: lastUpdateData.status,
				transactionId: lastUpdateData.transactionId ?? "TRX999",
				paidAt: lastUpdateData.paidAt ?? null,
				receivedBy: lastUpdateData.receivedBy ?? null,
				remarks: lastUpdateData.remarks ?? null,
				updatedAt: new Date(),
			}),
		});

		const verified = await verifyOnlineAdmissionPayment(1, 10, 5, {
			remarks: "Matched in bKash statement",
		});
		assert.equal(verified.status, "PAID");
		assert.ok(verified.paidAt instanceof Date);

		const rejected = await rejectOnlineAdmissionPayment(1, 10, 5, {
			remarks: "TrxID not found",
		});
		assert.equal(rejected.status, "FAILED");
		assert.match(String(rejected.remarks), /TrxID not found/);
	});
});

describe("School Feature Flags Role Scoping", () => {
	it("allows SUPER_ADMIN to read any school features and blocks cross-school ADMIN", async () => {
		stubDelegate("school", {
			findUnique: async () => ({ id: 42, status: "ACTIVE" }),
		});
		stubDelegate("schoolSetting", {
			findUnique: async () => ({
				schoolId: 42,
				hasGeneralSection: true,
				hasHefzSection: true,
				hasOnlineAdmission: true,
				hasTeacherPayroll: false,
				smsEnabled: false,
			}),
		});

		let sentStatus = 0;
		const res = {
			status(code: number) {
				sentStatus = code;
				return this;
			},
			json() {
				return this;
			},
		} as unknown as Response;

		const superAdminReq = {
			params: { schoolId: "42" },
			user: { userId: 1, role: "SUPER_ADMIN" },
		} as unknown as AuthRequest;

		await getSchoolFeaturesController(superAdminReq, res);
		assert.equal(sentStatus, 200);

		const otherSchoolAdminReq = {
			params: { schoolId: "42" },
			user: { userId: 2, role: "ADMIN", schoolId: 99 },
		} as unknown as AuthRequest;

		await assert.rejects(
			() => getSchoolFeaturesController(otherSchoolAdminReq, res),
			(err: { statusCode?: number }) => {
				assert.equal(err.statusCode, 403);
				return true;
			},
		);
	});
});

describe("Self-Profile (updateMe) & Change Password", () => {
	it("normalizes Bangladesh phone number on updateMe", async () => {
		let savedData: Record<string, unknown> | undefined;
		stubDelegate("user", {
			findUnique: async () => ({ id: 7, status: "ACTIVE" }),
			update: async (args: { data: Record<string, unknown> }) => {
				savedData = args.data;
				return {
					id: 7,
					name: String(args.data.name ?? "Test User"),
					email: "user@example.com",
					phone: args.data.phone ?? null,
					avatarUrl: args.data.avatarUrl ?? null,
					role: "SUPER_ADMIN",
					status: "ACTIVE",
					schoolId: null,
					mustChangePassword: false,
					school: null,
				};
			},
		});

		const updated = await updateMe(7, {
			name: "Updated Admin",
			phone: "+8801712345678",
			avatarUrl: "https://example.com/avatar.png",
		});

		assert.equal(savedData?.phone, "01712345678");
		assert.equal(updated.phone, "01712345678");
		assert.equal(updated.avatarUrl, "https://example.com/avatar.png");
	});

	it("rejects wrong current password and updates hash on valid changePassword", async () => {
		const currentHash = await hashPassword("OldPass123");
		let updatedPayload: Record<string, unknown> | undefined;

		stubDelegate("user", {
			findUnique: async () => ({
				id: 9,
				name: "Staff",
				email: "staff@example.com",
				phone: "01700000000",
				role: "SUPER_ADMIN",
				status: "ACTIVE",
				schoolId: null,
				passwordHash: currentHash,
				mustChangePassword: true,
				school: null,
			}),
			update: async (args: { data: Record<string, unknown> }) => {
				updatedPayload = args.data;
				return {};
			},
		});

		await assert.rejects(
			() =>
				changePassword(9, {
					currentPassword: "WrongPassword1",
					newPassword: "NewPassword123",
				}),
			(err: { statusCode?: number }) => {
				assert.equal(err.statusCode, 400);
				return true;
			},
		);

		const res = await changePassword(9, {
			currentPassword: "OldPass123",
			newPassword: "NewPassword123",
		});

		assert.equal(res.user.mustChangePassword, false);
		assert.equal(updatedPayload?.mustChangePassword, false);
		assert.ok(typeof res.token === "string" && res.token.length > 10);
	});
});
