import type { FeeType } from "../../generated/prisma/client.js";

export interface CreateClassInput {
	schoolId: number;
	name: string;
	code: string;
	description?: string;
}

export interface UpdateClassInput {
	name?: string;
	code?: string;
	description?: string;
	isActive?: boolean;
}

export interface ClassFeeStructureFilterQuery {
	classId?: number;
	academicYear?: string;
	feeType?: FeeType;
}

export interface UpsertClassFeeStructureItemInput {
	feeType: FeeType;
	amount: number | null;
	title?: string | null;
	isActive?: boolean;
}

export interface UpsertClassFeeStructuresInput {
	academicYear?: string | null;
	items: UpsertClassFeeStructureItemInput[];
}
