export interface CreateManagerInput {
	email: string;
	password: string;
	employeeId: string;
	firstName: string;
	lastName?: string;
	phone?: string;
	address?: string;
	dateOfBirth?: Date;
	joiningDate?: Date;
	designation?: string;
}

export interface UpdateManagerInput {
	firstName?: string;
	lastName?: string | null;
	phone?: string | null;
	address?: string | null;
	dateOfBirth?: Date | null;
	designation?: string | null;
	isActive?: boolean;
}
