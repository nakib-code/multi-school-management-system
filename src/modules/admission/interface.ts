
export interface VerifyStudentEmailInput {
  email: string;
  code: string;
}

export interface CreateAdmissionInput {
  schoolId: number;

  studentName: string;
  studentEmail: string;
  password: string;

  dateOfBirth?: string;
  gender?: string;

  guardianName?: string;
  guardianPhone?: string;

  previousSchool?: string;
  address?: string;

  paymentMethod: "CASH" | "ONLINE";
}

export interface ConfirmCashPaymentInput {
  remarks?: string;
}

export interface InitiateOnlinePaymentInput {
  admissionId: number;
}