export interface CreateAdmissionInput {
  schoolId: number;
  studentName: string;
  studentEmail: string;
  dateOfBirth?: string;
  gender?: string;
  guardianName?: string;
  guardianPhone?: string;
  previousSchool?: string;
  address?: string;
}