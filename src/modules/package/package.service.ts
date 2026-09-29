import { prisma } from "../../lib/prisma.js";
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
    throw new Error("A package with this name already exists");
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
      isCustom: payload.isCustom ?? false,
      isActive: payload.isActive ?? true,

      features: {
        create: payload.features.map((item) => ({
          feature: item.feature,
          enabled: item.enabled,
        })),
      },
    },

    include: {
      features: true,
    },
  });

  return createdPackage;
};

const getAllPackages = async () => {
  return prisma.package.findMany({
    include: {
      features: true,
    },
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
    include: {
      features: true,
    },
  });

  if (!packageData) {
    throw new Error("Package not found");
  }

  return packageData;
};

const updatePackage = async (
  id: number,
  payload: UpdatePackagePayload,
) => {
  const existingPackage = await prisma.package.findUnique({
    where: {
      id,
    },
  });

  if (!existingPackage) {
    throw new Error("Package not found");
  }

  if (payload.name && payload.name !== existingPackage.name) {
    const duplicatePackage = await prisma.package.findUnique({
      where: {
        name: payload.name,
      },
    });

    if (duplicatePackage) {
      throw new Error("A package with this name already exists");
    }
  }

  const updatedPackage = await prisma.$transaction(async (tx) => {
    if (payload.features) {
      await tx.packageFeatureConfig.deleteMany({
        where: {
          packageId: id,
        },
      });
    }

    return tx.package.update({
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

        ...(payload.features && {
          features: {
            create: payload.features.map((item) => ({
              feature: item.feature,
              enabled: item.enabled,
            })),
          },
        }),
      },

      include: {
        features: true,
      },
    });
  });

  return updatedPackage;
};

const updatePackageStatus = async (
  id: number,
  isActive: boolean,
) => {
  const existingPackage = await prisma.package.findUnique({
    where: {
      id,
    },
  });

  if (!existingPackage) {
    throw new Error("Package not found");
  }

  return prisma.package.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
    include: {
      features: true,
    },
  });
};

export const packageService = {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  updatePackageStatus,
};