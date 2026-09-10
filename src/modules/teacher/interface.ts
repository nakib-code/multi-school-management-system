export interface CreateTeacherInput {
  schoolId: number;

  name: string;
  email: string;
  password: string;

  employeeId: string;

  firstName: string;
  lastName?: string;

  phone?: string;
  address?: string;
  dateOfBirth?: string;

  joiningDate?: string;

  designation?: string;
  qualification?: string;
}

export interface VerifyTeacherEmailInput {
  schoolId: number;
  teacherId: number;
  code: string;
}