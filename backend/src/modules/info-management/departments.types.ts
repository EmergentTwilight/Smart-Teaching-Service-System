import { z } from 'zod'

export const departmentIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

export type DepartmentIdParams = z.infer<typeof departmentIdSchema>
