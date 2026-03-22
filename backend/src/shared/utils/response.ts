import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export const success = <T>(res: Response, data: T, message = 'Success', code = 200) => {
  res.status(code).json({
    code,
    message,
    data,
  })
}

export const error = (res: Response, message: string, code = 400, errors?: unknown) => {
  res.status(code).json({
    code,
    message,
    ...(errors && { errors }),
  })
}

export const paginated = <T>(
  res: Response,
  items: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
) => {
  res.json({
    code: 200,
    message: 'Success',
    data: {
      items,
      pagination,
    },
  })
}
