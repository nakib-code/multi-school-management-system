export interface CreateSubjectInput {
	name: string;
	code: string;
	description?: string;
	fullMarks?: number;
	passMarks?: number;
}

export interface UpdateSubjectInput {
	name?: string;
	code?: string;
	description?: string;
	fullMarks?: number;
	passMarks?: number;
	isActive?: boolean;
}
