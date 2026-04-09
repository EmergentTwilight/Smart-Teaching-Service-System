/**
 * 测试 Mock 工具
 * 提供各种测试用的 Mock 对象
 */
import type { Gender, UserStatus, Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

// ==================== User Mocks ====================

interface MockUserOptions {
  id?: string
  username?: string
  email?: string | null
  phone?: string | null
  realName?: string
  avatarUrl?: string | null
  gender?: Gender | null
  status?: UserStatus
  lastLoginAt?: Date | null
  userRoles?: Array<{
    role: {
      id: string
      name: string
      code: string
      description?: string
      permissions: Array<{
        permission: { id?: string; name?: string; code: string; resource?: string; action?: string }
      }>
      userRoles?: unknown[]
      rolePermissions?: unknown[]
    }
  }>
}

/**
 * 创建 Mock User 对象
 */
type MockUserType = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    }
  }
}>

export function mockUser(options: MockUserOptions = {}): MockUserType {
  const id = options.id || uuidv4()
  const now = new Date()

  return {
    id,
    username: options.username || 'testuser',
    passwordHash: 'hashed_password',
    email: options.email ?? 'test@example.com',
    phone: options.phone ?? '13800138000',
    realName: options.realName || 'Test User',
    avatarUrl: options.avatarUrl ?? null,
    gender: options.gender ?? 'MALE',
    status: options.status ?? 'ACTIVE',
    lastLoginAt: options.lastLoginAt ?? null,
    createdAt: now,
    updatedAt: now,
    userRoles: options.userRoles || [
      {
        role: {
          id: uuidv4(),
          name: 'Student',
          code: 'student',
          description: 'Student role',
          permissions: [
            {
              permission: {
                id: uuidv4(),
                name: 'Read Course',
                code: 'course:read',
                resource: 'course',
                action: 'read',
              },
            },
            {
              permission: {
                id: uuidv4(),
                name: 'Update Profile',
                code: 'profile:update',
                resource: 'profile',
                action: 'update',
              },
            },
          ],
          userRoles: [],
          rolePermissions: [],
        },
      },
    ],
    student: null,
    teacher: null,
    admin: null,
    posts: [],
    comments: [],
    logs: [],
    scoreModificationLogs: [],
    refreshTokens: [],
    activationTokens: [],
    passwordResetTokens: [],
  } as unknown as MockUserType
}

/**
 * 创建 Mock Admin User
 */
export function mockAdminUser(overrides: MockUserOptions = {}) {
  return mockUser({
    ...overrides,
    username: overrides.username || 'admin',
    userRoles: [
      {
        role: {
          id: uuidv4(),
          name: 'Administrator',
          code: 'admin',
          description: 'Admin role',
          permissions: [
            {
              permission: {
                id: uuidv4(),
                name: 'Manage Users',
                code: 'user:manage',
                resource: 'user',
                action: 'manage',
              },
            },
            {
              permission: {
                id: uuidv4(),
                name: 'Manage Roles',
                code: 'role:manage',
                resource: 'role',
                action: 'manage',
              },
            },
          ],
          userRoles: [],
          rolePermissions: [],
        },
      },
    ],
  })
}

// ==================== Department Mocks ====================

interface MockDepartmentOptions {
  id?: string
  name?: string
  code?: string | null
  description?: string | null
  majors?: Array<{
    id: string
    name: string
    code: string | null
  }>
}

/**
 * 创建 Mock Department 对象
 */
export function mockDepartment(options: MockDepartmentOptions = {}) {
  return {
    id: options.id || uuidv4(),
    name: options.name || 'Computer Science',
    code: options.code ?? 'CS',
    description: options.description ?? 'Computer Science Department',
    majors: options.majors || [],
    teachers: [],
    admins: [],
    courses: [],
  }
}

// ==================== Role Mocks ====================

interface MockRoleOptions {
  id?: string
  name?: string
  code?: string
  description?: string | null
  permissions?: Array<{
    id: string
    name: string
    code: string
    resource: string
    action: string
  }>
}

/**
 * 创建 Mock Role 对象
 */
export function mockRole(options: MockRoleOptions = {}) {
  return {
    id: options.id || uuidv4(),
    name: options.name || 'Test Role',
    code: options.code || 'test_role',
    description: options.description ?? 'A test role',
    permissions: options.permissions || [],
    userRoles: [],
    rolePermissions: [],
  }
}

// ==================== Refresh Token Mocks ====================

interface MockRefreshTokenOptions {
  id?: string
  userId?: string
  tokenHash?: string
  isUsed?: boolean
  expiresAt?: Date
  user?: Prisma.UserGetPayload<{ include: typeof userAuthInclude }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userAuthInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude

/**
 * 创建 Mock RefreshToken 对象
 */
export function mockRefreshToken(options: MockRefreshTokenOptions = {}) {
  const userId = options.userId || uuidv4()
  const now = new Date()

  return {
    id: options.id || uuidv4(),
    userId,
    tokenHash: options.tokenHash || 'mock_token_hash',
    isUsed: options.isUsed ?? false,
    expiresAt: options.expiresAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: now,
    user: options.user || mockUser({ id: userId }),
  }
}

// ==================== System Log Mocks ====================

interface MockSystemLogOptions {
  id?: bigint
  userId?: string | null
  action?: string
  resourceType?: string | null
  resourceId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  details?: Prisma.InputJsonValue
  createdAt?: Date
}

/**
 * 创建 Mock SystemLog 对象
 */
export function mockSystemLog(options: MockSystemLogOptions = {}) {
  const now = options.createdAt || new Date()

  return {
    id: options.id || BigInt(1),
    userId: options.userId ?? null,
    action: options.action || 'test:action',
    resourceType: options.resourceType ?? null,
    resourceId: options.resourceId ?? null,
    ipAddress: options.ipAddress ?? '127.0.0.1',
    userAgent: options.userAgent ?? 'test-agent',
    details: options.details ?? null,
    createdAt: now,
    user: null,
  }
}

// ==================== Pagination Mocks ====================

interface MockPaginationOptions {
  page?: number
  pageSize?: number
  total?: number
}

/**
 * 创建 Mock 分页响应
 */
export function mockPagination<T>(items: T[], options: MockPaginationOptions = {}) {
  const page = options.page || 1
  const pageSize = options.pageSize || 10
  const total = options.total ?? items.length

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ==================== JWT Payload Mocks ====================

interface MockJwtPayloadOptions {
  userId?: string
  username?: string
  roles?: string[]
  type?: 'access' | 'refresh'
}

/**
 * 创建 Mock JWT Payload
 */
export function mockJwtPayload(options: MockJwtPayloadOptions = {}) {
  return {
    userId: options.userId || uuidv4(),
    username: options.username || 'testuser',
    roles: options.roles || ['student'],
    type: options.type || 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  }
}
