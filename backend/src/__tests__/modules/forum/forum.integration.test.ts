/**
 * 论坛模块集成测试
 * 使用真实数据库进行测试
 *
 * 运行方式：
 * 1. 确保测试数据库已创建并配置了 DATABASE_URL 环境变量
 * 2. 运行: pnpm --filter backend test forum.integration
 *
 * 注意：此测试会清空 forum_posts、forum_comments、forum_attachments 等表的数据
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient, PostType } from '@prisma/client'
import { ForumService } from '../../../modules/forum/forum.service.js'
import { NotFoundError, ForbiddenError, ValidationError } from '@stss/shared'

// 使用独立的 Prisma Client 实例用于测试
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 测试数据 ID 缓存
const testData = {
  courseId: '',
  courseOfferingId: '',
  teacherUserId: '',
  studentUserId: '',
  adminUserId: '',
}

// 清理函数
async function cleanupDatabase() {
  // 按依赖顺序删除
  await prisma.forumAttachment.deleteMany({})
  await prisma.forumComment.deleteMany({})
  await prisma.forumPost.deleteMany({})
  await prisma.enrollment.deleteMany({})
  await prisma.courseOffering.deleteMany({})
  await prisma.course.deleteMany({})
  await prisma.userRole.deleteMany({})
  await prisma.refreshToken.deleteMany({})
  await prisma.systemLog.deleteMany({})

  await prisma.user.deleteMany({
    where: {
      OR: [{ username: { startsWith: 'itest_forum_' } }, { email: { startsWith: 'itest_forum_' } }],
    },
  })

  await prisma.role.deleteMany({
    where: { code: { startsWith: 'itest_forum_' } },
  })
}

// 辅助函数：创建测试用户
async function createTestUser(username: string, roleCode: string) {
  const role = await prisma.role.upsert({
    where: { code: roleCode },
    update: {},
    create: {
      code: roleCode,
      name: `测试${roleCode}`,
      description: `集成测试角色: ${roleCode}`,
    },
  })

  const user = await prisma.user.create({
    data: {
      username: `itest_forum_${username}`,
      passwordHash: 'hashed_password',
      email: `itest_forum_${username}@test.com`,
      realName: `测试${username}`,
      status: 'ACTIVE',
    },
  })

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  })

  return user
}

// 辅助函数：创建测试课程
async function createTestCourse() {
  const course = await prisma.course.create({
    data: {
      code: `ITEST_FORUM_${Date.now()}`,
      name: '集成测试课程',
      credits: 3,
      totalHours: 48,
      departmentId: '', // 需要从数据库获取或跳过外键约束
    },
  })
  return course
}

// 辅助函数：创建测试开课记录
async function createTestCourseOffering(courseId: string, teacherId: string) {
  const offering = await prisma.courseOffering.create({
    data: {
      courseId,
      teacherId,
      semester: '2025-2026-2',
      status: 'ACTIVE',
    },
  })
  return offering
}

// 辅助函数：创建测试帖子
async function createTestPost(
  authorId: string,
  courseOfferingId: string,
  overrides: Record<string, unknown> = {}
) {
  const post = await prisma.forumPost.create({
    data: {
      courseOfferingId,
      authorId,
      title: (overrides.title as string) || '集成测试帖子标题',
      content: (overrides.content as string) || '这是集成测试的帖子内容。',
      postType: (overrides.postType as PostType) || 'QUESTION',
      status: 'NORMAL',
      isPinned: false,
      isAnnouncement: false,
      viewCount: 0,
      ...overrides,
    },
  })
  return post
}

beforeAll(async () => {
  // 连接数据库
  await prisma.$connect()

  // 清理测试数据
  await cleanupDatabase()

  // 创建测试用户
  const teacher = await createTestUser('teacher', 'teacher')
  const student = await createTestUser('student', 'student')
  const admin = await createTestUser('admin', 'admin')

  testData.teacherUserId = teacher.id
  testData.studentUserId = student.id
  testData.adminUserId = admin.id

  // 创建测试课程
  const course = await createTestCourse()
  testData.courseId = course.id

  // 创建开课记录
  const offering = await createTestCourseOffering(course.id, teacher.id)
  testData.courseOfferingId = offering.id

  // 学生选课
  await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseOfferingId: offering.id,
      status: 'ENROLLED',
    },
  })
}, 30000)

afterAll(async () => {
  await cleanupDatabase()
  await prisma.$disconnect()
})

beforeEach(async () => {
  // 清理帖子数据（保留用户、课程、开课和选课记录）
  await prisma.forumAttachment.deleteMany({})
  await prisma.forumComment.deleteMany({})
  await prisma.forumPost.deleteMany({})
  await prisma.systemLog.deleteMany({})
})

describe('ForumService Integration Tests', () => {
  // ==================== 帖子 CRUD ====================
  describe('帖子 CRUD', () => {
    describe('createPost', () => {
      it('应该成功创建帖子并写入数据库', async () => {
        const result = await ForumService.createPost(testData.studentUserId, {
          courseOfferingId: testData.courseOfferingId,
          title: '数据库索引优化问题',
          content: '请问大家在设计数据库索引时有什么最佳实践？',
          postType: 'QUESTION',
        })

        // 验证返回值
        expect(result.title).toBe('数据库索引优化问题')
        expect(result.postType).toBe('QUESTION')
        expect(result.status).toBe('NORMAL')

        // 验证数据库中真实存在该帖子
        const dbPost = await prisma.forumPost.findUnique({
          where: { id: result.id },
        })

        expect(dbPost).not.toBeNull()
        expect(dbPost!.title).toBe('数据库索引优化问题')
        expect(dbPost!.authorId).toBe(testData.studentUserId)
        expect(dbPost!.courseOfferingId).toBe(testData.courseOfferingId)
      })

      it('无权访问课程的用户发帖应该抛出 ForbiddenError', async () => {
        // 创建一个没有选课的用户
        const outsider = await createTestUser('outsider', 'student')

        await expect(
          ForumService.createPost(outsider.id, {
            courseOfferingId: testData.courseOfferingId,
            title: '无权发帖',
            content: '内容',
            postType: 'QUESTION',
          })
        ).rejects.toBeInstanceOf(ForbiddenError)
      })

      it('教师可以发布公告', async () => {
        const result = await ForumService.createPost(testData.teacherUserId, {
          courseOfferingId: testData.courseOfferingId,
          title: '重要公告',
          content: '期末考试通知',
          postType: 'ANNOUNCEMENT',
          isAnnouncement: true,
        })

        expect(result.isAnnouncement).toBe(true)
        expect(result.postType).toBe('ANNOUNCEMENT')

        const dbPost = await prisma.forumPost.findUnique({
          where: { id: result.id },
        })

        expect(dbPost).not.toBeNull()
        expect(dbPost!.isAnnouncement).toBe(true)
      })

      it('学生不能发布公告', async () => {
        await expect(
          ForumService.createPost(testData.studentUserId, {
            courseOfferingId: testData.courseOfferingId,
            title: '虚假公告',
            content: '内容',
            postType: 'ANNOUNCEMENT',
            isAnnouncement: true,
          })
        ).rejects.toBeInstanceOf(ForbiddenError)
      })
    })

    describe('getPosts', () => {
      it('应该返回分页帖子列表', async () => {
        // 创建多个帖子
        for (let i = 0; i < 5; i++) {
          await createTestPost(testData.studentUserId, testData.courseOfferingId, {
            title: `测试帖子 ${i}`,
          })
        }

        const result = await ForumService.getPosts({ page: 1, pageSize: 3 }, testData.studentUserId)

        expect(result.data.length).toBeLessThanOrEqual(3)
        expect(result.pagination.total).toBeGreaterThanOrEqual(5)
        expect(result.pagination.totalPages).toBeGreaterThanOrEqual(2)
      })

      it('应该只返回用户有权限的帖子', async () => {
        // 学生创建帖子
        await createTestPost(testData.studentUserId, testData.courseOfferingId)

        const result = await ForumService.getPosts(
          { page: 1, pageSize: 20 },
          testData.studentUserId
        )

        expect(result.data.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('getPostDetail', () => {
      it('应该成功获取帖子详情并增加浏览量', async () => {
        const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

        const result = await ForumService.getPostDetail(post.id, testData.studentUserId)

        expect(result.id).toBe(post.id)
        expect(result.title).toBe('集成测试帖子标题')

        // 验证浏览量增加
        const dbPost = await prisma.forumPost.findUnique({ where: { id: post.id } })
        expect(dbPost!.viewCount).toBeGreaterThanOrEqual(1)
      })

      it('帖子不存在应该抛出 NotFoundError', async () => {
        await expect(
          ForumService.getPostDetail('00000000-0000-0000-0000-000000000000', testData.studentUserId)
        ).rejects.toBeInstanceOf(NotFoundError)
      })
    })

    describe('updatePost', () => {
      it('作者应该能编辑自己的帖子', async () => {
        const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

        const result = await ForumService.updatePost(
          post.id,
          testData.studentUserId,
          { title: '更新后的标题' },
          false
        )

        expect(result.title).toBe('更新后的标题')

        // 验证数据库已更新
        const dbPost = await prisma.forumPost.findUnique({ where: { id: post.id } })
        expect(dbPost!.title).toBe('更新后的标题')
      })

      it('非作者非管理员不能编辑', async () => {
        const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

        await expect(
          ForumService.updatePost(post.id, testData.teacherUserId, { title: '新标题' }, false)
        ).rejects.toBeInstanceOf(ForbiddenError)
      })
    })

    describe('deletePost', () => {
      it('作者应该能删除自己的帖子', async () => {
        const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

        await ForumService.deletePost(post.id, testData.studentUserId, false)

        // 验证逻辑删除
        const dbPost = await prisma.forumPost.findUnique({ where: { id: post.id } })
        expect(dbPost!.status).toBe('DELETED')
      })

      it('非作者非管理员不能删除', async () => {
        const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

        await expect(
          ForumService.deletePost(post.id, testData.teacherUserId, false)
        ).rejects.toBeInstanceOf(ForbiddenError)
      })
    })
  })

  // ==================== 评论管理 ====================
  describe('评论管理', () => {
    it('应该成功发表评论并验证数据库记录', async () => {
      const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

      const comment = await ForumService.createComment(post.id, testData.teacherUserId, {
        content: '这是一个很好的问题！',
      })

      expect(comment.content).toBe('这是一个很好的问题！')

      const dbComment = await prisma.forumComment.findUnique({
        where: { id: comment.id },
      })

      expect(dbComment).not.toBeNull()
      expect(dbComment!.postId).toBe(post.id)
      expect(dbComment!.authorId).toBe(testData.teacherUserId)
      expect(dbComment!.status).toBe('NORMAL')
    })

    it('应该支持嵌套回复', async () => {
      const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)

      // 一级评论
      const parentComment = await ForumService.createComment(post.id, testData.teacherUserId, {
        content: '教师回复',
      })

      // 二级回复
      const reply = await ForumService.createComment(post.id, testData.studentUserId, {
        content: '学生追问',
        parentId: parentComment.id,
      })

      expect(reply.depth).toBe(1)
      expect(reply.parentId).toBe(parentComment.id)
    })

    it('帖子不存在时评论应该抛出 NotFoundError', async () => {
      await expect(
        ForumService.createComment('00000000-0000-0000-0000-000000000000', testData.studentUserId, {
          content: '评论',
        })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('应该能删除评论', async () => {
      const post = await createTestPost(testData.studentUserId, testData.courseOfferingId)
      const comment = await ForumService.createComment(post.id, testData.studentUserId, {
        content: '待删除的评论',
      })

      await ForumService.deleteComment(comment.id, testData.studentUserId, false)

      const dbComment = await prisma.forumComment.findUnique({ where: { id: comment.id } })
      expect(dbComment!.status).toBe('DELETED')
    })
  })

  // ==================== 公告管理 ====================
  describe('公告管理', () => {
    it('教师应该能发布公告并验证数据库记录', async () => {
      const announcement = await ForumService.createAnnouncement(testData.teacherUserId, {
        courseOfferingId: testData.courseOfferingId,
        title: '期末考试安排',
        content: '期末考试将于第18周进行。',
        isPinned: true,
      })

      expect(announcement.title).toBe('期末考试安排')
      expect(announcement.isAnnouncement).toBe(true)
      expect(announcement.isPinned).toBe(true)

      const dbPost = await prisma.forumPost.findUnique({
        where: { id: announcement.id },
      })

      expect(dbPost).not.toBeNull()
      expect(dbPost!.isAnnouncement).toBe(true)
      expect(dbPost!.isPinned).toBe(true)
    })

    it('学生不能发布公告', async () => {
      await expect(
        ForumService.createAnnouncement(testData.studentUserId, {
          courseOfferingId: testData.courseOfferingId,
          title: '公告',
          content: '内容',
        })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  // ==================== 检索功能 ====================
  describe('检索功能', () => {
    it('应该根据关键字搜索到相关帖子', async () => {
      await createTestPost(testData.studentUserId, testData.courseOfferingId, {
        title: '关于数据库索引的优化技巧',
        content: 'B+树索引和哈希索引的区别...',
      })
      await createTestPost(testData.teacherUserId, testData.courseOfferingId, {
        title: '作业提交通知',
        content: '请按时提交作业',
      })

      const result = await ForumService.searchPosts(
        { keyword: '索引', page: 1, pageSize: 20 },
        testData.studentUserId
      )

      // 至少应该搜到 1 个包含"索引"的帖子
      expect(result.data.length).toBeGreaterThanOrEqual(1)
      expect(result.data.some((p) => p.title.includes('索引'))).toBe(true)
    })

    it('无匹配结果时应该返回空列表', async () => {
      const result = await ForumService.searchPosts(
        { keyword: '不存在的关键字xyz', page: 1, pageSize: 20 },
        testData.studentUserId
      )

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ==================== 统计功能 ====================
  describe('统计功能', () => {
    it('getUserStats 应该返回正确的统计', async () => {
      await createTestPost(testData.studentUserId, testData.courseOfferingId)

      const result = await ForumService.getUserStats({ userId: testData.studentUserId })

      expect(result.postCount).toBeGreaterThanOrEqual(1)
      expect(result.username).toBeDefined()
    })

    it('不存在的用户应该抛出 NotFoundError', async () => {
      await expect(
        ForumService.getUserStats({ userId: '00000000-0000-0000-0000-000000000000' })
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
