import { z } from 'zod';
import { PostType } from '@prisma/client';

// 发帖参数校验规则
export const createPostSchema = z.object({
  body: z.object({
    courseOfferingId: z.string().uuid("无效的课程ID"),
    title: z.string().min(1, "标题不能为空").max(200, "标题不能超过200个字符"),
    content: z.string().min(1, "正文不能为空"),
    postType: z.nativeEnum(PostType), // 必须是合法的枚举值
    isAnnouncement: z.boolean().optional(),
    attachmentIds: z.array(z.string().uuid()).optional(),
  })
});

// 编辑帖子参数校验
export const updatePostSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    isPinned: z.boolean().optional(),
    isAnnouncement: z.boolean().optional(),
  })
});

// 评论参数校验
export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "评论内容不能为空"),
    parentId: z.string().uuid("无效的父评论ID").optional(), // 允许为空（顶层评论）
  })
});

// 列表查询参数校验 (处理 GET 请求的 Query 参数)
export const queryPostSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(), // 将字符串转换为数字
    pageSize: z.string().regex(/^\d+$/).transform(Number).optional(),
    courseOfferingId: z.string().uuid().optional(),
    keyword: z.string().optional(),
    postType: z.nativeEnum(PostType).optional(),
    // 将 'true'/'false' 字符串转为布尔值
    isAnnouncement: z.enum(['true', 'false']).transform(val => val === 'true').optional(), 
  })
});