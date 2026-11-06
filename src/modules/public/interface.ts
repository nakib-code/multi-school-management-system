// src/modules/public/interface.ts
export interface TSchoolResolveQuery {
  identifier: string
}

export interface TNoticeQuery {
  page?: string
  limit?: string
}

export interface TContactFormInput {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}