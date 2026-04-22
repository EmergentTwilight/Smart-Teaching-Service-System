import { Router } from 'express';
import { ForumController } from './forum.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.js'; // 鉴权中间件
import { validate } from '../../shared/middleware/validate.js'; // 参数校验中间件
import { 
  createPostSchema, 
  updatePostSchema,
  queryPostSchema, 
  createCommentSchema 
} from './forum.schemas.js';

const router: Router = Router(); 

// === 帖子模块路由 ===

// POST /api/v1/forum/posts -> 发布新帖 (需登录, 需校验 Body)
router.post('/posts', authMiddleware, validate(createPostSchema), ForumController.createPost);

// GET /api/v1/forum/posts -> 获取列表 (需登录, 需校验 Query 参数)
router.get('/posts', authMiddleware, validate(queryPostSchema), ForumController.getPosts);

// GET /api/v1/forum/posts/:id -> 获取详情 (需登录)
router.get('/posts/:id', authMiddleware, ForumController.getPostDetail);

// PATCH /api/v1/forum/posts/:id -> 编辑帖子 (需登录, 需校验 Body)
router.patch('/posts/:id', authMiddleware, validate(updatePostSchema), ForumController.updatePost);

// DELETE /api/v1/forum/posts/:id -> 删除帖子 (需登录)
router.delete('/posts/:id', authMiddleware, ForumController.deletePost);

// === 评论模块路由 ===

// POST /api/v1/forum/posts/:id/comments -> 发表评论 (需登录, 需校验 Body)
router.post('/posts/:id/comments', authMiddleware, validate(createCommentSchema), ForumController.createComment);

// GET /api/v1/forum/posts/:id/comments -> 获取某帖子的评论区 (需登录)
router.get('/posts/:id/comments', authMiddleware, ForumController.getComments);

export default router;