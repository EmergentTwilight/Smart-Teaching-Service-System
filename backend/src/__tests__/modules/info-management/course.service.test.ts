import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '@stss/shared'
import type { CourseStatus, CourseType } from '@prisma/client'

const prismaMock = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  coursePrerequisite: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { courseService } from '../../../modules/info-management/course.service.js'

class MockDecimal {
  constructor(private value: number) {}
  toNumber() {
    return this.value
  }
}

function buildCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-1',
    code: 'CS101',
    name: '数据结构',
    credits: new MockDecimal(3.5),
    hours: 48,
    courseType: 'REQUIRED' as CourseType,
    category: '专业核心课',
    departmentId: 'dept-1',
    teacherId: 'teacher-1',
    description: '课程描述',
    assessmentMethod: '考试',
    status: 'ACTIVE' as CourseStatus,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-02T10:00:00Z'),
    ...overrides,
  }
}

const mockRequest = {
  user: { userId: 'user-1' },
  ip: '127.0.0.1',
  get: (header: string) => (header === 'User-Agent' ? 'Mozilla/5.0' : undefined),
} as any

beforeEach(() => {
  vi.resetAllMocks()

  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      const tx = {
        course: {
          findMany: prismaMock.course.findMany,
          findUnique: prismaMock.course.findUnique,
          create: prismaMock.course.create,
          update: prismaMock.course.update,
          delete: prismaMock.course.delete,
          count: prismaMock.course.count,
        },
        coursePrerequisite: {
          createMany: prismaMock.coursePrerequisite.createMany,
          deleteMany: prismaMock.coursePrerequisite.deleteMany,
        },
        systemLog: {
          create: prismaMock.systemLog.create,
        },
      }
      return input(tx)
    }
    return Promise.all(input as Promise<unknown>[])
  })
})

describe('courseService', () => {
  describe('getCourseList', () => {
    it('应该成功获取课程列表并返回分页数据', async () => {
      prismaMock.course.findMany.mockResolvedValue([
        {
          ...buildCourse(),
          department: { id: 'dept-1', name: '计算机学院' },
          teacher: { user: { id: 'teacher-1', realName: '张老师' } },
        },
      ])
      prismaMock.course.count.mockResolvedValue(1)

      const result = await courseService.getCourseList({ page: 1, page_size: 10 })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].teacherName).toBe('张老师')
      expect(result.pagination.total).toBe(1)
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      )
    })

    it('应该支持按筛选条件构造 where', async () => {
      prismaMock.course.findMany.mockResolvedValue([])
      prismaMock.course.count.mockResolvedValue(0)

      await courseService.getCourseList({
        page: 2,
        page_size: 5,
        keyword: '数据',
        department_id: 'dept-1',
        course_type: 'REQUIRED' as CourseType,
        status: 'ACTIVE' as CourseStatus,
      })

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '数据', mode: 'insensitive' } },
              { code: { contains: '数据', mode: 'insensitive' } },
            ],
            departmentId: 'dept-1',
            courseType: 'REQUIRED',
            status: 'ACTIVE',
          },
          skip: 5,
          take: 5,
        })
      )
    })
  })

  describe('getCourseDetail', () => {
    it('应该返回课程详情与先修课', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        ...buildCourse(),
        department: { id: 'dept-1', name: '计算机学院' },
        teacher: { user: { id: 'teacher-1', realName: '李老师' } },
        prerequisites: [
          {
            prerequisite: {
              id: 'course-pre-1',
              code: 'CS100',
              name: '程序设计基础',
            },
          },
        ],
      })

      const result = await courseService.getCourseDetail('course-1')

      expect(result.credits).toBe(3.5)
      expect(result.teacher_name).toBe('李老师')
      expect(result.prerequisites).toHaveLength(1)
      expect(result.update_at).toEqual(new Date('2026-01-02T10:00:00Z'))
    })

    it('课程不存在时应该抛出 NotFoundError', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null)

      await expect(courseService.getCourseDetail('missing')).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('createCourse', () => {
    it('应该创建课程、先修课关联和系统日志', async () => {
      prismaMock.course.create.mockResolvedValue(buildCourse({ id: 'course-new', code: 'CS201' }))
      prismaMock.coursePrerequisite.createMany.mockResolvedValue({ count: 1 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 'log-1' })

      const result = await courseService.createCourse(
        {
          code: 'CS201',
          name: '算法设计',
          credits: 3.5,
          hours: 64,
          course_type: 'REQUIRED' as CourseType,
          category: '专业核心课',
          department_id: 'dept-1',
          teacher_id: 'teacher-1',
          description: '算法课程',
          assessment_method: '考试',
          prerequisite_ids: ['course-pre-1'],
        },
        mockRequest
      )

      expect(result).toEqual({ id: 'course-new', code: 'CS201', name: '数据结构' })
      expect(prismaMock.coursePrerequisite.createMany).toHaveBeenCalledWith({
        data: [{ courseId: 'course-new', prerequisiteId: 'course-pre-1' }],
      })
      expect(prismaMock.systemLog.create).toHaveBeenCalled()
    })
  })

  describe('updateCourse', () => {
    it('课程不存在时应该抛出 NotFoundError', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null)

      await expect(
        courseService.updateCourse('missing', { name: '新课程名' }, mockRequest)
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('应该更新课程并记录日志', async () => {
      prismaMock.course.findUnique.mockResolvedValue(buildCourse({ name: '旧课程名' }))
      prismaMock.coursePrerequisite.deleteMany.mockResolvedValue({ count: 1 })
      prismaMock.course.update.mockResolvedValue(buildCourse({ name: '新课程名' }))
      prismaMock.coursePrerequisite.createMany.mockResolvedValue({ count: 1 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 'log-2' })

      const result = await courseService.updateCourse(
        'course-1',
        {
          name: '新课程名',
          credits: 4,
          description: '新描述',
          prerequisite_ids: ['course-pre-1'],
        },
        mockRequest
      )

      expect(prismaMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'course-1' },
        })
      )
      expect(prismaMock.systemLog.create).toHaveBeenCalled()
      expect(result.name).toBe('新课程名')
    })
  })

  describe('deleteCourse', () => {
    it('课程不存在时应该抛出 NotFoundError', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null)

      await expect(courseService.deleteCourse('missing', mockRequest)).rejects.toBeInstanceOf(
        NotFoundError
      )
    })

    it('应该删除课程并记录日志', async () => {
      prismaMock.course.findUnique.mockResolvedValue(buildCourse({ name: '待删除课程' }))
      prismaMock.course.delete.mockResolvedValue(buildCourse())
      prismaMock.systemLog.create.mockResolvedValue({ id: 'log-3' })

      await courseService.deleteCourse('course-1', mockRequest)

      expect(prismaMock.course.delete).toHaveBeenCalledWith({ where: { id: 'course-1' } })
      expect(prismaMock.systemLog.create).toHaveBeenCalled()
    })
  })

  describe('batchCreateCourses', () => {
    it('应该在事务客户端上创建课程', async () => {
      const txCourseCreate = vi.fn().mockResolvedValue(buildCourse({ id: 'course-tx-1' }))
      prismaMock.systemLog.create.mockResolvedValue({ id: 'log-tx-1' })

      prismaMock.$transaction.mockImplementation(async (input: unknown) => {
        if (typeof input === 'function') {
          const tx = {
            course: {
              findMany: prismaMock.course.findMany,
              findUnique: prismaMock.course.findUnique,
              create: txCourseCreate,
              update: prismaMock.course.update,
              delete: prismaMock.course.delete,
              count: prismaMock.course.count,
            },
            coursePrerequisite: {
              createMany: prismaMock.coursePrerequisite.createMany,
              deleteMany: prismaMock.coursePrerequisite.deleteMany,
            },
            systemLog: {
              create: prismaMock.systemLog.create,
            },
          }
          return input(tx)
        }
        return Promise.all(input as Promise<unknown>[])
      })

      await courseService.batchCreateCourses(
        [
          {
            code: 'CS401',
            name: '事务课程',
            credits: 2,
            course_type: 'REQUIRED' as CourseType,
          },
        ],
        mockRequest
      )

      expect(txCourseCreate).toHaveBeenCalledTimes(1)
      expect(prismaMock.course.create).not.toHaveBeenCalled()
    })

    it('应该汇总批量创建结果', async () => {
      prismaMock.course.create
        .mockResolvedValueOnce(buildCourse({ id: 'course-1' }))
        .mockRejectedValueOnce(new Error('Unique constraint failed on the fields: (`code`)'))
      prismaMock.systemLog.create.mockResolvedValue({ id: 'log-4' })

      const result = await courseService.batchCreateCourses(
        [
          {
            code: 'CS301',
            name: '课程1',
            credits: 2,
            course_type: 'REQUIRED' as CourseType,
          },
          {
            code: 'CS301',
            name: '课程2',
            credits: 2,
            course_type: 'REQUIRED' as CourseType,
          },
        ],
        mockRequest
      )

      expect(result.total).toBe(2)
      expect(result.success_count).toBe(1)
      expect(result.failed_count).toBe(1)
      expect(result.results[0]).toMatchObject({ status: 'success', id: 'course-1' })
      expect(result.results[1]).toMatchObject({ status: 'failed' })
    })
  })
})
