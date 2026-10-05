import { UserRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { GetUsersQuery, UpdateUserStatusParams } from "./interface.js";

export const getUsers = async (query: GetUsersQuery) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;

	const skip = (page - 1) * limit;

	const where = {
		...(query.search
			? {
					OR: [
						{
							name: {
								contains: query.search,
								mode: "insensitive" as const,
							},
						},
						{
							email: {
								contains: query.search,
								mode: "insensitive" as const,
							},
						},
					],
				}
			: {}),

		...(query.role ? { role: query.role } : {}),
		...(query.status ? { status: query.status } : {}),
		...(query.schoolId ? { schoolId: Number(query.schoolId) } : {}),
	};

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			skip,
			take: limit,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				status: true,
				schoolId: true,
				school: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
				lastLoginAt: true,
				createdAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		}),

		prisma.user.count({
			where,
		}),
	]);

	return {
		users,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const updateUserStatus = async ({
	id,
	status,
}: UpdateUserStatusParams) => {
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			role: true,
			status: true,
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	if (user.role !== UserRole.ADMIN) {
		throw new AppError(
			403,
			"Only school admin accounts can be blocked or unblocked",
		);
	}

	if (user.status === status) {
		throw new AppError(400, `User is already ${status.toLowerCase()}`);
	}

	const updatedUser = await prisma.user.update({
		where: { id },
		data: {
			status,
		},
		select: {
			id: true,
			name: true,
			email: true,
			phone: true,
			role: true,
			status: true,
			schoolId: true,
			school: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
			lastLoginAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return updatedUser;
};
