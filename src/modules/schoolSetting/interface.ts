import type { MobileAccountType } from "../../generated/prisma/enums.js";

export interface UpdateAdmissionFeeInput {
	admissionFee: number;
	bkashNumber?: string | null | undefined;
	nagadNumber?: string | null | undefined;
	rocketNumber?: string | null | undefined;
}

export interface UpdateSchoolFeaturesInput {
	hasGeneralSection?: boolean | undefined;
	hasHefzSection?: boolean | undefined;
	hasPublicWebsite?: boolean | undefined;
	hasOnlineAdmission?: boolean | undefined;
	hasTeacherPayroll?: boolean | undefined;
	smsEnabled?: boolean | undefined;
}

export interface UpdateSchoolPaymentMethodsInput {
	bkashNumber?: string | null | undefined;
	bkashType?: MobileAccountType | undefined;
	nagadNumber?: string | null | undefined;
	nagadType?: MobileAccountType | undefined;
	rocketNumber?: string | null | undefined;
	rocketType?: MobileAccountType | undefined;
	feePaymentInstruction?: string | null | undefined;
}
