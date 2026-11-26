export interface CreateGuardianInput {
	name: string;
	phone: string;
	email?: string;
	password?: string;
	relation?: string;
	occupation?: string;
	address?: string;
	nid?: string;
	studentIds?: number[];
}

export interface UpdateGuardianInput {
	name?: string;
	phone?: string | null;
	relation?: string | null;
	occupation?: string | null;
	address?: string | null;
	nid?: string | null;
}

export interface LinkGuardianStudentInput {
	studentId: number;
	isPrimary?: boolean;
}

export interface ResetGuardianPasswordInput {
	password?: string;
	mustChangePassword?: boolean;
}
