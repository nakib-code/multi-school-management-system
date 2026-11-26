export interface CreateClassDiaryInput {
	classId: number;
	sectionId?: number | null;
	subjectId?: number | null;
	teacherId?: number | null;
	diaryDate: Date;
	title?: string | null;
	classwork: string;
	homework?: string | null;
	dueDate?: Date | null;
	attachmentUrl?: string | null;
}

export interface UpdateClassDiaryInput {
	classId?: number;
	sectionId?: number | null;
	subjectId?: number | null;
	diaryDate?: Date;
	title?: string | null;
	classwork?: string;
	homework?: string | null;
	dueDate?: Date | null;
	attachmentUrl?: string | null;
}

export interface ClassDiaryFilterQuery {
	classId?: number;
	sectionId?: number;
	subjectId?: number;
	date?: Date;
	fromDate?: Date;
	toDate?: Date;
}
