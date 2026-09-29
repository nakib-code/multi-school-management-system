import type { UserRole, UserStatus } from "../../generated/prisma/client.js";

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  schoolId?: number;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  schoolId: number | null;
  school: {
    id: number;
    name: string;
    code: string;
  } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface UserListResponse {
  users: UserListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateUserStatusParams {
  id: number;
  status: UserStatus;
}
