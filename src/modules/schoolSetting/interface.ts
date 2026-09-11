export interface UpdateAdmissionFeeInput {
	admissionFee: number;
}

export interface SchoolSettingResponse {
	id: number;
	schoolId: number;
	admissionFee: number;
	createdAt: Date;
	updatedAt: Date;
}
