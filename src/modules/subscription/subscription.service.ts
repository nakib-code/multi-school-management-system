import { prisma } from "../../lib/prisma.js";

import type {
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  UpdateSubscriptionStatusPayload,
} from "./subscription.types.js";

const createSubscription = async (
  payload: CreateSubscriptionPayload,
) => {
  const school = await prisma.school.findUnique({
    where: {
      id: payload.schoolId,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const packageData = await prisma.package.findUnique({
    where: {
      id: payload.packageId,
    },
    include: {
      features: true,
    },
  });

  if (!packageData) {
    throw new Error("Package not found");
  }

  if (!packageData.isActive) {
    throw new Error("Cannot assign an inactive package");
  }

  const existingActiveSubscription =
    await prisma.schoolSubscription.findFirst({
      where: {
        schoolId: payload.schoolId,
        status: "ACTIVE",
      },
    });

  if (existingActiveSubscription) {
    throw new Error(
      "School already has an active subscription",
    );
  }

  const subscription =
    await prisma.schoolSubscription.create({
      data: {
  schoolId: payload.schoolId,
  packageId: payload.packageId,
  startDate: payload.startDate,
  endDate: payload.endDate,
  price: payload.price,

  ...(payload.notes !== undefined && {
    notes: payload.notes,
  }),

  status: "ACTIVE",
},

      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },

        package: {
          include: {
            features: true,
          },
        },
      },
    });

  return subscription;
};

const getAllSubscriptions = async () => {
  return prisma.schoolSubscription.findMany({
    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },

      package: {
        include: {
          features: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSubscriptionById = async (
  id: number,
) => {
  const subscription =
    await prisma.schoolSubscription.findUnique({
      where: {
        id,
      },

      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },

        package: {
          include: {
            features: true,
          },
        },
      },
    });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  return subscription;
};

const getSchoolSubscriptions = async (
  schoolId: number,
) => {
  const school = await prisma.school.findUnique({
    where: {
      id: schoolId,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }

  return prisma.schoolSubscription.findMany({
    where: {
      schoolId,
    },

    include: {
      package: {
        include: {
          features: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const updateSubscription = async (
  id: number,
  payload: UpdateSubscriptionPayload,
) => {
  const existingSubscription =
    await prisma.schoolSubscription.findUnique({
      where: {
        id,
      },
    });

  if (!existingSubscription) {
    throw new Error("Subscription not found");
  }

  const startDate =
    payload.startDate ?? existingSubscription.startDate;

  const endDate =
    payload.endDate ?? existingSubscription.endDate;

  if (endDate <= startDate) {
    throw new Error(
      "End date must be after start date",
    );
  }

  return prisma.schoolSubscription.update({
    where: {
      id,
    },

    data: {
      ...(payload.startDate !== undefined && {
        startDate: payload.startDate,
      }),

      ...(payload.endDate !== undefined && {
        endDate: payload.endDate,
      }),

      ...(payload.price !== undefined && {
        price: payload.price,
      }),

      ...(payload.notes !== undefined && {
        notes: payload.notes,
      }),
    },

    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },

      package: {
        include: {
          features: true,
        },
      },
    },
  });
};

const updateSubscriptionStatus = async (
  id: number,
  payload: UpdateSubscriptionStatusPayload,
) => {
  const existingSubscription =
    await prisma.schoolSubscription.findUnique({
      where: {
        id,
      },
    });

  if (!existingSubscription) {
    throw new Error("Subscription not found");
  }

  return prisma.schoolSubscription.update({
    where: {
      id,
    },

    data: {
      status: payload.status,
    },

    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },

      package: {
        include: {
          features: true,
        },
      },
    },
  });
};

export const subscriptionService = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getSchoolSubscriptions,
  updateSubscription,
  updateSubscriptionStatus,
};