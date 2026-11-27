import type {
	AcademicGroup,
	AdmissionPaymentMethod,
	HefzWing,
	ResidentialType,
} from "../../generated/prisma/client.js";

export interface CreateAdmissionInput {
	schoolId: number;

	// Stage 1 — Required Student Information
	studentName: string;
	dateOfBirth: string;
	gender: string;
	residentialType?: ResidentialType;

	// Stage 1 — Required Academic Information
	classId: number;
	sectionId?: number;
	academicYear: string;
	shift?: string;
	academicGroup?: AcademicGroup;
	group?: string;
	quranWing?: HefzWing;

	// Stage 1 — Required Guardian Information
	guardianName: string;
	guardianPhone: string;
	guardianRelationship?: string;
	guardianEmail?: string;
	guardianNid?: string;
	guardianOccupation?: string;

	// Optional Student Login (Not forced)
	studentEmail?: string;
	password?: string;

	// Stage 2 — Optional Details
	nameBangla?: string;
	birthRegNo?: string;
	bloodGroup?: string;
	previousSchool?: string;
	previousClass?: string;
	fatherName?: string;
	motherName?: string;
	address?: string;
	presentAddress?: string;
	permanentAddress?: string;

	// Optional Documents
	studentPhotoUrl?: string;
	birthCertificateUrl?: string;
	previousCertificateUrl?: string;
	guardianNidUrl?: string;
	previousTcUrl?: string;
	marksheetUrl?: string;

	// Optional Payment (only when school admission fee is enabled)
	paymentMethod?: AdmissionPaymentMethod;
}

export interface VerifyStudentEmailInput {
	email: string;
	code: string;
}

export interface ConfirmCashPaymentInput {
	remarks?: string;
}

export interface InitiateOnlinePaymentInput {
	applicationNo: string;
	guardianPhone?: string;
	studentEmail?: string;
}

export interface TrackAdmissionInput {
	applicationNo: string;
	schoolId?: number;
	studentEmail?: string;
	guardianPhone?: string;
}

export interface GetAdmissionsQuery {
	page?: number;
	limit?: number;
	search?: string;
	classId?: number;
	academicYear?: string;
	status?: string;
	paymentStatus?: string;
}
