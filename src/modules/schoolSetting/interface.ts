export interface UpdateAdmissionFeeInput {
	admissionFee: number;
	bkashNumber?: string | null;
	nagadNumber?: string | null;
	rocketNumber?: string | null;
}

export interface SchoolSettingResponse {
	id: number;
	schoolId: number;
	admissionFee: number;
	bkashNumber: string | null;
	nagadNumber: string | null;
	rocketNumber: string | null;
	createdAt: Date;
	updatedAt: Date;
}
