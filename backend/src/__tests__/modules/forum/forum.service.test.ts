import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError, ValidationError } from '@stss/shared'

// ==================== Mock Prisma ====================
const prismaMock = vi.hoisted(() => ({
  forumPost: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  forumComment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  forumAttachment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  courseOffering: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  enrollment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  systemLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
  PostType: {
    QUESTION: 'QUESTION',
    DISCUSSION: 'DISCUSSION',
    SHARE: 'SHARE',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
  },
  PostStatus: {
    NORMAL: 'NORMAL',
    HIDDEN: 'HIDDEN',
    DELETED: 'DELETED',
  },
}))

import { ForumService } from '../../../modules/forum/forum.service.js'

// ==================== Helper builders ====================
function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'alice',
    realName: 'Alice',
    avatarUrl: null,
    userRoles: [{ role: { code: 'student' } }],
    ...overrides,
  }
}

function buildAuthor() {
  return { id: 'user-1', username: 'alice', realName: 'Alice', avatarUrl: null }
}

function buildCourseOffering(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-offering-1',
    teacherId: 'teacher-1',
    course: { id: 'course-1', name: '数据库原理', code: 'CS301' },
    teacher: { user: { realName: '张老师' } },
    ...overrides,
  }
}

function buildCourseOfferingInfo() {
  return {
    id: 'course-offering-1',
    course: { id: 'course-1', name: '数据库原理', code: 'CS301' },
  }
}

function buildPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    title: '求助：数据库索引优化',
    content: '请问大家有什么最佳实践？',
    postType: 'QUESTION',
    status: 'NORMAL',
    isPinned: false,
    isAnnouncement: false,
    viewCount: 10,
    courseOfferingId: 'course-offering-1',
    authorId: 'user-1',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: null,
    author: buildAuthor(),
    courseOffering: buildCourseOfferingInfo(),
    attachments: [],
    ...overrides,
  }
}

function buildComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-2',
    parentId: null,
    content: '这是一个好问题！',
    depth: 0,
    status: 'NORMAL',
    createdAt: new Date('2026-01-15T12:00:00Z'),
    author: { id: 'user-2', username: 'bob', realName: 'Bob', avatarUrl: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()

  // Default mocks for access control — user is enrolled in course-offering-1
  prismaMock.enrollment.findFirst.mockResolvedValue({
    id: 'enrollment-1',
    studentId: 'user-1',
    courseOfferingId: 'course-offering-1',
    status: 'ENROLLED',
  })
  prismaMock.enrollment.findMany.mockResolvedValue([{ courseOfferingId: 'course-offering-1' }])
  prismaMock.courseOffering.findFirst.mockResolvedValue(null) // not a teacher
  prismaMock.courseOffering.findMany.mockResolvedValue([]) // no teacher courses

  // Default transaction: pass-through callback
  prismaMock.$transaction.mockImplementation(async (input: unknown) => {
    if (typeof input === 'function') {
      const tx = {
        forumPost: {
          create: prismaMock.forumPost.create,
          update: prismaMock.forumPost.update,
        },
        forumAttachment: {
          updateMany: prismaMock.forumAttachment.updateMany,
        },
        forumComment: {
          count: prismaMock.forumComment.count,
        },
      }
      return input(tx)
    }
    return Promise.all(input as Promise<unknown>[])
  })
})

// ==================== Post Management ====================
describe('ForumService — 帖子管理', () => {
  describe('createPost', () => {
    it('应该成功创建帖子并写入审计日志', async () => {
      prismaMock.forumPost.create.mockResolvedValue(buildPost())
      prismaMock.forumComment.count.mockResolvedValue(0)
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await ForumService.createPost('user-1', {
        courseOfferingId: 'course-offering-1',
        title: '求助：数据库索引优化',
        content: '请问大家有什么最佳实践？',
        postType: 'QUESTION',
      })

      expect(result.title).toBe('求助：数据库索引优化')
      expect(result.postType).toBe('QUESTION')
      expect(result.status).toBe('NORMAL')
      expect(prismaMock.forumPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-1',
            title: '求助：数据库索引优化',
            status: 'NORMAL',
            viewCount: 0,
          }),
        })
      )
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE_POST',
            userId: 'user-1',
            resourceType: 'post',
          }),
        })
      )
    })

    it('应该拒绝无权访问课程的用户发帖', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue(null)
      prismaMock.courseOffering.findFirst.mockResolvedValue(null)

      await expect(
        ForumService.createPost('user-1', {
          courseOfferingId: 'course-offering-1',
          title: '测试帖',
          content: '内容',
          postType: 'QUESTION',
        })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('应该拒绝非教师用户发布公告', async () => {
      await expect(
        ForumService.createPost('user-1', {
          courseOfferingId: 'course-offering-1',
          title: '公告',
          content: '公告内容',
          postType: 'ANNOUNCEMENT',
          isAnnouncement: true,
        })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('应该允许教师发布公告', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue(null)
      prismaMock.courseOffering.findFirst.mockResolvedValue(
        buildCourseOffering({ teacherId: 'user-1' })
      )
      prismaMock.forumPost.create.mockResolvedValue(
        buildPost({ isAnnouncement: true, postType: 'ANNOUNCEMENT' })
      )
      prismaMock.forumComment.count.mockResolvedValue(0)
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await ForumService.createPost('user-1', {
        courseOfferingId: 'course-offering-1',
        title: '正式公告',
        content: '公告内容',
        postType: 'ANNOUNCEMENT',
        isAnnouncement: true,
      })

      expect(result.isAnnouncement).toBe(true)
      expect(result.postType).toBe('ANNOUNCEMENT')
    })

    it('应该拒绝无效的帖子类型', async () => {
      await expect(
        ForumService.createPost('user-1', {
          courseOfferingId: 'course-offering-1',
          title: '测试',
          content: '内容',
          postType: 'INVALID' as any,
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('创建帖子时应该关联附件', async () => {
      prismaMock.forumPost.create.mockResolvedValue(buildPost())
      prismaMock.forumComment.count.mockResolvedValue(0)
      prismaMock.forumAttachment.updateMany.mockResolvedValue({ count: 2 })
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      await ForumService.createPost('user-1', {
        courseOfferingId: 'course-offering-1',
        title: '带附件的帖子',
        content: '内容',
        postType: 'DISCUSSION',
        attachmentIds: ['attachment-1', 'attachment-2'],
      })

      expect(prismaMock.forumAttachment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['attachment-1', 'attachment-2'] } },
        data: { postId: 'post-1' },
      })
    })
  })

  describe('getPosts', () => {
    it('应该返回分页帖子列表', async () => {
      const posts = [
        buildPost(),
        buildPost({ id: 'post-2', title: '第二个帖子', authorId: 'user-2' }),
      ]
      prismaMock.forumPost.findMany.mockResolvedValue(posts)
      prismaMock.forumPost.count.mockResolvedValue(2)
      prismaMock.forumComment.count.mockResolvedValue(0)

      const result = await ForumService.getPosts({ page: 1, pageSize: 20 }, 'user-1')

      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('应该支持按课程筛选', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([buildPost()])
      prismaMock.forumPost.count.mockResolvedValue(1)
      prismaMock.forumComment.count.mockResolvedValue(0)

      await ForumService.getPosts(
        { page: 1, pageSize: 20, courseOfferingId: 'course-offering-1' },
        'user-1'
      )

      expect(prismaMock.forumPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            courseOfferingId: 'course-offering-1',
          }),
        })
      )
    })

    it('应该支持按关键字搜索', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([buildPost()])
      prismaMock.forumPost.count.mockResolvedValue(1)
      prismaMock.forumComment.count.mockResolvedValue(0)

      await ForumService.getPosts({ page: 1, pageSize: 20, keyword: '索引' }, 'user-1')

      expect(prismaMock.forumPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '索引', mode: 'insensitive' } },
              { content: { contains: '索引', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })

    it('应该支持按帖子类型筛选', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([buildPost({ postType: 'QUESTION' })])
      prismaMock.forumPost.count.mockResolvedValue(1)
      prismaMock.forumComment.count.mockResolvedValue(0)

      await ForumService.getPosts({ page: 1, pageSize: 20, postType: 'QUESTION' }, 'user-1')

      expect(prismaMock.forumPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ postType: 'QUESTION' }),
        })
      )
    })

    it('应该只返回用户有权限访问的课程帖子', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([])
      prismaMock.forumPost.count.mockResolvedValue(0)
      prismaMock.forumComment.count.mockResolvedValue(0)

      await ForumService.getPosts({ page: 1, pageSize: 20 }, 'user-1')

      expect(prismaMock.forumPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'NORMAL',
          }),
        })
      )
    })
  })

  describe('getPostDetail', () => {
    it('应该成功获取帖子详情并增加浏览量', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValueOnce(buildPost()) // first findUnique
      prismaMock.forumPost.update.mockResolvedValueOnce(buildPost({ viewCount: 11 })) // increment
      prismaMock.forumPost.findUnique.mockResolvedValueOnce(buildPost({ viewCount: 11 })) // second findUnique from update return
      prismaMock.forumComment.count.mockResolvedValue(3)

      // Need to handle the fact that getPostDetail calls findUnique for the post,
      // then update, then findUnique again (from update return), then comment count
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ viewCount: 11 }))
      // Actually let's redo properly:
      // 1st: getPostDetail findUnique(postId) — returns post
      // 2nd: forumPost.update — returns updated post
      // Then comment count

      const post = await ForumService.getPostDetail('post-1', 'user-1')

      expect(post.id).toBe('post-1')
      expect(post.viewCount).toBeGreaterThanOrEqual(10)
      expect(prismaMock.forumPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { viewCount: { increment: 1 } },
        include: expect.any(Object),
      })
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(ForumService.getPostDetail('non-existent', 'user-1')).rejects.toBeInstanceOf(
        NotFoundError
      )
    })

    it('无权访问帖子应该抛出 ForbiddenError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(
        buildPost({ courseOfferingId: 'other-course' })
      )
      prismaMock.enrollment.findFirst.mockResolvedValue(null)
      prismaMock.courseOffering.findFirst.mockResolvedValue(null)

      await expect(ForumService.getPostDetail('post-1', 'user-1')).rejects.toBeInstanceOf(
        ForbiddenError
      )
    })
  })

  describe('updatePost', () => {
    it('应该成功更新帖子', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())
      prismaMock.forumPost.update.mockResolvedValue(buildPost({ title: '更新后的标题' }))

      const result = await ForumService.updatePost(
        'post-1',
        'user-1',
        { title: '更新后的标题' },
        false
      )

      expect(result.title).toBe('更新后的标题')
      expect(prismaMock.forumPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { title: '更新后的标题', updatedAt: expect.any(Date) },
        include: expect.any(Object),
      })
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.updatePost('non-existent', 'user-1', { title: '新标题' }, false)
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('非作者非管理员不能编辑', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ authorId: 'other-user' }))

      await expect(
        ForumService.updatePost('post-1', 'user-1', { title: '新标题' }, false)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('非管理员不能设置置顶', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())

      await expect(
        ForumService.updatePost('post-1', 'user-1', { isPinned: true }, false)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('管理员可以设置置顶', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())
      prismaMock.forumPost.update.mockResolvedValue(buildPost({ isPinned: true }))

      const result = await ForumService.updatePost('post-1', 'user-1', { isPinned: true }, true)
      expect(result.isPinned).toBe(true)
    })
  })

  describe('deletePost', () => {
    it('应该成功删除帖子（逻辑删除）', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())
      prismaMock.forumPost.update.mockResolvedValue(buildPost({ status: 'DELETED' }))
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      await ForumService.deletePost('post-1', 'user-1', false)

      expect(prismaMock.forumPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'DELETED', updatedAt: expect.any(Date) },
      })
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'DELETE_POST' }),
        })
      )
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(ForumService.deletePost('non-existent', 'user-1', false)).rejects.toBeInstanceOf(
        NotFoundError
      )
    })

    it('非作者非管理员不能删除', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ authorId: 'other-user' }))

      await expect(ForumService.deletePost('post-1', 'user-1', false)).rejects.toBeInstanceOf(
        ForbiddenError
      )
    })
  })

  describe('togglePinPost', () => {
    it('应该成功置顶帖子', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())
      prismaMock.forumPost.update.mockResolvedValue(buildPost({ isPinned: true }))
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await ForumService.togglePinPost('post-1', true, 'user-1')

      expect(result.isPinned).toBe(true)
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'PIN_POST' }),
        })
      )
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.togglePinPost('non-existent', true, 'user-1')
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ==================== Comment Management ====================
describe('ForumService — 评论管理', () => {
  describe('createComment', () => {
    it('应该成功创建一级评论', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ status: 'NORMAL' }))
      prismaMock.forumComment.create.mockResolvedValue(buildComment())

      const result = await ForumService.createComment('post-1', 'user-2', {
        content: '这是一个好问题！',
      })

      expect(result.content).toBe('这是一个好问题！')
      expect(result.depth).toBe(0)
      expect(prismaMock.forumComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId: 'post-1',
            authorId: 'user-2',
            status: 'NORMAL',
            depth: 0,
          }),
        })
      )
    })

    it('应该成功创建二级回复（嵌套评论）', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ status: 'NORMAL' }))
      prismaMock.forumComment.findUnique.mockResolvedValue(
        buildComment({ depth: 0, postId: 'post-1' })
      )
      prismaMock.forumComment.create.mockResolvedValue(
        buildComment({ id: 'comment-2', parentId: 'comment-1', depth: 1, content: '回复' })
      )

      const result = await ForumService.createComment('post-1', 'user-1', {
        content: '回复',
        parentId: 'comment-1',
      })

      expect(result.depth).toBe(1)
      expect(result.parentId).toBe('comment-1')
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.createComment('non-existent', 'user-1', { content: '评论' })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('帖子已隐藏/删除时应该拒绝评论', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ status: 'HIDDEN' }))

      await expect(
        ForumService.createComment('post-1', 'user-1', { content: '评论' })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('父评论不属于该帖子时应该抛出 ValidationError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ status: 'NORMAL' }))
      prismaMock.forumComment.findUnique.mockResolvedValue(
        buildComment({ postId: 'other-post' }) // 父评论属于另一个帖子
      )

      await expect(
        ForumService.createComment('post-1', 'user-1', {
          content: '回复',
          parentId: 'comment-1',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('超过两级嵌套时应该将回复提升到根评论', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost({ status: 'NORMAL' }))
      // 父评论 depth=1 (已经是二级回复) + getRootCommentId
      prismaMock.forumComment.findUnique
        .mockResolvedValueOnce(
          buildComment({ depth: 1, postId: 'post-1', parentId: 'root-comment' })
        ) // parent validation in createComment
        .mockResolvedValueOnce({ parentId: 'root-comment' }) // getRootCommentId loop iter 1
        .mockResolvedValueOnce({ parentId: null }) // getRootCommentId loop iter 2
      prismaMock.forumComment.create.mockResolvedValue(
        buildComment({ id: 'comment-3', parentId: 'root-comment', depth: 1, content: '继续回复' })
      )

      const result = await ForumService.createComment('post-1', 'user-1', {
        content: '继续回复',
        parentId: 'comment-1',
      })

      // depth=1 because max nesting is 2 (0=root, 1=reply, 2=sub-reply→flattened to root)
      expect(result.depth).toBe(1)
    })
  })

  describe('getComments', () => {
    it('应该返回树形结构的评论', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(buildPost())
      prismaMock.forumComment.findMany.mockResolvedValue([
        buildComment({ id: 'c1', parentId: null, depth: 0 }),
        buildComment({ id: 'c2', parentId: 'c1', depth: 1 }),
        buildComment({ id: 'c3', parentId: null, depth: 0 }),
      ])

      const result = await ForumService.getComments('post-1', 'user-1')

      expect(result).toHaveLength(2) // 2 root comments
      expect(result[0].children).toHaveLength(1) // c1 has 1 child
    })

    it('帖子不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(ForumService.getComments('non-existent', 'user-1')).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('deleteComment', () => {
    it('应该成功删除评论（逻辑删除）', async () => {
      prismaMock.forumComment.findUnique.mockResolvedValue(
        buildComment({ post: { authorId: 'user-1' } })
      )
      prismaMock.forumComment.update.mockResolvedValue(buildComment({ status: 'DELETED' }))

      await ForumService.deleteComment('comment-1', 'user-2', false)

      expect(prismaMock.forumComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { status: 'DELETED' },
      })
    })

    it('评论不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumComment.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.deleteComment('non-existent', 'user-1', false)
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('非评论作者非管理员不能删除', async () => {
      prismaMock.forumComment.findUnique.mockResolvedValue(
        buildComment({ authorId: 'user-3', post: { authorId: 'user-1' } })
      )

      await expect(ForumService.deleteComment('comment-1', 'user-1', false)).rejects.toBeInstanceOf(
        ForbiddenError
      )
    })
  })

  describe('hideComment', () => {
    it('管理员应该能隐藏评论', async () => {
      prismaMock.forumComment.findUnique.mockResolvedValue(
        buildComment({ post: { courseOfferingId: 'course-1' } })
      )
      prismaMock.forumComment.update.mockResolvedValue(buildComment({ status: 'HIDDEN' }))
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await ForumService.hideComment('comment-1', 'admin-1', true)

      expect(result.status).toBe('HIDDEN')
      expect(prismaMock.systemLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'HIDE_COMMENT' }),
        })
      )
    })

    it('非管理员不能隐藏评论', async () => {
      await expect(ForumService.hideComment('comment-1', 'user-1', false)).rejects.toBeInstanceOf(
        ForbiddenError
      )
    })
  })

  describe('restoreComment', () => {
    it('管理员应该能恢复评论', async () => {
      prismaMock.forumComment.findUnique.mockResolvedValue(buildComment())
      prismaMock.forumComment.update.mockResolvedValue(buildComment({ status: 'NORMAL' }))
      prismaMock.systemLog.create.mockResolvedValue({ id: 1 })

      const result = await ForumService.restoreComment('comment-1', 'admin-1', true)

      expect(result.status).toBe('NORMAL')
    })

    it('非管理员不能恢复评论', async () => {
      await expect(
        ForumService.restoreComment('comment-1', 'user-1', false)
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getHiddenComments', () => {
    it('应该返回隐藏评论列表', async () => {
      prismaMock.forumComment.findMany.mockResolvedValue([
        buildComment({
          status: 'HIDDEN',
          post: { id: 'post-1', title: '帖子', courseOfferingId: 'co-1' },
        }),
      ])
      prismaMock.forumComment.count.mockResolvedValue(1)

      const result = await ForumService.getHiddenComments()

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('应该支持按课程筛选', async () => {
      prismaMock.forumComment.findMany.mockResolvedValue([])
      prismaMock.forumComment.count.mockResolvedValue(0)

      await ForumService.getHiddenComments('course-offering-1')

      expect(prismaMock.forumComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            post: { courseOfferingId: 'course-offering-1' },
          }),
        })
      )
    })
  })
})

// ==================== Announcement Management ====================
describe('ForumService — 公告管理', () => {
  describe('createAnnouncement', () => {
    it('教师应该能成功发布公告', async () => {
      prismaMock.courseOffering.findFirst.mockResolvedValue(
        buildCourseOffering({ teacherId: 'user-1' })
      )
      prismaMock.forumPost.create.mockResolvedValue(
        buildPost({ isAnnouncement: true, postType: 'ANNOUNCEMENT' })
      )

      const result = await ForumService.createAnnouncement('user-1', {
        courseOfferingId: 'course-offering-1',
        title: '重要通知',
        content: '通知内容',
      })

      expect(result.isAnnouncement).toBe(true)
    })

    it('非教师用户不能发布公告', async () => {
      await expect(
        ForumService.createAnnouncement('user-1', {
          courseOfferingId: 'course-offering-1',
          title: '通知',
          content: '内容',
        })
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('getAnnouncements', () => {
    it('应该返回公告列表', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([
        buildPost({ isAnnouncement: true, postType: 'ANNOUNCEMENT' }),
      ])
      prismaMock.forumPost.count.mockResolvedValue(1)

      const result = await ForumService.getAnnouncements({ page: 1, pageSize: 20 }, 'user-1')

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })
  })

  describe('updateAnnouncement', () => {
    it('教师应该能更新公告', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(
        buildPost({ isAnnouncement: true, courseOfferingId: 'course-offering-1' })
      )
      prismaMock.courseOffering.findFirst.mockResolvedValue(
        buildCourseOffering({ teacherId: 'user-1' })
      )
      prismaMock.forumPost.update.mockResolvedValue(
        buildPost({ isAnnouncement: true, title: '更新通知' })
      )

      const result = await ForumService.updateAnnouncement('post-1', 'user-1', {
        title: '更新通知',
      })

      expect(result.title).toBe('更新通知')
    })

    it('公告不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.updateAnnouncement('non-existent', 'user-1', { title: '新标题' })
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('deleteAnnouncement', () => {
    it('教师应该能删除公告', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(
        buildPost({ isAnnouncement: true, courseOfferingId: 'course-offering-1' })
      )
      prismaMock.courseOffering.findFirst.mockResolvedValue(
        buildCourseOffering({ teacherId: 'user-1' })
      )
      prismaMock.forumPost.update.mockResolvedValue(buildPost({ status: 'DELETED' }))

      await ForumService.deleteAnnouncement('post-1', 'user-1')

      expect(prismaMock.forumPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'DELETED', updatedAt: expect.any(Date) },
      })
    })

    it('公告不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumPost.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.deleteAnnouncement('non-existent', 'user-1')
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})

// ==================== Search ====================
describe('ForumService — 检索功能', () => {
  describe('searchPosts', () => {
    it('应该返回搜索结果', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([buildPost()])
      prismaMock.forumPost.count.mockResolvedValue(1)

      const result = await ForumService.searchPosts(
        { keyword: '索引', page: 1, pageSize: 20 },
        'user-1'
      )

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(prismaMock.forumPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '索引', mode: 'insensitive' } },
              { content: { contains: '索引', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })

    it('搜索结果的 summary 应包含关键字高亮摘要', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([
        buildPost({ content: '关于数据库索引优化的问题，索引是数据库中非常重要的概念。' }),
      ])
      prismaMock.forumPost.count.mockResolvedValue(1)

      const result = await ForumService.searchPosts(
        { keyword: '索引', page: 1, pageSize: 20 },
        'user-1'
      )

      expect(result.data[0].summary).toContain('索引')
    })
  })
})

// ==================== Statistics ====================
describe('ForumService — 统计功能', () => {
  describe('getStats', () => {
    it('应该返回统计数据', async () => {
      const startDate = new Date('2026-01-01')
      const endDate = new Date('2026-03-01')

      prismaMock.forumPost.count.mockResolvedValue(10)
      prismaMock.forumComment.count.mockResolvedValue(25)
      prismaMock.forumAttachment.count.mockResolvedValue(5)
      prismaMock.forumPost.groupBy.mockResolvedValue([
        { authorId: 'user-1', _count: { authorId: 3 } },
        { authorId: 'user-2', _count: { authorId: 7 } },
      ])
      prismaMock.forumPost.findMany.mockResolvedValue([]) // for period data
      prismaMock.forumComment.findMany.mockResolvedValue([])

      const result = await ForumService.getStats({ startDate, endDate })

      expect(result.totalPosts).toBe(10)
      expect(result.totalComments).toBe(25)
      expect(result.totalAttachments).toBe(5)
      expect(result.activeUsers).toBe(2)
    })
  })

  describe('getHotPosts', () => {
    it('应该返回热度排行', async () => {
      prismaMock.forumPost.findMany.mockResolvedValue([
        buildPost({
          viewCount: 100,
          _count: { comments: 5 },
          courseOffering: { course: { name: '数据库原理' } },
        }),
        buildPost({
          id: 'post-2',
          title: '热帖2',
          viewCount: 50,
          _count: { comments: 10 },
          courseOffering: { course: { name: '操作系统' } },
          author: buildAuthor(),
        }),
      ])

      const result = await ForumService.getHotPosts({ period: 'week' })

      expect(result).toHaveLength(2)
      expect(result[0].activityScore).toBeGreaterThanOrEqual(0)
      expect(result[0].courseName).toBeDefined()
    })
  })

  describe('getUserStats', () => {
    it('应该返回用户统计', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        realName: 'Alice',
      })
      prismaMock.forumPost.count.mockResolvedValue(5)
      prismaMock.forumComment.count.mockResolvedValue(12)

      const result = await ForumService.getUserStats({ userId: 'user-1' })

      expect(result.username).toBe('alice')
      expect(result.postCount).toBe(5)
      expect(result.commentCount).toBe(12)
      expect(result.totalCount).toBe(22) // 5 posts + 12 comments + 5 announcements
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(ForumService.getUserStats({ userId: 'non-existent' })).rejects.toBeInstanceOf(
        NotFoundError
      )
    })
  })

  describe('getCourseActivityStats', () => {
    it('应该返回课程活跃度统计', async () => {
      prismaMock.courseOffering.findMany.mockResolvedValue([
        buildCourseOffering({ teacher: { user: { realName: '张老师' } } }),
      ])
      prismaMock.forumPost.count.mockResolvedValue(3)
      prismaMock.forumComment.count.mockResolvedValue(8)
      prismaMock.forumPost.findMany.mockResolvedValue([
        { authorId: 'user-1' },
        { authorId: 'user-2' },
      ])
      prismaMock.forumComment.findMany.mockResolvedValue([
        { authorId: 'user-1' },
        { authorId: 'user-3' },
      ])

      const result = await ForumService.getCourseActivityStats()

      expect(result).toHaveLength(1)
      expect(result[0].postCount).toBe(3)
      expect(result[0].commentCount).toBe(8)
      expect(result[0].participantCount).toBe(3)
      expect(result[0].activityScore).toBeGreaterThan(0)
    })
  })
})

// ==================== Attachment Management ====================
describe('ForumService — 附件管理', () => {
  describe('uploadAttachment', () => {
    it('应该成功上传附件', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prismaMock.forumAttachment.create.mockResolvedValue({
        id: 'attachment-1',
        fileName: 'test.pdf',
        fileSize: BigInt(1024),
        fileType: 'application/pdf',
      })

      const result = await ForumService.uploadAttachment('user-1', {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/tmp/test.pdf',
      })

      expect(result.id).toBe('attachment-1')
      expect(prismaMock.forumAttachment.create).toHaveBeenCalledTimes(1)
    })

    it('用户不存在应该抛出 NotFoundError', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.uploadAttachment('non-existent', {
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          path: '/tmp/test.pdf',
        })
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('文件超过大小限制应该抛出 ValidationError', async () => {
      await expect(
        ForumService.uploadAttachment('user-1', {
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          size: 11 * 1024 * 1024, // 11MB > 10MB limit
          path: '/tmp/large.pdf',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('不支持的文件类型应该抛出 ValidationError', async () => {
      await expect(
        ForumService.uploadAttachment('user-1', {
          originalname: 'script.exe',
          mimetype: 'application/x-msdownload',
          size: 1024,
          path: '/tmp/script.exe',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })
  })

  describe('uploadAttachments', () => {
    it('应该批量上传附件', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prismaMock.forumAttachment.create
        .mockResolvedValueOnce({ id: 'att-1', fileName: 'a.pdf' })
        .mockResolvedValueOnce({ id: 'att-2', fileName: 'b.pdf' })

      const result = await ForumService.uploadAttachments('user-1', [
        { originalname: 'a.pdf', mimetype: 'application/pdf', size: 100, path: '/tmp/a.pdf' },
        { originalname: 'b.pdf', mimetype: 'application/pdf', size: 200, path: '/tmp/b.pdf' },
      ])

      expect(result).toHaveLength(2)
    })
  })

  describe('deleteAttachment', () => {
    it('应该成功删除附件', async () => {
      prismaMock.forumAttachment.findUnique.mockResolvedValue({
        id: 'attachment-1',
        post: { authorId: 'user-1' },
        filePath: '/tmp/test.pdf',
      })
      prismaMock.forumAttachment.delete.mockResolvedValue({ id: 'attachment-1' })

      await ForumService.deleteAttachment('attachment-1', 'user-1', false)

      expect(prismaMock.forumAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      })
    })

    it('附件不存在应该抛出 NotFoundError', async () => {
      prismaMock.forumAttachment.findUnique.mockResolvedValue(null)

      await expect(
        ForumService.deleteAttachment('non-existent', 'user-1', false)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
