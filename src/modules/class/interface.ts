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