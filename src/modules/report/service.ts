import { prisma } from "../../lib/prisma.js";

import type { ReportOverview } from "./interface.js";

const getSchoolReports = async (): Promise<ReportOverview["schools"]> => {
  const [
    total,
    active,
    pending,
    blocked,
    rejected,
  ] = await Promise.all([
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
  const [
    total,
    superAdmin,
    admin,
    manager,
    teacher,
    student,
    guardian,
  ] = await Promise.all([
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

const getSubscriptionReports =
  async (): Promise<ReportOverview["subscriptions"]> => {
    const [
      total,
      active,
      pending,
      expired,
      cancelled,
    ] = await Promise.all([
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

const getPaymentReports =
  async (): Promise<ReportOverview["payments"]> => {
    const [
      totalPayments,
      paidPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments,
      paidAmount,
      onlineAmount,
      cashAmount,
      pendingCashAmount,
    ] = await Promise.all([
      prisma.subscriptionPayment.count(),

      prisma.subscriptionPayment.count({
        where: {
          status: "PAID",
        },
      }),

      prisma.subscriptionPayment.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.subscriptionPayment.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.subscriptionPayment.count({
        where: {
          status: "CANCELLED",
        },
      }),

      prisma.subscriptionPayment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PAID",
        },
      }),

      prisma.subscriptionPayment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PAID",
          paymentMethod: "ONLINE",
        },
      }),

      prisma.subscriptionPayment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PAID",
          paymentMethod: "CASH",
        },
      }),

      prisma.subscriptionPayment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
          paymentMethod: "CASH",
        },
      }),
    ]);

    return {
      totalRevenue: Number(paidAmount._sum.amount ?? 0),
      onlineRevenue: Number(onlineAmount._sum.amount ?? 0),
      cashRevenue: Number(cashAmount._sum.amount ?? 0),
      pendingCashAmount: Number(pendingCashAmount._sum.amount ?? 0),
      totalPayments,
      paidPayments,
      pendingPayments,
      failedPayments,
      cancelledPayments,
    };
  };

const getPackageReports =
  async (): Promise<ReportOverview["packages"]> => {
    const [
      total,
      active,
      inactive,
      custom,
    ] = await Promise.all([
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

      prisma.package.count({
        where: {
          isCustom: true,
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      custom,
    };
  };

const getCustomPackageRequestReports =
  async (): Promise<ReportOverview["customPackageRequests"]> => {
    const [
      total,
      pending,
      approved,
      rejected,
      cancelled,
    ] = await Promise.all([
      prisma.customPackageRequest.count(),

      prisma.customPackageRequest.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.customPackageRequest.count({
        where: {
          status: "APPROVED",
        },
      }),

      prisma.customPackageRequest.count({
        where: {
          status: "REJECTED",
        },
      }),

      prisma.customPackageRequest.count({
        where: {
          status: "CANCELLED",
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      cancelled,
    };
  };

export const getReportOverview = async (): Promise<ReportOverview> => {
  const [
    schools,
    users,
    subscriptions,
    payments,
    packages,
    customPackageRequests,
  ] = await Promise.all([
    getSchoolReports(),
    getUserReports(),
    getSubscriptionReports(),
    getPaymentReports(),
    getPackageReports(),
    getCustomPackageRequestReports(),
  ]);

  return {
    schools,
    users,
    subscriptions,
    payments,
    packages,
    customPackageRequests,
  };
};
