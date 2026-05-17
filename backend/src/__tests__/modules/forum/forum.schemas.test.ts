/**
 * 论坛 Schema 单元测试
 * 验证 Zod schema 对各类输入的校验行为
 * 按最佳实践：每个 schema 测试 valid / invalid / edge cases
 */
import { describe, expect, it, vi } from 'vitest'
import type { ZodIssue } from 'zod'

// Mock @prisma/client to avoid needing generated Prisma client
vi.mock('@prisma/client', () => ({
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

import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  queryPostSchema,
  searchPostsSchema,
  statsQuerySchema,
  hotPostsQuerySchema,
  togglePinSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../../../modules/forum/forum.schemas.js'

// ==================== createPostSchema ====================
describe('createPostSchema', () => {
  const validInput = {
    body: {
      courseOfferingId: '550e8400-e29b-41d4-a716-446655440000',
      title: '求助：关于数据库索引的优化问题',
      content: '请问大家在设计数据库索引时有什么最佳实践？',
      postType: 'QUESTION',
    },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的发帖信息', () => {
      const result = createPostSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受带可选字段的发帖信息', () => {
      const result = createPostSchema.safeParse({
        body: {
          ...validInput.body,
          isAnnouncement: true,
          attachmentIds: ['550e8400-e29b-41d4-a716-446655440001'],
        },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 DISCUSSION 类型', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, postType: 'DISCUSSION' },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受 SHARE 类型', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, postType: 'SHARE' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('title validation', () => {
    it('应该拒绝空标题', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, title: '' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('标题不能为空')
      }
    })

    it('应该拒绝超过 200 字符的标题', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, title: 'x'.repeat(201) },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('标题不能超过200个字符')
      }
    })

    it('应该接受 200 字符的标题（边界值）', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, title: 'x'.repeat(200) },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('content validation', () => {
    it('应该拒绝空内容', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, content: '' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('正文不能为空')
      }
    })
  })

  describe('courseOfferingId validation', () => {
    it('应该拒绝非 UUID 的课程 ID', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, courseOfferingId: 'invalid-id' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('无效的课程ID')
      }
    })

    it('应该拒绝空字符串课程 ID', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, courseOfferingId: '' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('postType validation', () => {
    it('应该拒绝无效的帖子类型', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, postType: 'INVALID' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('帖子类型无效')
      }
    })

    it('应该接受枚举值 QUESTION', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, postType: 'QUESTION' },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受枚举值 ANNOUNCEMENT', () => {
      const result = createPostSchema.safeParse({
        body: { ...validInput.body, postType: 'ANNOUNCEMENT' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失必填字段', () => {
      expect(createPostSchema.safeParse({ body: { title: 'test' } }).success).toBe(false)
      expect(createPostSchema.safeParse({ body: {} }).success).toBe(false)
    })

    it('应该拒绝空 body', () => {
      expect(createPostSchema.safeParse({}).success).toBe(false)
    })
  })
})

// ==================== updatePostSchema ====================
describe('updatePostSchema', () => {
  const validInput = {
    params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    body: { title: '更新后的标题' },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的编辑信息', () => {
      const result = updatePostSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受仅更新内容的请求', () => {
      const result = updatePostSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { content: '更新后的内容' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('params id validation', () => {
    it('应该拒绝非 UUID 的帖子 ID', () => {
      const result = updatePostSchema.safeParse({
        params: { id: 'bad-id' },
        body: { title: '新标题' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('无效的帖子ID')
      }
    })
  })

  describe('body validation', () => {
    it('应该拒绝空 body（至少一个字段）', () => {
      const result = updatePostSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('至少需要提供一个更新字段')
      }
    })

    it('应该拒绝空标题', () => {
      const result = updatePostSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { title: '' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('标题不能为空')
      }
    })

    it('应该接受 isPinned 和 isAnnouncement', () => {
      const result = updatePostSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { isPinned: true, isAnnouncement: false },
      })
      expect(result.success).toBe(true)
    })
  })
})

// ==================== createCommentSchema ====================
describe('createCommentSchema', () => {
  const validInput = {
    params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    body: { content: '这是一个很好的问题，我也有同样的疑惑。' },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的评论', () => {
      const result = createCommentSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受带 parentId 的回复', () => {
      const result = createCommentSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {
          content: '回复楼上',
          parentId: '550e8400-e29b-41d4-a716-446655440001',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('content validation', () => {
    it('应该拒绝空评论内容', () => {
      const result = createCommentSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { content: '' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('评论内容不能为空')
      }
    })

    it('应该拒绝超过 5000 字符的评论', () => {
      const result = createCommentSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { content: 'x'.repeat(5001) },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('评论内容不能超过5000个字符')
      }
    })

    it('应该接受 5000 字符的评论（边界值）', () => {
      const result = createCommentSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { content: 'x'.repeat(5000) },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('parentId validation', () => {
    it('应该拒绝非 UUID 的 parentId', () => {
      const result = createCommentSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { content: '回复', parentId: 'bad-id' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('无效的父评论ID')
      }
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失 params', () => {
      expect(createCommentSchema.safeParse({ body: { content: 'test' } }).success).toBe(false)
    })
  })
})

// ==================== queryPostSchema ====================
describe('queryPostSchema', () => {
  describe('valid inputs', () => {
    it('应该接受默认查询参数', () => {
      const result = queryPostSchema.safeParse({ query: {} })
      expect(result.success).toBe(true)
    })

    it('应该接受完整查询参数', () => {
      const result = queryPostSchema.safeParse({
        query: {
          page: '2',
          pageSize: '10',
          postType: 'QUESTION',
          sortBy: 'createdAt',
          sortOrder: 'asc',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('page validation', () => {
    it('应该拒绝非数字页码', () => {
      const result = queryPostSchema.safeParse({ query: { page: 'abc' } })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('页码必须是数字')
      }
    })

    it('应该拒绝小于 1 的页码', () => {
      const result = queryPostSchema.safeParse({ query: { page: '0' } })
      expect(result.success).toBe(false)
    })
  })

  describe('pageSize validation', () => {
    it('应该拒绝大于 100 的 pageSize', () => {
      const result = queryPostSchema.safeParse({ query: { pageSize: '101' } })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('每页数量最大为100')
      }
    })
  })

  describe('postType validation', () => {
    it('应该拒绝无效的 postType', () => {
      const result = queryPostSchema.safeParse({ query: { postType: 'INVALID' } })
      expect(result.success).toBe(false)
    })
  })

  describe('sortBy validation', () => {
    it('应该拒绝无效的排序字段', () => {
      const result = queryPostSchema.safeParse({ query: { sortBy: 'invalidField' } })
      expect(result.success).toBe(false)
    })
  })

  describe('startDate/endDate validation', () => {
    it('应该拒绝无效的日期格式', () => {
      const result = queryPostSchema.safeParse({ query: { startDate: 'not-a-date' } })
      expect(result.success).toBe(false)
    })

    it('应该接受有效的 ISO 日期', () => {
      const result = queryPostSchema.safeParse({
        query: { startDate: '2026-01-01T00:00:00.000Z' },
      })
      expect(result.success).toBe(true)
    })
  })
})

// ==================== searchPostsSchema ====================
describe('searchPostsSchema', () => {
  describe('valid inputs', () => {
    it('应该接受带关键字的搜索', () => {
      const result = searchPostsSchema.safeParse({
        query: { keyword: '数据库优化' },
      })
      expect(result.success).toBe(true)
    })

    it('应该接受带筛选条件的搜索', () => {
      const result = searchPostsSchema.safeParse({
        query: {
          keyword: '测试',
          postType: 'QUESTION',
          sortBy: 'createdAt',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('keyword validation', () => {
    it('应该拒绝空关键字', () => {
      const result = searchPostsSchema.safeParse({ query: { keyword: '' } })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('搜索关键字不能为空')
      }
    })

    it('应该拒绝超过 100 字符的关键字', () => {
      const result = searchPostsSchema.safeParse({
        query: { keyword: 'x'.repeat(101) },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('关键字不能超过100个字符')
      }
    })
  })

  describe('sortBy validation', () => {
    it('应该接受 relevance、createdAt、viewCount', () => {
      expect(
        searchPostsSchema.safeParse({ query: { keyword: 'test', sortBy: 'relevance' } }).success
      ).toBe(true)
      expect(
        searchPostsSchema.safeParse({ query: { keyword: 'test', sortBy: 'createdAt' } }).success
      ).toBe(true)
      expect(
        searchPostsSchema.safeParse({ query: { keyword: 'test', sortBy: 'viewCount' } }).success
      ).toBe(true)
    })

    it('应该拒绝无效的排序方式', () => {
      const result = searchPostsSchema.safeParse({
        query: { keyword: 'test', sortBy: 'commentCount' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('missing fields', () => {
    it('应该拒绝缺失 query', () => {
      expect(searchPostsSchema.safeParse({}).success).toBe(false)
    })
  })
})

// ==================== statsQuerySchema ====================
describe('statsQuerySchema', () => {
  const validInput = {
    query: {
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-03-01T00:00:00.000Z',
    },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的统计查询', () => {
      const result = statsQuerySchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受带可选字段的查询', () => {
      const result = statsQuerySchema.safeParse({
        query: {
          ...validInput.query,
          courseOfferingId: '550e8400-e29b-41d4-a716-446655440000',
          period: 'month',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('date validation', () => {
    it('应该拒绝缺失 startDate', () => {
      const result = statsQuerySchema.safeParse({
        query: { endDate: '2026-03-01T00:00:00.000Z' },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝无效的日期格式', () => {
      const result = statsQuerySchema.safeParse({
        query: { startDate: 'bad-date', endDate: '2026-03-01T00:00:00.000Z' },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝开始日期大于结束日期', () => {
      const result = statsQuerySchema.safeParse({
        query: {
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-01-01T00:00:00.000Z',
        },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const refineIssue = result.error.issues.find(
          (i: ZodIssue) => i.message === '开始日期不能大于结束日期'
        )
        expect(refineIssue).toBeDefined()
      }
    })
  })

  describe('period validation', () => {
    it('应该接受 day、week、month', () => {
      expect(
        statsQuerySchema.safeParse({
          query: { ...validInput.query, period: 'day' },
        }).success
      ).toBe(true)
      expect(
        statsQuerySchema.safeParse({
          query: { ...validInput.query, period: 'week' },
        }).success
      ).toBe(true)
      expect(
        statsQuerySchema.safeParse({
          query: { ...validInput.query, period: 'month' },
        }).success
      ).toBe(true)
    })

    it('应该拒绝无效的 period', () => {
      const result = statsQuerySchema.safeParse({
        query: { ...validInput.query, period: 'year' },
      })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== hotPostsQuerySchema ====================
describe('hotPostsQuerySchema', () => {
  describe('valid inputs', () => {
    it('应该接受默认查询参数', () => {
      const result = hotPostsQuerySchema.safeParse({ query: {} })
      expect(result.success).toBe(true)
    })

    it('应该接受完整查询参数', () => {
      const result = hotPostsQuerySchema.safeParse({
        query: {
          period: 'month',
          courseOfferingId: '550e8400-e29b-41d4-a716-446655440000',
          limit: '20',
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('period validation', () => {
    it('应该拒绝无效的 period', () => {
      const result = hotPostsQuerySchema.safeParse({ query: { period: 'year' } })
      expect(result.success).toBe(false)
    })
  })

  describe('limit validation', () => {
    it('应该拒绝超过 50 的 limit', () => {
      const result = hotPostsQuerySchema.safeParse({ query: { limit: '51' } })
      expect(result.success).toBe(false)
    })

    it('应该拒绝小于 1 的 limit', () => {
      const result = hotPostsQuerySchema.safeParse({ query: { limit: '0' } })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== togglePinSchema ====================
describe('togglePinSchema', () => {
  const validInput = {
    params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    body: { pinned: true },
  }

  describe('valid inputs', () => {
    it('应该接受有效的置顶操作', () => {
      const result = togglePinSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受取消置顶', () => {
      const result = togglePinSchema.safeParse({
        ...validInput,
        body: { pinned: false },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('params validation', () => {
    it('应该拒绝非 UUID 的帖子 ID', () => {
      const result = togglePinSchema.safeParse({
        params: { id: 'bad-id' },
        body: { pinned: true },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('pinned validation', () => {
    it('应该拒绝非布尔值的 pinned', () => {
      const result = togglePinSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { pinned: 'yes' },
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('pinned 必须是布尔值')
      }
    })

    it('应该拒绝缺失 pinned', () => {
      const result = togglePinSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('pinned 参数是必需的')
      }
    })
  })
})

// ==================== createAnnouncementSchema ====================
describe('createAnnouncementSchema', () => {
  const validInput = {
    body: {
      courseOfferingId: '550e8400-e29b-41d4-a716-446655440000',
      title: '期末考试通知',
      content: '期末考试将于第18周进行，请同学们做好准备。',
    },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的公告', () => {
      const result = createAnnouncementSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('应该接受带 isPinned 的公告', () => {
      const result = createAnnouncementSchema.safeParse({
        body: { ...validInput.body, isPinned: true },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('title validation', () => {
    it('应该拒绝空标题', () => {
      const result = createAnnouncementSchema.safeParse({
        body: { ...validInput.body, title: '' },
      })
      expect(result.success).toBe(false)
    })

    it('应该拒绝超过 200 字符的标题', () => {
      const result = createAnnouncementSchema.safeParse({
        body: { ...validInput.body, title: 'x'.repeat(201) },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('content validation', () => {
    it('应该拒绝空内容', () => {
      const result = createAnnouncementSchema.safeParse({
        body: { ...validInput.body, content: '' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('courseOfferingId validation', () => {
    it('应该拒绝非 UUID 的课程 ID', () => {
      const result = createAnnouncementSchema.safeParse({
        body: { ...validInput.body, courseOfferingId: 'invalid' },
      })
      expect(result.success).toBe(false)
    })
  })
})

// ==================== updateAnnouncementSchema ====================
describe('updateAnnouncementSchema', () => {
  const validInput = {
    params: { id: '550e8400-e29b-41d4-a716-446655440000' },
    body: { title: '更新后的公告标题' },
  }

  describe('valid inputs', () => {
    it('应该接受符合要求的公告更新', () => {
      const result = updateAnnouncementSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('body validation', () => {
    it('应该拒绝空 body', () => {
      const result = updateAnnouncementSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: {},
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('至少需要提供一个更新字段')
      }
    })

    it('应该接受 isPinned 独立更新', () => {
      const result = updateAnnouncementSchema.safeParse({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        body: { isPinned: true },
      })
      expect(result.success).toBe(true)
    })
  })
})
