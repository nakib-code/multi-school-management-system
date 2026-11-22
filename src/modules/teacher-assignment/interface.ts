export interface CreateTeacherAssignmentInput {
	teacherId: number;
	classId: number;
	sectionId: number;
	subjectId: number;
	academicYear: string;
}

export interface UpdateTeacherAssignmentInput {
	teacherId?: number;
	classId?: number;
	sectionId?: number;
	subjectId?: number;
	academicYear?: string;
	isActive?: boolean;
}

export interface TeacherAssignmentFilterQuery {
	teacherId?: number;
	classId?: number;
	sectionId?: number;
	subjectId?: number;
	academicYear?: string;
	isActive?: boolean;
}
