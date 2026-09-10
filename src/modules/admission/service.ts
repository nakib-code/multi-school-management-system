import { prisma } from "../../lib/prisma.js";

import AppError from "../../utils/appError.js";

import { hashPassword } from "../../utils/password.js";

import {
  generateVerificationCode,
  saveVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
} from "../../utils/verificationCode.js";

import { sendVerificationEmail } from "../../utils/sendEmail.js";

import type {
  ConfirmCashPaymentInput,
  CreateAdmissionInput,
  VerifyStudentEmailInput,
} from "./interface.js";
import { initiatePayment, validatePayment } from "../payment/service.js";
import type { PaymentCallbackData } from "../payment/interface.js";

export const createAdmission = async (
  payload: CreateAdmissionInput,
) => {
  const {
    schoolId,
    studentName,
    studentEmail,
    password,
    dateOfBirth,
    gender,
    guardianName,
    guardianPhone,
    previousSchool,
    address,
    paymentMethod,
  } = payload;

  // ----------------------------------------------------
  // Check school
  // ----------------------------------------------------

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
    throw new AppError(
      400,
      "Admission is not available for this school",
    );
  }

  // ----------------------------------------------------
  // Get admission fee from school setting
  // ----------------------------------------------------

  const setting = await prisma.schoolSetting.findUnique({
    where: {
      schoolId,
    },
    select: {
      admissionFee: true,
    },
  });

  if (!setting) {
    throw new AppError(
      400,
      "Admission fee is not configured for this school",
    );
  }

  // ----------------------------------------------------
  // Normalize student email
  // ----------------------------------------------------

  const normalizedEmail = studentEmail
    .trim()
    .toLowerCase();

  // ----------------------------------------------------
  // Check existing user
  // ----------------------------------------------------

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }

  // ----------------------------------------------------
  // Check existing pending admission
  // ----------------------------------------------------

  const existingAdmission =
    await prisma.admission.findFirst({
      where: {
        schoolId,
        studentEmail: normalizedEmail,
        status: "PENDING",
      },
    });

  if (existingAdmission) {
    throw new AppError(
      409,
      "A pending admission already exists for this email",
    );
  }

  // ----------------------------------------------------
  // Hash password
  // ----------------------------------------------------

  const passwordHash = await hashPassword(password);

  // ----------------------------------------------------
  // Generate application number
  // ----------------------------------------------------

  const applicationNo = `ADM-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;

  // ----------------------------------------------------
  // Create admission + payment
  // ----------------------------------------------------

  const result = await prisma.$transaction(
    async (tx) => {
      // ------------------------------------------------
      // Create admission
      // ------------------------------------------------

      const admission = await tx.admission.create({
        data: {
          schoolId,
          applicationNo,
          studentName,
          studentEmail: normalizedEmail,
          passwordHash,

          ...(dateOfBirth !== undefined
            ? {
                dateOfBirth: new Date(dateOfBirth),
              }
            : {}),

          ...(gender !== undefined
            ? {
                gender,
              }
            : {}),

          ...(guardianName !== undefined
            ? {
                guardianName,
              }
            : {}),

          ...(guardianPhone !== undefined
            ? {
                guardianPhone,
              }
            : {}),

          ...(previousSchool !== undefined
            ? {
                previousSchool,
              }
            : {}),

          ...(address !== undefined
            ? {
                address,
              }
            : {}),

          status: "PENDING",
        },
      });

      // ------------------------------------------------
      // Create admission payment
      // ------------------------------------------------

      const payment =
        await tx.admissionPayment.create({
          data: {
            admissionId: admission.id,
            schoolId,

            // Get actual admission fee
            // from SchoolSetting
            amount: setting.admissionFee,

            paymentMethod,

            status: "PENDING",
          },
        });

      return {
        admission,
        payment,
      };
    },
  );

  const verificationCode =
    generateVerificationCode();

  await saveVerificationCode(
    normalizedEmail,
    verificationCode,
  );

  try {
    await sendVerificationEmail(
      normalizedEmail,
      verificationCode,
    );
  } catch (error) {
    console.error(
      "Failed to send student verification email:",
      error,
    );

    await deleteVerificationCode(
      normalizedEmail,
    );

    await prisma.admissionPayment.delete({
      where: {
        id: result.payment.id,
      },
    });

    await prisma.admission.delete({
      where: {
        id: result.admission.id,
      },
    });

    throw new AppError(
      500,
      "Failed to send verification email",
    );
  }

  return {
    id: result.admission.id,

    schoolId: result.admission.schoolId,

    applicationNo:
      result.admission.applicationNo,

    studentName:
      result.admission.studentName,

    studentEmail:
      result.admission.studentEmail,

    status:
      result.admission.status,

    emailVerified:
      result.admission.studentEmailVerified,

    payment: {
      id: result.payment.id,

      amount: Number(
        result.payment.amount,
      ),

      paymentMethod:
        result.payment.paymentMethod,

      status:
        result.payment.status,
    },

    createdAt:
      result.admission.createdAt,
  };
};

export const verifyStudentEmail = async (
  payload: VerifyStudentEmailInput,
) => {
  const {
    email,
    code,
  } = payload;

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const admission =
    await prisma.admission.findFirst({
      where: {
        studentEmail: normalizedEmail,
        status: "PENDING",
      },
    });

  if (!admission) {
    throw new AppError(
      404,
      "Pending admission not found",
    );
  }

  if (admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email is already verified",
    );
  }

  const savedCode =
    await getVerificationCode(
      normalizedEmail,
    );

  if (!savedCode) {
    throw new AppError(
      400,
      "Verification code has expired or is invalid",
    );
  }


  if (savedCode !== code) {
    throw new AppError(
      400,
      "Invalid verification code",
    );
  }

  const updatedAdmission =
    await prisma.admission.update({
      where: {
        id: admission.id,
      },

      data: {
        studentEmailVerified: true,
      },
    });

  await deleteVerificationCode(
    normalizedEmail,
  );

  return {
    admissionId:
      updatedAdmission.id,

    applicationNo:
      updatedAdmission.applicationNo,

    studentEmail:
      updatedAdmission.studentEmail,

    emailVerified:
      updatedAdmission.studentEmailVerified,
  };
};

export const getAdmissionById = async (
  schoolId: number,
  admissionId: number,
) => {
  const admission =
    await prisma.admission.findFirst({
      where: {
        id: admissionId,
        schoolId,
      },

      select: {
        id: true,
        schoolId: true,
        applicationNo: true,

        studentName: true,
        studentEmail: true,

        dateOfBirth: true,
        gender: true,

        guardianName: true,
        guardianPhone: true,

        previousSchool: true,
        address: true,

        studentEmailVerified: true,

        status: true,

        reviewedAt: true,
        reviewedBy: true,
        rejectionReason: true,

        payment: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            status: true,
            transactionId: true,
            paidAt: true,
            receivedBy: true,
            remarks: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  return admission;
};

export const approveAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
) => {
  const admission =
    await prisma.admission.findFirst({
      where: {
        id: admissionId,
        schoolId,
      },
      include: {
        payment: true,
      },
    });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be approved",
    );
  }

  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before approval",
    );
  }

  if (!admission.payment) {
    throw new AppError(
      400,
      "Admission payment not found",
    );
  }

  if (admission.payment.status !== "PAID") {
    throw new AppError(
      400,
      "Admission payment must be completed before approval",
    );
  }

  // ----------------------------------------------------
  // Check existing user
  // ----------------------------------------------------

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: admission.studentEmail,
      },
    });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }

  // ----------------------------------------------------
  // Generate student ID
  // ----------------------------------------------------

  const studentId = `STU-${schoolId}-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;

  // ----------------------------------------------------
  // Split student name
  // ----------------------------------------------------

  const nameParts = admission.studentName
    .trim()
    .split(/\s+/);

  const firstName =
    nameParts[0] ?? admission.studentName.trim();

  const lastName =
    nameParts.length > 1
      ? nameParts.slice(1).join(" ")
      : null;

  // ----------------------------------------------------
  // Create User + Student + Update Admission
  // ----------------------------------------------------

  const result = await prisma.$transaction(
    async (tx) => {
      // Create Student User
      const user = await tx.user.create({
        data: {
          name: admission.studentName,
          email: admission.studentEmail,
          passwordHash: admission.passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          mustChangePassword: false,
          schoolId,
        },
      });

      // Create Student profile
      const student =
        await tx.student.create({
          data: {
            userId: user.id,
            schoolId,
            studentId,

            firstName,

            lastName,

            ...(admission.dateOfBirth !== null
              ? {
                  dateOfBirth:
                    admission.dateOfBirth,
                }
              : {}),

            ...(admission.gender !== null
              ? {
                  gender: admission.gender,
                }
              : {}),

            admissionDate: new Date(),

            isActive: true,
          },
        });

      // Update admission
      const updatedAdmission =
        await tx.admission.update({
          where: {
            id: admission.id,
          },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedBy: reviewerId,
          },
        });

      return {
        admission: updatedAdmission,
        user,
        student,
      };
    },
  );

  // ----------------------------------------------------
  // Response
  // ----------------------------------------------------

  return {
    admissionId:
      result.admission.id,

    applicationNo:
      result.admission.applicationNo,

    studentId:
      result.student.studentId,

    studentName:
      result.admission.studentName,

    studentEmail:
      result.user.email,

    status:
      result.admission.status,

    reviewedAt:
      result.admission.reviewedAt,
  };
};

export const rejectAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
  rejectionReason: string,
) => {
  const admission =
    await prisma.admission.findFirst({
      where: {
        id: admissionId,
        schoolId,
      },
    });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  // ----------------------------------------------------
  // Must be pending
  // ----------------------------------------------------

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be rejected",
    );
  }

  // ----------------------------------------------------
  // Email must be verified
  // ----------------------------------------------------

  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before rejection",
    );
  }

  // ----------------------------------------------------
  // Reject admission
  // ----------------------------------------------------

  const updatedAdmission =
    await prisma.admission.update({
      where: {
        id: admissionId,
      },

      data: {
        status: "REJECTED",

        rejectionReason,

        reviewedAt:
          new Date(),

        reviewedBy:
          reviewerId,
      },

      select: {
        id: true,

        applicationNo: true,

        studentName: true,

        studentEmail: true,

        status: true,

        rejectionReason: true,

        reviewedAt: true,

        reviewedBy: true,
      },
    });

  return updatedAdmission;
};

export const confirmCashPayment = async (
  schoolId: number,
  admissionId: number,
  userId: number,
  input: ConfirmCashPaymentInput,
) => {
  // ----------------------------------------------------
  // Check admission
  // ----------------------------------------------------

  const admission = await prisma.admission.findUnique({
    where: {
      id: admissionId,
    },
    select: {
      id: true,
      schoolId: true,
      status: true,
      payment: {
        select: {
          id: true,
          schoolId: true,
          amount: true,
          paymentMethod: true,
          status: true,
          transactionId: true,
          paidAt: true,
          receivedBy: true,
          remarks: true,
        },
      },
    },
  });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  // ----------------------------------------------------
  // School isolation
  // ----------------------------------------------------

  if (admission.schoolId !== schoolId) {
    throw new AppError(
      403,
      "You do not have access to this admission",
    );
  }

  // ----------------------------------------------------
  // Check admission status
  // ----------------------------------------------------

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can receive payment confirmation",
    );
  }

  // ----------------------------------------------------
  // Check payment
  // ----------------------------------------------------

  if (!admission.payment) {
    throw new AppError(
      404,
      "Admission payment not found",
    );
  }

  if (admission.payment.paymentMethod !== "CASH") {
    throw new AppError(
      400,
      "This admission is not using cash payment",
    );
  }

  if (admission.payment.status === "PAID") {
    throw new AppError(
      400,
      "Cash payment has already been confirmed",
    );
  }

  if (admission.payment.status !== "PENDING") {
    throw new AppError(
      400,
      "Cash payment cannot be confirmed",
    );
  }

  // ----------------------------------------------------
  // Confirm cash payment
  // ----------------------------------------------------

  const payment =
    await prisma.admissionPayment.update({
      where: {
        id: admission.payment.id,
      },

      data: {
        status: "PAID",
        paidAt: new Date(),
        receivedBy: userId,

        ...(input.remarks !== undefined
          ? {
              remarks: input.remarks,
            }
          : {}),
      },

      select: {
        id: true,
        admissionId: true,
        schoolId: true,
        amount: true,
        paymentMethod: true,
        status: true,
        transactionId: true,
        paidAt: true,
        receivedBy: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  // ----------------------------------------------------
  // Return response
  // ----------------------------------------------------

  return {
    ...payment,
    amount: Number(payment.amount),
  };
};

export const initiateOnlinePayment = async (
  schoolId: number,
  admissionId: number,
) => {
  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },
    include: {
      payment: true,
      school: {
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      },
    },
  });

  if (!admission) {
    throw new AppError(404, "Admission not found");
  }

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can make payment",
    );
  }

  if (!admission.payment) {
    throw new AppError(
      404,
      "Admission payment not found",
    );
  }

  if (admission.payment.paymentMethod !== "ONLINE") {
    throw new AppError(
      400,
      "This admission is not using online payment",
    );
  }

  if (admission.payment.status === "PAID") {
    throw new AppError(
      400,
      "Admission payment is already completed",
    );
  }

  if (admission.payment.status !== "PENDING") {
    throw new AppError(
      400,
      "Payment cannot be initiated",
    );
  }

  // ----------------------------------------------------
  // Generate unique transaction ID
  // ----------------------------------------------------

  const transactionId = `ADM-${admission.id}-${Date.now()}`;

  // ----------------------------------------------------
  // Save transaction ID
  // ----------------------------------------------------

  await prisma.admissionPayment.update({
    where: {
      id: admission.payment.id,
    },
    data: {
      transactionId,
    },
  });

  // ----------------------------------------------------
  // Initiate reusable payment service
  // ----------------------------------------------------

 const payment = await initiatePayment({
  amount: Number(admission.payment.amount),
  transactionId,

  productName: "Admission Fee",
  productCategory: "Education",

  customerName: admission.studentName,
  customerEmail: admission.studentEmail,

  ...(admission.guardianPhone && {
    customerPhone: admission.guardianPhone,
  }),

  ...(admission.address && {
    customerAddress: admission.address,
  }),

  customerCity: "Dhaka",
  customerCountry: "Bangladesh",

  successUrl: `${process.env.BACKEND_URL}/api/payments/admission/success`,
  failUrl: `${process.env.BACKEND_URL}/api/payments/admission/fail`,
  cancelUrl: `${process.env.BACKEND_URL}/api/payments/admission/cancel`,
  ipnUrl: `${process.env.BACKEND_URL}/api/payments/admission/ipn`,

  valueA: String(admission.id),
  valueB: String(schoolId),
});

  return payment;
};

export const verifyOnlineAdmissionPayment = async (
  admissionId: number,
  callbackData: PaymentCallbackData,
) => {
  // ----------------------------------------------------
  // Check callback data
  // ----------------------------------------------------

  if (!callbackData.val_id) {
    throw new AppError(
      400,
      "SSLCommerz validation ID is missing",
    );
  }

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  // ----------------------------------------------------
  // Find admission payment
  // ----------------------------------------------------

  const admission = await prisma.admission.findUnique({
    where: {
      id: admissionId,
    },
    select: {
      id: true,
      schoolId: true,
      status: true,
      payment: {
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          status: true,
          transactionId: true,
          paidAt: true,
        },
      },
    },
  });

  if (!admission) {
    throw new AppError(404, "Admission not found");
  }

  if (!admission.payment) {
    throw new AppError(
      404,
      "Admission payment not found",
    );
  }

  // ----------------------------------------------------
  // Check payment method
  // ----------------------------------------------------

  if (admission.payment.paymentMethod !== "ONLINE") {
    throw new AppError(
      400,
      "This admission is not using online payment",
    );
  }

  // ----------------------------------------------------
  // Check transaction ID
  // ----------------------------------------------------

  if (
    admission.payment.transactionId !==
    callbackData.tran_id
  ) {
    throw new AppError(
      400,
      "Transaction ID does not match",
    );
  }

  // ----------------------------------------------------
  // Validate payment with SSLCommerz
  // ----------------------------------------------------

  const validation = await validatePayment(
    callbackData.val_id,
  );

  // ----------------------------------------------------
  // Check validation status
  // ----------------------------------------------------

  if (
    validation.status !== "VALID" &&
    validation.status !== "VALIDATED"
  ) {
    throw new AppError(
      400,
      "SSLCommerz payment validation failed",
    );
  }

  // ----------------------------------------------------
  // Verify transaction ID again
  // ----------------------------------------------------

  if (validation.tran_id !== admission.payment.transactionId) {
    throw new AppError(
      400,
      "Validated transaction ID does not match",
    );
  }

  // ----------------------------------------------------
  // Verify amount
  // ----------------------------------------------------

  const expectedAmount = Number(admission.payment.amount);
  const paidAmount = Number(validation.amount);

  if (
    !Number.isFinite(paidAmount) ||
    paidAmount !== expectedAmount
  ) {
    throw new AppError(
      400,
      "Payment amount does not match",
    );
  }

  // ----------------------------------------------------
  // Already paid
  // ----------------------------------------------------

  if (admission.payment.status === "PAID") {
    return {
      admissionId: admission.id,
      schoolId: admission.schoolId,
      transactionId: admission.payment.transactionId,
      status: "PAID",
      amount: expectedAmount,
      paidAt: admission.payment.paidAt,
    };
  }

  // ----------------------------------------------------
  // Check admission status
  // ----------------------------------------------------

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can receive payment",
    );
  }

  // ----------------------------------------------------
  // Mark payment as PAID
  // ----------------------------------------------------

  const payment = await prisma.admissionPayment.update({
    where: {
      id: admission.payment.id,
    },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
    select: {
      id: true,
      admissionId: true,
      schoolId: true,
      amount: true,
      paymentMethod: true,
      status: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...payment,
    amount: Number(payment.amount),
  };
};