export interface CreateGuardianInput {
	name: string;
	email: string;
	password: string;
	phone?: string;
	relation?: string;
	occupation?: string;
	address?: string;
	studentIds?: number[];
}

export interface UpdateGuardianInput {
	name?: string;
	phone?: string | null;
	relation?: string | null;
	occupation?: string | null;
	address?: string | null;
}

export interface LinkGuardianStudentInput {
	studentId: number;
	isPrimary?: boolean;
}
