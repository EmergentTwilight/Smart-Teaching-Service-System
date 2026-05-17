import { Router } from 'express';
import { ForumController } from './forum.controller.js';
import { authMiddleware, requireRoles, requireSelfOrAdmin } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { 
  createPostSchema, 
  updatePostSchema,
  queryPostSchema, 
  createCommentSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  searchPostsSchema,
  statsQuerySchema
} from './forum.schemas.js';

const router: Router = Router();

// ==================== 所有路由需要认证 ====================
router.use(authMiddleware);

// ==================== 帖子模块路由 ====================

router.post('/posts', validate(createPostSchema), ForumController.createPost);
router.get('/posts', validate(queryPostSchema), ForumController.getPosts);
router.get('/posts/:id', ForumController.getPostDetail);
router.patch('/posts/:id', validate(updatePostSchema), ForumController.updatePost);
router.delete('/posts/:id', ForumController.deletePost);
router.patch('/posts/:id/pin', requireRoles('admin', 'teacher', 'forum_admin'), ForumController.togglePinPost);

// ==================== 评论模块路由 ====================

router.post('/posts/:id/comments', validate(createCommentSchema), ForumController.createComment);
router.get('/posts/:id/comments', ForumController.getComments);
router.delete('/comments/:id', ForumController.deleteComment);
router.patch('/comments/:id/hide', requireRoles('admin', 'forum_admin'), ForumController.hideComment);
router.patch('/comments/:id/restore', requireRoles('admin', 'forum_admin'), ForumController.restoreComment);
router.get('/comments/hidden', requireRoles('admin', 'forum_admin', 'teacher'), ForumController.getHiddenComments);

// ==================== 公告模块路由 ====================

router.post('/announcements', requireRoles('teacher', 'admin', 'forum_admin'), validate(createAnnouncementSchema), ForumController.createAnnouncement);
router.get('/announcements', ForumController.getAnnouncements);
router.patch('/announcements/:id', requireRoles('teacher', 'admin', 'forum_admin'), validate(updateAnnouncementSchema), ForumController.updateAnnouncement);
router.delete('/announcements/:id', requireRoles('teacher', 'admin', 'forum_admin'), ForumController.deleteAnnouncement);

// ==================== 检索模块路由 ====================

router.get('/search', validate(searchPostsSchema), ForumController.searchPosts);

// ==================== 统计模块路由 ====================

router.get('/stats', requireRoles('admin', 'teacher', 'forum_admin', 'academic_admin'), validate(statsQuerySchema), ForumController.getStats);
router.get('/stats/hot-posts', ForumController.getHotPosts);
router.get('/stats/user/:userId?', requireSelfOrAdmin('admin', 'teacher', 'forum_admin', 'academic_admin'), ForumController.getUserStats);
router.get('/stats/course-activity', requireRoles('admin', 'teacher', 'forum_admin', 'academic_admin'), ForumController.getCourseActivityStats);
router.get('/stats/export', requireRoles('admin', 'academic_admin'), validate(statsQuerySchema), ForumController.exportStats);

// ==================== 附件模块路由（Base64方式，无文件上传中间件） ====================

router.post('/attachments', ForumController.uploadAttachment);
router.post('/attachments/batch', ForumController.uploadAttachments);
router.delete('/attachments/:id', requireSelfOrAdmin('admin', 'teacher', 'forum_admin'), ForumController.deleteAttachment);

export default router;