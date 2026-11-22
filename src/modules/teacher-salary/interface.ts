import type { SalaryStatus } from "../../generated/prisma/client.js";

export interface CreateTeacherSalaryInput {
	teacherId: number;
	month: number;
	year: number;
	basicSalary: number;
	bonus?: number;
	deduction?: number;
	status?: SalaryStatus;
	remarks?: string;
}

export interface UpdateTeacherSalaryInput {
	basicSalary?: number;
	bonus?: number;
	deduction?: number;
	status?: SalaryStatus;
	remarks?: string | null;
}

export interface TeacherSalaryFilterQuery {
	teacherId?: number;
	month?: number;
	year?: number;
	status?: SalaryStatus;
}
