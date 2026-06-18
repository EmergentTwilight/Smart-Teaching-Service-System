import request from '@/shared/utils/request'
import {
  autoScheduleTaskResponseSchema,
  taskIdSchema,
  applyTaskResponseSchema,
  createTaskSchema,
  CreateTaskInput,
  TaskIdInput,
  AutoScheduleTaskResponse,
  ApplyTaskResponse,
} from '../types/auto-schedule'

const BASE_PATH = '/course-arrangement/auto-schedule/tasks'

export const autoScheduleApi = {
  createTask: async (input: CreateTaskInput): Promise<AutoScheduleTaskResponse> => {
    const validatedInput = createTaskSchema.parse(input)
    const data = await request.post(BASE_PATH, validatedInput)
    return autoScheduleTaskResponseSchema.parse(data)
  },

  getTaskStatus: async (input: TaskIdInput): Promise<AutoScheduleTaskResponse> => {
    const validatedInput = taskIdSchema.parse(input)
    const data = await request.get(`${BASE_PATH}/${validatedInput.taskId}`)
    return autoScheduleTaskResponseSchema.parse(data)
  },

  getTaskPreview: async (input: TaskIdInput): Promise<AutoScheduleTaskResponse> => {
    const validatedInput = taskIdSchema.parse(input)
    const data = await request.get(`${BASE_PATH}/${validatedInput.taskId}/preview`)
    return autoScheduleTaskResponseSchema.parse(data)
  },

  applyTask: async (input: TaskIdInput): Promise<ApplyTaskResponse> => {
    const validatedInput = taskIdSchema.parse(input)
    const data = await request.post(`${BASE_PATH}/${validatedInput.taskId}/apply`)
    return applyTaskResponseSchema.parse(data)
  },
}
