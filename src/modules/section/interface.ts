export interface CreateSectionInput {
  schoolId: number;
  classId: number;
  name: string;
  code: string;
  capacity?: number;
  roomNumber?: string;
}

export interface UpdateSectionInput {
  name?: string;
  code?: string;
  capacity?: number | null;
  roomNumber?: string | null;
  isActive?: boolean;
}