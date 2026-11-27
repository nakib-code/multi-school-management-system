import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreatePackagePayload,
	UpdatePackagePayload,
} from "./package.types.js";

const createPackage = async (payload: CreatePackagePayload) => {
	const existingPackage = await prisma.package.findUnique({
		where: {
			name: payload.name,
		},
	});

	if (existingPackage) {
		throw new AppError(409, "A package with this name already exists");
	}

	const createdPackage = await prisma.package.create({
		data: {
			name: payload.name,
			...(payload.description !== undefined && {
				description: payload.description,
			}),
			price: payload.price,
			billingCycle: payload.billingCycle,
			studentLimit: payload.studentLimit,
			isActive: payload.isActive ?? true,
		},
	});

	return createdPackage;
};

const getAllPackages = async () => {
	return prisma.package.findMany({
		orderBy: {
			createdAt: "desc",
		},
	});
};

const getPackageById = async (id: number) => {
	const packageData = await prisma.package.findUnique({
		where: {
			id,
		},
	});

	if (!packageData) {
		throw new AppError(404, "Package not found");
	}

	return packageData;
};

const updatePackage = async (id: number, payload: UpdatePackagePayload) => {
	const existingPackage = await prisma.package.findUnique({
		where: {
			id,
		},
	});

	if (!existingPackage) {
		throw new AppError(404, "Package not found");
	}

	if (payload.name && payload.name !== existingPackage.name) {
		const duplicatePackage = await prisma.package.findUnique({
			where: {
				name: payload.name,
			},
		});

		if (duplicatePackage) {
			throw new AppError(409, "A package with this name already exists");
		}
	}

	return prisma.package.update({
		where: {
			id,
		},
		data: {
			...(payload.name !== undefined && {
				name: payload.name,
			}),
			...(payload.description !== undefined && {
				description: payload.description,
			}),
			...(payload.price !== undefined && {
				price: payload.price,
			}),
			...(payload.billingCycle !== undefined && {
				billingCycle: payload.billingCycle,
			}),
			...(payload.studentLimit !== undefined && {
				studentLimit: payload.studentLimit,
			}),
			...(payload.isActive !== undefined && {
				isActive: payload.isActive,
			}),
		},
	});
};

const updatePackageStatus = async (id: number, isActive: boolean) => {
	const existingPackage = await prisma.package.findUnique({
		where: {
			id,
		},
	});

	if (!existingPackage) {
		throw new AppError(404, "Package not found");
	}

	return prisma.package.update({
		where: {
			id,
		},
		data: {
			isActive,
		},
	});
};

const getPublicPackages = async () => {
	return prisma.package.findMany({
		where: {
			isActive: true,
		},
		select: {
			id: true,
			name: true,
			description: true,
			price: true,
			billingCycle: true,
			studentLimit: true,
			isActive: true,
		},
		orderBy: {
			studentLimit: "asc",
		},
	});
};

export const packageService = {
	createPackage,
	getAllPackages,
	getPackageById,
	updatePackage,
	updatePackageStatus,
	getPublicPackages,
};
