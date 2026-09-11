export interface CreateSchoolInput {
	name: string;
	code: string;
	email?: string;
	phone?: string;
	address?: string;
	logo?: string;

	adminName: string;
	adminEmail: string;
	adminPhone?: string;
}
