export interface CreateSchoolInput {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;

  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword: string;
}

export interface VerifyAdminEmailInput {
  email: string;
  code: string;
}

export interface RejectSchoolInput {
  rejectionReason: string;
}

/**
 * =========================================================
 * SCHOOL USERS
 * =========================================================
 */

export type SchoolUserRole =
  | "ADMIN"
  | "MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "GUARDIAN";

export interface GetSchoolUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: SchoolUserRole;
  status?: "ACTIVE" | "INACTIVE";
}

export interface SchoolUserListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: SchoolUserRole;
  status: "ACTIVE" | "INACTIVE";
  schoolId: number | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface SchoolUserListResponse {
  users: SchoolUserListItem[];

  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SchoolUserSummary {
  school: {
    id: number;
    name: string;
    code: string;
    status: string;
  };

  counts: {
    total: number;
    admin: number;
    manager: number;
    teacher: number;
    student: number;
    guardian: number;
  };
}
