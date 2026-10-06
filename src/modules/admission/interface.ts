export interface CreateAdmissionInput {
  schoolId: number;

  // Student Information
  studentName: string;
  studentEmail: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  previousSchool?: string;
  previousClass?: string;

  // Guardian Information
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  guardianNid?: string;
  guardianOccupation?: string;

  // Address
  address?: string;

  // Application Information
  classId: number;
  sectionId: number;
  academicYear: string;
  shift?: string;
  group?: string;

  // Documents
  studentPhotoUrl?: string;
  birthCertificateUrl?: string;
  previousCertificateUrl?: string;

  // Payment
  paymentMethod: "CASH" | "ONLINE";
}

export interface VerifyStudentEmailInput {
  email: string;
  code: string;
}

export interface ConfirmCashPaymentInput {
  remarks?: string;
}

export interface InitiateOnlinePaymentInput {
  admissionId: number;
}

export interface TrackAdmissionInput {
  applicationNo: string;
  studentEmail: string;
}