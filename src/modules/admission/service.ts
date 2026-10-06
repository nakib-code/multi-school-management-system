import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import { sendVerificationEmail } from "../../utils/sendEmail.js";
import {
  deleteVerificationCode,
  generateVerificationCode,
  getVerificationCode,
  saveVerificationCode,
} from "../../utils/verificationCode.js";
import type { PaymentCallbackData } from "../payment/interface.js";
import { initiatePayment, validatePayment } from "../payment/service.js";
import type {
  ConfirmCashPaymentInput,
  CreateAdmissionInput,
  VerifyStudentEmailInput,
} from "./interface.js";

/**
 * Create Admission
 */
export const createAdmission = async (payload: CreateAdmissionInput) => {
  const {
    schoolId,

    // Student
    studentName,
    studentEmail,
    password,
    dateOfBirth,
    gender,
    bloodGroup,
    previousSchool,
    previousClass,

    // Guardian
    guardianName,
    guardianEmail,
    guardianPhone,
    guardianRelationship,
    guardianNid,
    guardianOccupation,

    // Address
    address,

    // Application
    classId,
    sectionId,
    academicYear,
    shift,
    group,

    // Documents
    studentPhotoUrl,
    birthCertificateUrl,
    previousCertificateUrl,

    // Payment
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
      name: true,
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
  // Check class
  // ----------------------------------------------------

  const schoolClass = await prisma.schoolClass.findFirst({
    where: {
      id: classId,
      schoolId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!schoolClass) {
    throw new AppError(
      404,
      "Selected class was not found or is inactive",
    );
  }

  // ----------------------------------------------------
  // Check section
  // ----------------------------------------------------

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      schoolId,
      classId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      capacity: true,
    },
  });

  if (!section) {
    throw new AppError(
      404,
      "Selected section was not found or is inactive",
    );
  }

  // ----------------------------------------------------
  // Check section capacity
  // ----------------------------------------------------

  if (section.capacity !== null) {
    const activeEnrollmentCount = await prisma.enrollment.count({
      where: {
        sectionId,
        academicYear,
        status: "ACTIVE",
      },
    });

    if (activeEnrollmentCount >= section.capacity) {
      throw new AppError(
        400,
        "Selected section is already full",
      );
    }
  }

  // ----------------------------------------------------
  // Get admission fee
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

  const normalizedEmail = studentEmail.trim().toLowerCase();

  // ----------------------------------------------------
  // Check existing user
  // ----------------------------------------------------

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
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

  const existingAdmission = await prisma.admission.findFirst({
    where: {
      schoolId,
      studentEmail: normalizedEmail,
      status: "PENDING",
    },
    select: {
      id: true,
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

  const result = await prisma.$transaction(async (tx) => {
    const admission = await tx.admission.create({
      data: {
        schoolId,
        classId,
        sectionId,

        applicationNo,

        // Student
        studentName: studentName.trim(),
        studentEmail: normalizedEmail,
        passwordHash,

        ...(dateOfBirth
          ? {
              dateOfBirth: new Date(dateOfBirth),
            }
          : {}),

        ...(gender
          ? {
              gender: gender.trim(),
            }
          : {}),

        ...(bloodGroup
          ? {
              bloodGroup: bloodGroup.trim(),
            }
          : {}),

        ...(previousSchool
          ? {
              previousSchool: previousSchool.trim(),
            }
          : {}),

        ...(previousClass
          ? {
              previousClass: previousClass.trim(),
            }
          : {}),

        // Guardian
        ...(guardianName
          ? {
              guardianName: guardianName.trim(),
            }
          : {}),

        ...(guardianEmail
          ? {
              guardianEmail: guardianEmail.trim().toLowerCase(),
            }
          : {}),

        ...(guardianPhone
          ? {
              guardianPhone: guardianPhone.trim(),
            }
          : {}),

        ...(guardianRelationship
          ? {
              guardianRelationship: guardianRelationship.trim(),
            }
          : {}),

        ...(guardianNid
          ? {
              guardianNid: guardianNid.trim(),
            }
          : {}),

        ...(guardianOccupation
          ? {
              guardianOccupation: guardianOccupation.trim(),
            }
          : {}),

        // Address
        ...(address
          ? {
              address: address.trim(),
            }
          : {}),

        // Application
        academicYear: academicYear.trim(),

        ...(shift
          ? {
              shift: shift.trim(),
            }
          : {}),

        ...(group
          ? {
              group: group.trim(),
            }
          : {}),

        // Documents
        ...(studentPhotoUrl
          ? {
              studentPhotoUrl,
            }
          : {}),

        ...(birthCertificateUrl
          ? {
              birthCertificateUrl,
            }
          : {}),

        ...(previousCertificateUrl
          ? {
              previousCertificateUrl,
            }
          : {}),

        status: "PENDING",
      },
    });

    const payment = await tx.admissionPayment.create({
      data: {
        admissionId: admission.id,
        schoolId,
        amount: setting.admissionFee,
        paymentMethod,
        status: "PENDING",
      },
    });

    return {
      admission,
      payment,
    };
  });

  // ----------------------------------------------------
  // Send verification email
  // ----------------------------------------------------

  const verificationCode = generateVerificationCode();

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

    await deleteVerificationCode(normalizedEmail);

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

    applicationNo: result.admission.applicationNo,

    studentName: result.admission.studentName,
    studentEmail: result.admission.studentEmail,

    classId: result.admission.classId,
    sectionId: result.admission.sectionId,
    academicYear: result.admission.academicYear,

    status: result.admission.status,

    emailVerified:
      result.admission.studentEmailVerified,

    payment: {
      id: result.payment.id,
      amount: Number(result.payment.amount),
      paymentMethod: result.payment.paymentMethod,
      status: result.payment.status,
    },

    createdAt: result.admission.createdAt,
  };
};

/**
 * Verify Student Email
 */
export const verifyStudentEmail = async (
  payload: VerifyStudentEmailInput,
) => {
  const { email, code } = payload;

  const normalizedEmail = email.trim().toLowerCase();

  const admission = await prisma.admission.findFirst({
    where: {
      studentEmail: normalizedEmail,
      status: "PENDING",
    },
    select: {
      id: true,
      applicationNo: true,
      studentEmail: true,
      studentEmailVerified: true,
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

  const savedCode = await getVerificationCode(
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
      select: {
        id: true,
        applicationNo: true,
        studentEmail: true,
        studentEmailVerified: true,
      },
    });

  await deleteVerificationCode(normalizedEmail);

  return {
    admissionId: updatedAdmission.id,
    applicationNo: updatedAdmission.applicationNo,
    studentEmail: updatedAdmission.studentEmail,
    emailVerified:
      updatedAdmission.studentEmailVerified,
  };
};

/**
 * Get Admission
 */
export const getAdmissionById = async (
  schoolId: number,
  admissionId: number,
) => {
  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },

    select: {
      id: true,
      schoolId: true,

      applicationNo: true,

      // Student
      studentName: true,
      studentEmail: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      previousSchool: true,
      previousClass: true,

      // Guardian
      guardianName: true,
      guardianEmail: true,
      guardianPhone: true,
      guardianRelationship: true,
      guardianNid: true,
      guardianOccupation: true,

      // Address
      address: true,

      // Application
      classId: true,
      sectionId: true,
      academicYear: true,
      shift: true,
      group: true,

      // Documents
      studentPhotoUrl: true,
      birthCertificateUrl: true,
      previousCertificateUrl: true,

      studentEmailVerified: true,

      status: true,

      reviewedAt: true,
      reviewedBy: true,
      rejectionReason: true,

      class: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

      section: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },

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

  return {
    ...admission,
    payment: admission.payment
      ? {
          ...admission.payment,
          amount: Number(admission.payment.amount),
        }
      : null,
  };
};

/**
 * Approve Admission
 */
export const approveAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
) => {
  // ----------------------------------------------------
  // Get admission
  // ----------------------------------------------------

  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionId,
      schoolId,
    },

    include: {
      payment: true,
      class: true,
      section: true,
    },
  });

  if (!admission) {
    throw new AppError(
      404,
      "Admission not found",
    );
  }

  // ----------------------------------------------------
  // Admission status
  // ----------------------------------------------------

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be approved",
    );
  }

  // ----------------------------------------------------
  // Email verification
  // ----------------------------------------------------

  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before approval",
    );
  }

  // ----------------------------------------------------
  // Payment
  // ----------------------------------------------------

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

  const existingUser = await prisma.user.findUnique({
    where: {
      email: admission.studentEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "A user with this email already exists",
    );
  }

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
  // Generate student ID
  // ----------------------------------------------------

  const studentId = `STU-${schoolId}-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;

  // ----------------------------------------------------
  // Transaction
  // ----------------------------------------------------

  const result = await prisma.$transaction(
    async (tx) => {
      const now = new Date();

      // -----------------------------------------------
      // Check subscription
      // -----------------------------------------------

      const activeSubscription =
        await tx.schoolSubscription.findFirst({
          where: {
            schoolId,
            status: "ACTIVE",

            startDate: {
              lte: now,
            },

            endDate: {
              gte: now,
            },

            package: {
              isActive: true,
            },
          },

          include: {
            package: {
              select: {
                id: true,
                name: true,
                studentLimit: true,
              },
            },
          },

          orderBy: {
            startDate: "desc",
          },
        });

      if (!activeSubscription) {
        throw new AppError(
          403,
          "School does not have an active subscription",
        );
      }

      // -----------------------------------------------
      // Count students
      // -----------------------------------------------

      const currentStudentCount =
        await tx.student.count({
          where: {
            schoolId,
            isActive: true,
          },
        });

      if (
        currentStudentCount >=
        activeSubscription.package.studentLimit
      ) {
        throw new AppError(
          403,
          `Student limit reached for ${activeSubscription.package.name} package. Maximum allowed students: ${activeSubscription.package.studentLimit}`,
        );
      }

      // -----------------------------------------------
      // Re-check section capacity
      // -----------------------------------------------

      const activeEnrollmentCount =
        await tx.enrollment.count({
          where: {
            sectionId: admission.sectionId,
            academicYear: admission.academicYear,
            status: "ACTIVE",
          },
        });

      if (
        admission.section.capacity !== null &&
        activeEnrollmentCount >=
          admission.section.capacity
      ) {
        throw new AppError(
          400,
          "Selected section is already full",
        );
      }

      // -----------------------------------------------
      // Create User
      // -----------------------------------------------

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

      // -----------------------------------------------
      // Create Student
      // -----------------------------------------------

      const student = await tx.student.create({
        data: {
          userId: user.id,
          schoolId,

          studentId,

          firstName,
          lastName,

          ...(admission.dateOfBirth
            ? {
                dateOfBirth:
                  admission.dateOfBirth,
              }
            : {}),

          ...(admission.gender
            ? {
                gender: admission.gender,
              }
            : {}),

          ...(admission.guardianPhone
            ? {
                phone:
                  admission.guardianPhone,
              }
            : {}),

          ...(admission.address
            ? {
                address:
                  admission.address,
              }
            : {}),

          admissionDate: now,

          isActive: true,
        },
      });

      // -----------------------------------------------
      // Create Enrollment
      // -----------------------------------------------

      const enrollment =
        await tx.enrollment.create({
          data: {
            schoolId,

            studentId: student.id,

            classId: admission.classId,

            sectionId: admission.sectionId,

            academicYear:
              admission.academicYear,

            status: "ACTIVE",
          },
        });

      // -----------------------------------------------
      // Update Admission
      // -----------------------------------------------

      const updatedAdmission =
        await tx.admission.update({
          where: {
            id: admission.id,
          },

          data: {
            status: "APPROVED",

            reviewedAt: now,

            reviewedBy: reviewerId,
          },
        });

      return {
        admission: updatedAdmission,
        user,
        student,
        enrollment,

        package:
          activeSubscription.package,

        previousStudentCount:
          currentStudentCount,
      };
    },

    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  // ----------------------------------------------------
  // Response
  // ----------------------------------------------------

  return {
    admissionId: result.admission.id,

    applicationNo:
      result.admission.applicationNo,

    studentId:
      result.student.studentId,

    studentName:
      result.admission.studentName,

    studentEmail:
      result.user.email,

    enrollmentId:
      result.enrollment.id,

    classId:
      result.enrollment.classId,

    sectionId:
      result.enrollment.sectionId,

    academicYear:
      result.enrollment.academicYear,

    status:
      result.admission.status,

    reviewedAt:
      result.admission.reviewedAt,

    subscription: {
      packageId:
        result.package.id,

      packageName:
        result.package.name,

      studentLimit:
        result.package.studentLimit,

      previousStudentCount:
        result.previousStudentCount,

      currentStudentCount:
        result.previousStudentCount + 1,
    },
  };
};

/**
 * Reject Admission
 */
export const rejectAdmission = async (
  schoolId: number,
  admissionId: number,
  reviewerId: number,
  rejectionReason: string,
) => {
  const admission = await prisma.admission.findFirst({
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

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can be rejected",
    );
  }

  if (!admission.studentEmailVerified) {
    throw new AppError(
      400,
      "Student email must be verified before rejection",
    );
  }

  const updatedAdmission =
    await prisma.admission.update({
      where: {
        id: admissionId,
      },

      data: {
        status: "REJECTED",

        rejectionReason:
          rejectionReason.trim(),

        reviewedAt: new Date(),

        reviewedBy: reviewerId,
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

/**
 * Confirm Cash Payment
 */
export const confirmCashPayment = async (
  schoolId: number,
  admissionId: number,
  userId: number,
  input: ConfirmCashPaymentInput,
) => {
  const admission =
    await prisma.admission.findUnique({
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

  if (admission.schoolId !== schoolId) {
    throw new AppError(
      403,
      "You do not have access to this admission",
    );
  }

  if (admission.status !== "PENDING") {
    throw new AppError(
      400,
      "Only pending admissions can receive payment confirmation",
    );
  }

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
              remarks: input.remarks.trim(),
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

  return {
    ...payment,
    amount: Number(payment.amount),
  };
};

/**
 * Initiate Online Admission Payment
 */
export const initiateOnlinePayment = async (
  schoolId: number,
  admissionId: number,
) => {
  const admission =
    await prisma.admission.findFirst({
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
    throw new AppError(
      404,
      "Admission not found",
    );
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
  // Generate transaction ID
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
  // Initiate SSLCommerz
  // ----------------------------------------------------

  const payment = await initiatePayment({
    amount: Number(admission.payment.amount),

    transactionId,

    productName: "Admission Fee",

    productCategory: "Education",

    customerName:
      admission.studentName,

    customerEmail:
      admission.studentEmail,

    ...(admission.guardianPhone
      ? {
          customerPhone:
            admission.guardianPhone,
        }
      : {}),

    ...(admission.address
      ? {
          customerAddress:
            admission.address,
        }
      : {}),

    customerCity: "Dhaka",

    customerCountry: "Bangladesh",

    successUrl:
      `${process.env.BACKEND_URL}/api/payments/admission/success`,

    failUrl:
      `${process.env.BACKEND_URL}/api/payments/admission/fail`,

    cancelUrl:
      `${process.env.BACKEND_URL}/api/payments/admission/cancel`,

    ipnUrl:
      `${process.env.BACKEND_URL}/api/payments/admission/ipn`,

    valueA: String(admission.id),

    valueB: String(schoolId),
  });

  return payment;
};

/**
 * Verify Online Admission Payment
 */
export const verifyOnlineAdmissionPayment =
  async (
    admissionId: number,
    callbackData: PaymentCallbackData,
  ) => {
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

    const admission =
      await prisma.admission.findUnique({
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
      throw new AppError(
        404,
        "Admission not found",
      );
    }

    if (!admission.payment) {
      throw new AppError(
        404,
        "Admission payment not found",
      );
    }

    if (
      admission.payment.paymentMethod !==
      "ONLINE"
    ) {
      throw new AppError(
        400,
        "This admission is not using online payment",
      );
    }

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
    // Validate SSLCommerz payment
    // ----------------------------------------------------

    const validation =
      await validatePayment(
        callbackData.val_id,
      );

    if (
      validation.status !== "VALID" &&
      validation.status !== "VALIDATED"
    ) {
      throw new AppError(
        400,
        "SSLCommerz payment validation failed",
      );
    }

    if (
      validation.tran_id !==
      admission.payment.transactionId
    ) {
      throw new AppError(
        400,
        "Validated transaction ID does not match",
      );
    }

    // ----------------------------------------------------
    // Verify amount
    // ----------------------------------------------------

    const expectedAmount =
      Number(admission.payment.amount);

    const paidAmount =
      Number(validation.amount);

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

    if (
      admission.payment.status ===
      "PAID"
    ) {
      return {
        admissionId: admission.id,

        schoolId:
          admission.schoolId,

        transactionId:
          admission.payment.transactionId,

        status: "PAID",

        amount: expectedAmount,

        paidAt:
          admission.payment.paidAt,
      };
    }

    // ----------------------------------------------------
    // Admission must be pending
    // ----------------------------------------------------

    if (admission.status !== "PENDING") {
      throw new AppError(
        400,
        "Only pending admissions can receive payment",
      );
    }

    // ----------------------------------------------------
    // Mark payment as paid
    // ----------------------------------------------------

    const payment =
      await prisma.admissionPayment.update({
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