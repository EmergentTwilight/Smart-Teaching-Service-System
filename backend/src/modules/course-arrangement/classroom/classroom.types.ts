import { Classroom } from '@prisma/client'

export interface ClassroomQuery {
  page?: number
  pageSize?: number
  campus?: string
  building?: string
  roomType?: string
  status?: string
  keyword?: string
}

export interface ClassroomListResponse {
  total: number
  page: number
  pageSize: number
  items: Classroom[]
}
