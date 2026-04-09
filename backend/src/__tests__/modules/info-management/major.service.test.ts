/**
 * 专业管理服务单元测试
 * 测试专业 CRUD 操作的业务逻辑
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '@stss/shared'
import type { DegreeType } from '@prisma/client'

const prismaMock = vi.hoisted(() => ({
  major: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  department: {
    findUnique: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
  curriculum: {
    findMany: vi.fn(),
  },
  systemLog: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../../../shared/prisma/client.js', () => ({
  default: prismaMock,
}))

import { majorService } from '../../../modules/info-management/major.service.js'

// 模拟 Prisma Decimal 类型
class MockDecimal {
  constructor(private value: number) {}
  toNumber() {
    return this.value
  }
}

function buildMajor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'major-1',
    name: '计算机科学与技术',
    code: 'CS',
    degreeType: 'BACHELOR' as DegreeType,
    totalCredits: new MockDecimal(150),
    departmentId: 'dept-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function buildDepartment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dept-1',
    name: '计算机学院',
    description: '计算机科学与技术学院',
    code: 'CS',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function buildStudent(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    studentNumber: '2021001',
    grade: '2021',
    user: {
      realName: '张三',
    },
    ...overrides,
  }
}

function buildCurriculum(overrides: Record<string, unknown> = {}) {
  return {
    id: 'curriculum-1',
    name: '2021级培养方案',
    year: 2021,
    totalCredits: new MockDecimal(150),
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

  // Default $transaction implementation
  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      const tx = {
        major: {
          findMany: prismaMock.major.findMany,
          findUnique: prismaMock.major.findUnique,
          create: prismaMock.major.create,
          update: prismaMock.major.update,
          delete: prismaMock.major.delete,
          count: prismaMock.major.count,
        },
        systemLog: {
          findMany: prismaMock.systemLog.findMany,
          findFirst: prismaMock.systemLog.findFirst,
          create: prismaMock.systemLog.create,
        },
      }
      return input(tx)
    }
    return Promise.all(input as Promise<unknown>[])
  })
})

describe('MajorService', () => {
  // ==================== getMajorList ====================
  describe('getMajorList', () => {
    it('应该成功获取专业列表（分页）', async () => {
      const majors = [
        {
          ...buildMajor(),
          department: buildDepartment(),
          _count: { students: 100 },
        },
        {
          ...buildMajor({ id: 'major-2', name: '软件工程' }),
          department: buildDepartment(),
          _count: { students: 80 },
        },
      ]

      prismaMock.major.findMany.mockResolvedValue(majors)
      prismaMock.major.count.mockResolvedValue(2)
      prismaMock.systemLog.findMany.mockResolvedValue([])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
      })

      expect(result.items).toHaveLength(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.page_size).toBe(10)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.total_page).toBe(1)
    })

    it('应该支持按院系筛选', async () => {
      const majors = [
        {
          ...buildMajor({ departmentId: 'dept-1' }),
          department: buildDepartment(),
          _count: { students: 100 },
        },
      ]

      prismaMock.major.findMany.mockResolvedValue(majors)
      prismaMock.major.count.mockResolvedValue(1)
      prismaMock.systemLog.findMany.mockResolvedValue([])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
        department_id: 'dept-1',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.major.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-1' },
        })
      )
    })

    it('应该支持关键词搜索（name 或 code）', async () => {
      const majors = [
        {
          ...buildMajor(),
          department: buildDepartment(),
          _count: { students: 100 },
        },
      ]

      prismaMock.major.findMany.mockResolvedValue(majors)
      prismaMock.major.count.mockResolvedValue(1)
      prismaMock.systemLog.findMany.mockResolvedValue([])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
        keyword: '计算机',
      })

      expect(result.items).toHaveLength(1)
      expect(prismaMock.major.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '计算机', mode: 'insensitive' } },
              { code: { contains: '计算机', mode: 'insensitive' } },
            ],
          },
        })
      )
    })

    it('应该包含创建时间（从 systemLog 获取）', async () => {
      const majors = [
        {
          ...buildMajor({ id: 'major-1' }),
          department: buildDepartment(),
          _count: { students: 100 },
        },
      ]

      const createdAt = new Date('2026-01-01T10:00:00Z')
      prismaMock.major.findMany.mockResolvedValue(majors)
      prismaMock.major.count.mockResolvedValue(1)
      prismaMock.systemLog.findMany.mockResolvedValue([
        {
          resourceId: 'major-1',
          createdAt,
        },
      ])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
      })

      expect(result.items[0].created_at).toEqual(createdAt)
    })

    it('当没有创建日志时应该返回默认时间', async () => {
      const majors = [
        {
          ...buildMajor({ id: 'major-1' }),
          department: buildDepartment(),
          _count: { students: 100 },
        },
      ]

      prismaMock.major.findMany.mockResolvedValue(majors)
      prismaMock.major.count.mockResolvedValue(1)
      prismaMock.systemLog.findMany.mockResolvedValue([])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
      })

      expect(result.items[0].created_at).toEqual(new Date(0))
    })

    it('应该正确计算总页数', async () => {
      prismaMock.major.findMany.mockResolvedValue([])
      prismaMock.major.count.mockResolvedValue(25)
      prismaMock.systemLog.findMany.mockResolvedValue([])

      const result = await majorService.getMajorList({
        page: 1,
        page_size: 10,
      })

      expect(result.pagination.total_page).toBe(3)
    })
  })

  // ==================== getMajorDetail ====================
  describe('getMajorDetail', () => {
    it('应该成功获取专业详情', async () => {
      const major = {
        ...buildMajor(),
        department: buildDepartment(),
        students: [buildStudent()],
        curriculums: [buildCurriculum()],
      }

      prismaMock.major.findUnique.mockResolvedValue(major)
      prismaMock.systemLog.findFirst.mockResolvedValue({
        createdAt: new Date('2026-01-01T10:00:00Z'),
      })

      const result = await majorService.getMajorDetail('major-1')

      expect(result.id).toBe('major-1')
      expect(result.name).toBe('计算机科学与技术')
      expect(result.department_id).toBe('dept-1')
      expect(result.students).toHaveLength(1)
      expect(result.curriculums).toHaveLength(1)
    })

    it('应该包含学生列表', async () => {
      const major = {
        ...buildMajor(),
        department: buildDepartment(),
        students: [
          buildStudent({ userId: 'user-1', studentNumber: '2021001', grade: '2021' }),
          buildStudent({ userId: 'user-2', studentNumber: '2021002', grade: '2021' }),
        ],
        curriculums: [],
      }

      prismaMock.major.findUnique.mockResolvedValue(major)
      prismaMock.systemLog.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-01') })
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-02') })

      const result = await majorService.getMajorDetail('major-1')

      expect(result.students).toHaveLength(2)
      expect(result.students[0].user_id).toBe('user-1')
      expect(result.students[0].student_number).toBe('2021001')
    })

    it('应该包含培养方案列表', async () => {
      const major = {
        ...buildMajor(),
        department: buildDepartment(),
        students: [],
        curriculums: [
          buildCurriculum({ id: 'curriculum-1', name: '2021级培养方案', year: 2021 }),
          buildCurriculum({ id: 'curriculum-2', name: '2022级培养方案', year: 2022 }),
        ],
      }

      prismaMock.major.findUnique.mockResolvedValue(major)
      prismaMock.systemLog.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-01') })
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-02') })

      const result = await majorService.getMajorDetail('major-1')

      expect(result.curriculums).toHaveLength(2)
      expect(result.curriculums[0].name).toBe('2021级培养方案')
      expect(result.curriculums[0].year).toBe(2021)
    })

    it('应该包含创建和更新时间', async () => {
      const major = {
        ...buildMajor(),
        department: buildDepartment(),
        students: [],
        curriculums: [],
      }

      prismaMock.major.findUnique.mockResolvedValue(major)
      // 代码中先查询 updateLog，后查询 createLog
      prismaMock.systemLog.findFirst
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-02T10:00:00Z') }) // updateLog
        .mockResolvedValueOnce({ createdAt: new Date('2026-01-01T10:00:00Z') }) // createLog

      const result = await majorService.getMajorDetail('major-1')

      expect(result.created_at).toEqual(new Date('2026-01-01T10:00:00Z'))
      expect(result.updated_at).toEqual(new Date('2026-01-02T10:00:00Z'))
    })

    it('专业不存在应该抛出 NotFoundError', async () => {
      prismaMock.major.findUnique.mockResolvedValue(null)

      await expect(majorService.getMajorDetail('missing-major')).rejects.toBeInstanceOf(
        NotFoundError
      )
      await expect(majorService.getMajorDetail('missing-major')).rejects.toThrow('专业不存在')
    })

    it('当没有日志时应该返回默认时间', async () => {
      const major = {
        ...buildMajor(),
        department: buildDepartment(),
        students: [],
        curriculums: [],
      }

      prismaMock.major.findUnique.mockResolvedValue(major)
      prismaMock.systemLog.findFirst.mockResolvedValue(null)

      const result = await majorService.getMajorDetail('major-1')

      expect(result.created_at).toEqual(new Date(0))
      expect(result.updated_at).toEqual(new Date(0))
    })
  })

  // ==================== createMajor ====================
  describe('createMajor', () => {
    it('应该成功创建专业', async () => {
      const newMajor = buildMajor({ id: 'new-major' })
      prismaMock.major.create.mockResolvedValue(newMajor)
      prismaMock.systemLog.create.mockResolvedValue({})

      const result = await majorService.createMajor(
        {
          department_id: 'dept-1',
          name: '计算机科学与技术',
          code: 'CS',
          degree_type: 'BACHELOR',
          total_credits: 150,
        },
        mockRequest
      )

      expect(result.id).toBe('new-major')
      expect(prismaMock.major.create).toHaveBeenCalledWith({
        data: {
          department: { connect: { id: 'dept-1' } },
          name: '计算机科学与技术',
          code: 'CS',
          degreeType: 'BACHELOR',
          totalCredits: 150,
        },
      })
    })

    it('应该创建 systemLog 记录', async () => {
      const newMajor = buildMajor({ id: 'new-major', name: '软件工程' })
      prismaMock.major.create.mockResolvedValue(newMajor)
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.createMajor(
        {
          department_id: 'dept-1',
          name: '软件工程',
        },
        mockRequest
      )

      expect(prismaMock.systemLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'create',
          resourceType: 'major',
          resourceId: 'new-major',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          details: '创建了专业 软件工程 (ID: new-major)',
        },
      })
    })

    it('应该支持可选字段', async () => {
      const newMajor = buildMajor({
        id: 'new-major',
        code: null,
        degreeType: null,
        totalCredits: null,
      })
      prismaMock.major.create.mockResolvedValue(newMajor)
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.createMajor(
        {
          department_id: 'dept-1',
          name: '新专业',
        },
        mockRequest
      )

      expect(prismaMock.major.create).toHaveBeenCalledWith({
        data: {
          department: { connect: { id: 'dept-1' } },
          name: '新专业',
          code: undefined,
          degreeType: undefined,
          totalCredits: undefined,
        },
      })
    })
  })

  // ==================== updateMajor ====================
  describe('updateMajor', () => {
    it('应该成功更新专业名称和学分', async () => {
      const existingMajor = buildMajor({ name: '计算机科学与技术', totalCredits: 150 })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.update.mockResolvedValue({})
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.updateMajor(
        'major-1',
        {
          name: '计算机科学',
          total_credits: 160,
        },
        mockRequest
      )

      expect(prismaMock.major.update).toHaveBeenCalledWith({
        where: { id: 'major-1' },
        data: {
          name: '计算机科学',
          totalCredits: 160,
        },
      })
    })

    it('应该创建 systemLog 记录并包含修改前后的值', async () => {
      const existingMajor = buildMajor({ name: '计算机科学与技术', totalCredits: 150 })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.update.mockResolvedValue({})
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.updateMajor(
        'major-1',
        {
          name: '计算机科学',
          total_credits: 160,
        },
        mockRequest
      )

      const logDetails =
        '修改了专业 \n专业ID:major-1 \n修改前： name:计算机科学与技术 totalCredits:150\n 修改后： name:计算机科学 totalCredits:160'
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'update',
          resourceType: 'major',
          resourceId: 'major-1',
          details: logDetails,
        }),
      })
    })

    it('专业不存在应该抛出 NotFoundError', async () => {
      prismaMock.major.findUnique.mockResolvedValue(null)

      await expect(
        majorService.updateMajor('missing-major', { name: '新名称' }, mockRequest)
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        majorService.updateMajor('missing-major', { name: '新名称' }, mockRequest)
      ).rejects.toThrow('专业不存在')
    })

    it('应该支持只更新名称', async () => {
      const existingMajor = buildMajor({ name: '计算机科学与技术' })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.update.mockResolvedValue({})
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.updateMajor('major-1', { name: '计算机科学' }, mockRequest)

      expect(prismaMock.major.update).toHaveBeenCalledWith({
        where: { id: 'major-1' },
        data: {
          name: '计算机科学',
          totalCredits: undefined,
        },
      })
    })

    it('应该支持只更新学分', async () => {
      const existingMajor = buildMajor({ totalCredits: 150 })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.update.mockResolvedValue({})
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.updateMajor('major-1', { total_credits: 160 }, mockRequest)

      expect(prismaMock.major.update).toHaveBeenCalledWith({
        where: { id: 'major-1' },
        data: {
          name: undefined,
          totalCredits: 160,
        },
      })
    })
  })

  // ==================== deleteMajor ====================
  describe('deleteMajor', () => {
    it('应该成功删除专业', async () => {
      const existingMajor = buildMajor({ name: '计算机科学与技术' })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.delete.mockResolvedValue(existingMajor)
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.deleteMajor('major-1', mockRequest)

      expect(prismaMock.major.delete).toHaveBeenCalledWith({
        where: { id: 'major-1' },
      })
    })

    it('应该创建 systemLog 记录', async () => {
      const existingMajor = buildMajor({ id: 'major-1', name: '计算机科学与技术' })
      prismaMock.major.findUnique.mockResolvedValue(existingMajor)
      prismaMock.major.delete.mockResolvedValue(existingMajor)
      prismaMock.systemLog.create.mockResolvedValue({})

      await majorService.deleteMajor('major-1', mockRequest)

      expect(prismaMock.systemLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'delete',
          resourceType: 'major',
          resourceId: 'major-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          details: '删除了专业 计算机科学与技术 (ID: major-1)',
        },
      })
    })

    it('专业不存在应该抛出 NotFoundError', async () => {
      prismaMock.major.findUnique.mockResolvedValue(null)

      await expect(majorService.deleteMajor('missing-major', mockRequest)).rejects.toBeInstanceOf(
        NotFoundError
      )
      await expect(majorService.deleteMajor('missing-major', mockRequest)).rejects.toThrow(
        '专业不存在'
      )
    })
  })
})
