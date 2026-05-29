import { z } from 'zod';

const PostType = {
  QUESTION: 'QUESTION',
  DISCUSSION: 'DISCUSSION',
  SHARE: 'SHARE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;

// 发帖参数校验规则
export const createPostSchema = z.object({
  body: z.object({
    courseOfferingId: z.string().uuid('无效的课程ID'),
    title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
    content: z.string().min(1, '正文不能为空'),
    postType: z.nativeEnum(PostType, {
      errorMap: () => ({ message: '帖子类型无效' })
    }),
    isAnnouncement: z.boolean().optional().default(false),
    attachmentIds: z.array(z.string().uuid('无效的附件ID')).optional().default([]),
  })
});

// 编辑帖子参数校验
export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的帖子ID')
  }),
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符').optional(),
    content: z.string().min(1, '正文不能为空').optional(),
    isPinned: z.boolean().optional(),
    isAnnouncement: z.boolean().optional(),
  }).refine((data: { title?: string; content?: string; isPinned?: boolean; isAnnouncement?: boolean }) => {
    return Object.keys(data).length > 0;
  }, {
    message: '至少需要提供一个更新字段'
  })
});

// 评论参数校验
export const createCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的帖子ID')
  }),
  body: z.object({
    content: z.string().min(1, '评论内容不能为空').max(5000, '评论内容不能超过5000个字符'),
    parentId: z.string().uuid('无效的父评论ID').optional(),
  })
});

// 删除评论参数校验
export const deleteCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的评论ID')
  })
});

// 列表查询参数校验 (处理 GET 请求的 Query 参数)
export const queryPostSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).pipe(z.number().min(1, '页码最小为1')).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).pipe(z.number().min(1, '每页数量最小为1').max(100, '每页数量最大为100')).optional().default('20'),
    courseOfferingId: z.string().uuid('无效的课程ID').optional(),
    keyword: z.string().max(100, '关键字不能超过100个字符').optional(),
    postType: z.nativeEnum(PostType, {
      errorMap: () => ({ message: '帖子类型无效' })
    }).optional(),
    isAnnouncement: z.enum(['true', 'false']).transform((val: string) => val === 'true').optional(),
    authorId: z.string().uuid('无效的用户ID').optional(),
    status: z.enum(['NORMAL', 'HIDDEN', 'DELETED']).optional(),
    startDate: z.string().datetime().optional().transform((val: string) => val ? new Date(val) : undefined),
    endDate: z.string().datetime().optional().transform((val: string) => val ? new Date(val) : undefined),
    sortBy: z.enum(['createdAt', 'viewCount', 'commentCount']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
});

// 搜索帖子参数校验
export const searchPostsSchema = z.object({
  query: z.object({
    keyword: z.string().min(1, '搜索关键字不能为空').max(100, '关键字不能超过100个字符'),
    courseOfferingId: z.string().uuid('无效的课程ID').optional(),
    authorId: z.string().uuid('无效的用户ID').optional(),
    postType: z.nativeEnum(PostType).optional(),
    startDate: z.string().datetime().optional().transform((val: string | undefined) => val ? new Date(val) : undefined),
    endDate: z.string().datetime().optional().transform((val: string | undefined) => val ? new Date(val) : undefined),
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
    sortBy: z.enum(['relevance', 'createdAt', 'viewCount']).optional().default('relevance')
  })
});

// 统计查询参数校验
export const statsQuerySchema = z.object({
  query: z.object({
    courseOfferingId: z.string().uuid('无效的课程ID').optional(),
    startDate: z.string().datetime('无效的开始日期').transform((val: string) => new Date(val)),
    endDate: z.string().datetime('无效的结束日期').transform((val: string) => new Date(val)),
    period: z.enum(['day', 'week', 'month']).optional().default('week')
  }).refine((data: { startDate: Date; endDate: Date }) => data.startDate <= data.endDate, {
    message: '开始日期不能大于结束日期'
  })
});

// 热帖查询参数校验
export const hotPostsQuerySchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month']).optional().default('week'),
    courseOfferingId: z.string().uuid('无效的课程ID').optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional().default('10')
  })
});

// 置顶操作校验
export const togglePinSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的帖子ID')
  }),
  body: z.object({
    pinned: z.boolean({
      required_error: 'pinned 参数是必需的',
      invalid_type_error: 'pinned 必须是布尔值'
    })
  })
});

// 公告相关校验
export const createAnnouncementSchema = z.object({
  body: z.object({
    courseOfferingId: z.string().uuid('无效的课程ID'),
    title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
    content: z.string().min(1, '正文不能为空'),
    isPinned: z.boolean().optional().default(false)
  })
});

export const updateAnnouncementSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的公告ID')
  }),
  body: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符').optional(),
    content: z.string().min(1, '正文不能为空').optional(),
    isPinned: z.boolean().optional()
  }).refine((data: { title?: string; content?: string; isPinned?: boolean }) => {
    return Object.keys(data).length > 0;
  }, {
    message: '至少需要提供一个更新字段'
  })
});

// 附件相关校验
export const uploadAttachmentSchema = z.object({
  file: z.any().refine((file: any) => file, {
    message: '请选择要上传的文件'
  })
});

// 批量上传附件校验
export const uploadAttachmentsSchema = z.object({
  files: z.array(z.any()).min(1, '请选择要上传的文件').max(10, '一次最多上传10个文件')
});

export const deleteAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('无效的附件ID')
  })
});

// 导出类型供 TypeScript 使用
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type QueryPostInput = z.infer<typeof queryPostSchema>;
export type SearchPostsInput = z.infer<typeof searchPostsSchema>;
export type StatsQueryInput = z.infer<typeof statsQuerySchema>;
export type HotPostsQueryInput = z.infer<typeof hotPostsQuerySchema>;
export type TogglePinInput = z.infer<typeof togglePinSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
