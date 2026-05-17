import { Request, Response } from 'express';
import { ForumService } from './forum.service.js';
import { success, error } from '../../shared/utils/response.js';
import { NotFoundError, ForbiddenError, ValidationError } from '@stss/shared';
import fs from 'fs';
import path from 'path';
import { 
  QueryPostDto, 
  SearchPostsDto, 
  StatsQueryDto,
  HotPostsQueryDto,
  UserStatsQueryDto
} from './forum.types.js';

export class ForumController {
  // 辅助方法：安全获取参数ID
  private static getParamId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
  }

  // 辅助方法：检查是否为管理员或教师
  private static isAdminOrTeacher(req: Request): boolean {
    return req.user?.roles?.some(role => ['admin', 'teacher', 'forum_admin', 'academic_admin'].includes(role)) ?? false;
  }

  // 辅助方法：类型守卫
  private static isError(err: unknown): err is Error {
    return err instanceof Error;
  }

  // 辅助方法：统一错误处理
  private static handleError(res: Response, err: unknown, defaultMessage: string) {
    if (err instanceof NotFoundError) {
      error(res, (err as NotFoundError).message, 404);
    } else if (err instanceof ForbiddenError) {
      error(res, (err as ForbiddenError).message, 403);
    } else if (err instanceof ValidationError) {
      error(res, (err as ValidationError).message, 400);
    } else if (err instanceof Error) {
      error(res, (err as Error).message, 500);
    } else {
      error(res, defaultMessage, 500);
    }
  }

  // 辅助方法：安全获取错误消息
  private static getErrorMessage(err: unknown, defaultMessage: string): string {
    if (err instanceof Error) {
      return err.message;
    }
    return defaultMessage;
  }

  // ==================== 帖子管理 ====================

  /**
   * 创建帖子
   * POST /api/v1/forum/posts
   */
  static async createPost(req: Request, res: Response) {
    try {
      const post = await ForumService.createPost(
        req.user!.userId, 
        req.body,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      success(res, post, '发布成功', 201);
    } catch (err) {
      this.handleError(res, err, '发布失败');
    }
  }

  /**
   * 获取帖子列表
   * GET /api/v1/forum/posts
   */
  static async getPosts(req: Request, res: Response) {
    try {
      const query: QueryPostDto = {
        ...req.query,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      };
      
      const data = await ForumService.getPosts(query, req.user!.userId);
      success(res, data);
    } catch (err) {
      this.handleError(res, err, '获取列表失败');
    }
  }

  /**
   * 获取帖子详情
   * GET /api/v1/forum/posts/:id
   */
  static async getPostDetail(req: Request, res: Response) {
    try {
      const postId = this.getParamId(req);
      const post = await ForumService.getPostDetail(postId, req.user!.userId);
      success(res, post);
    } catch (err) {
      this.handleError(res, err, '获取详情失败');
    }
  }

  /**
   * 编辑帖子
   * PATCH /api/v1/forum/posts/:id
   */
  static async updatePost(req: Request, res: Response) {
    try {
      const isAdmin = this.isAdminOrTeacher(req);
      const postId = this.getParamId(req);
      const post = await ForumService.updatePost(postId, req.user!.userId, req.body, isAdmin);
      success(res, post, '更新成功');
    } catch (err) {
      this.handleError(res, err, '更新失败');
    }
  }

  /**
   * 删除帖子（逻辑删除）
   * DELETE /api/v1/forum/posts/:id
   */
  static async deletePost(req: Request, res: Response) {
    try {
      const isAdmin = this.isAdminOrTeacher(req);
      const postId = this.getParamId(req);
      await ForumService.deletePost(
        postId, 
        req.user!.userId, 
        isAdmin,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      success(res, null, '删除成功');
    } catch (err) {
      this.handleError(res, err, '删除失败');
    }
  }

  /**
   * 置顶/取消置顶帖子
   * PATCH /api/v1/forum/posts/:id/pin
   */
  static async togglePinPost(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限执行置顶操作');
      }
      
      const { pinned } = req.body;
      if (typeof pinned !== 'boolean') {
        throw new ValidationError('pinned 参数必须为布尔值');
      }
      
      const postId = this.getParamId(req);
      const post = await ForumService.togglePinPost(
        postId, 
        pinned,
        req.user!.userId,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      success(res, post, pinned ? '置顶成功' : '取消置顶成功');
    } catch (err) {
      this.handleError(res, err, '置顶操作失败');
    }
  }

  // ==================== 评论管理 ====================

  /**
   * 发表评论/回复
   * POST /api/v1/forum/posts/:id/comments
   */
  static async createComment(req: Request, res: Response) {
    try {
      const postId = this.getParamId(req);
      const comment = await ForumService.createComment(postId, req.user!.userId, req.body);
      success(res, comment, '评论成功', 201);
    } catch (err) {
      this.handleError(res, err, '评论失败');
    }
  }

  /**
   * 获取评论列表（树形结构）
   * GET /api/v1/forum/posts/:id/comments
   */
  static async getComments(req: Request, res: Response) {
    try {
      const postId = this.getParamId(req);
      const comments = await ForumService.getComments(postId, req.user!.userId);
      success(res, comments);
    } catch (err) {
      this.handleError(res, err, '获取评论失败');
    }
  }

  /**
   * 删除评论
   * DELETE /api/v1/forum/comments/:id
   */
  static async deleteComment(req: Request, res: Response) {
    try {
      const isAdmin = this.isAdminOrTeacher(req);
      const commentId = this.getParamId(req);
      await ForumService.deleteComment(commentId, req.user!.userId, isAdmin);
      success(res, null, '删除评论成功');
    } catch (err) {
      this.handleError(res, err, '删除评论失败');
    }
  }

  /**
   * 隐藏评论（管理员）
   * PATCH /api/v1/forum/comments/:id/hide
   */
  static async hideComment(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限执行此操作');
      }
      
      const commentId = this.getParamId(req);
      const comment = await ForumService.hideComment(
        commentId,
        req.user!.userId,
        true,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      success(res, comment, '评论已隐藏');
    } catch (err) {
      this.handleError(res, err, '隐藏评论失败');
    }
  }

  /**
   * 恢复评论（管理员）
   * PATCH /api/v1/forum/comments/:id/restore
   */
  static async restoreComment(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限执行此操作');
      }
      
      const commentId = this.getParamId(req);
      const comment = await ForumService.restoreComment(
        commentId,
        req.user!.userId,
        true,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      success(res, comment, '评论已恢复');
    } catch (err) {
      this.handleError(res, err, '恢复评论失败');
    }
  }

  /**
   * 获取隐藏评论列表（管理员）
   * GET /api/v1/forum/comments/hidden
   */
  static async getHiddenComments(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限查看隐藏评论');
      }
      
      const courseOfferingId = req.query.courseOfferingId as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
      
      const comments = await ForumService.getHiddenComments(courseOfferingId, page, pageSize);
      success(res, comments);
    } catch (err) {
      this.handleError(res, err, '获取隐藏评论失败');
    }
  }

  // ==================== 公告管理 ====================

  /**
   * 发布公告
   * POST /api/v1/forum/announcements
   */
  static async createAnnouncement(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('仅教师可发布公告');
      }
      
      const announcement = await ForumService.createAnnouncement(req.user!.userId, req.body);
      success(res, announcement, '公告发布成功', 201);
    } catch (err) {
      this.handleError(res, err, '公告发布失败');
    }
  }

  /**
   * 获取公告列表
   * GET /api/v1/forum/announcements
   */
  static async getAnnouncements(req: Request, res: Response) {
    try {
      const { courseOfferingId, page, pageSize } = req.query;
      const data = await ForumService.getAnnouncements({
        courseOfferingId: courseOfferingId as string,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      }, req.user!.userId);
      success(res, data);
    } catch (err) {
      this.handleError(res, err, '获取公告失败');
    }
  }

  /**
   * 更新公告
   * PATCH /api/v1/forum/announcements/:id
   */
  static async updateAnnouncement(req: Request, res: Response) {
    try {
      const announcementId = this.getParamId(req);
      const announcement = await ForumService.updateAnnouncement(
        announcementId, 
        req.user!.userId, 
        req.body
      );
      success(res, announcement, '公告更新成功');
    } catch (err) {
      this.handleError(res, err, '公告更新失败');
    }
  }

  /**
   * 删除公告
   * DELETE /api/v1/forum/announcements/:id
   */
  static async deleteAnnouncement(req: Request, res: Response) {
    try {
      const announcementId = this.getParamId(req);
      await ForumService.deleteAnnouncement(announcementId, req.user!.userId);
      success(res, null, '公告删除成功');
    } catch (err) {
      this.handleError(res, err, '公告删除失败');
    }
  }

  // ==================== 帖子检索 ====================

  /**
   * 搜索帖子
   * GET /api/v1/forum/search
   */
  static async searchPosts(req: Request, res: Response) {
    try {
      const query: SearchPostsDto = {
        keyword: req.query.keyword as string,
        courseOfferingId: req.query.courseOfferingId as string,
        authorId: req.query.authorId as string,
        postType: req.query.postType as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        sortBy: req.query.sortBy as any,
      };
      
      if (!query.keyword) {
        throw new ValidationError('关键字不能为空');
      }
      
      const results = await ForumService.searchPosts(query, req.user!.userId);
      success(res, results);
    } catch (err) {
      this.handleError(res, err, '搜索失败');
    }
  }

  // ==================== 数据统计 ====================

  /**
   * 获取统计数据
   * GET /api/v1/forum/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限查看统计数据');
      }
      
      const query: StatsQueryDto = {
        courseOfferingId: req.query.courseOfferingId as string,
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        period: req.query.period as any,
      };
      
      if (!query.startDate || !query.endDate) {
        throw new ValidationError('请提供开始和结束日期');
      }
      
      const stats = await ForumService.getStats(query);
      success(res, stats);
    } catch (err) {
      this.handleError(res, err, '获取统计数据失败');
    }
  }

  /**
   * 获取热帖排行
   * GET /api/v1/forum/stats/hot-posts
   */
  static async getHotPosts(req: Request, res: Response) {
    try {
      const query: HotPostsQueryDto = {
        period: (req.query.period as 'week' | 'month') || 'week',
        courseOfferingId: req.query.courseOfferingId as string,
        limit: req.query.limit ? Number(req.query.limit) : 10,
      };
      
      const hotPosts = await ForumService.getHotPosts(query);
      success(res, hotPosts);
    } catch (err) {
      this.handleError(res, err, '获取热帖排行失败');
    }
  }

  /**
   * 按用户统计（发帖数、评论数、公告数）
   * GET /api/v1/forum/stats/user/:userId?
   */
  static async getUserStats(req: Request, res: Response) {
    try {
      let targetUserId: string;
      const paramUserId = req.params.userId;
      
      if (Array.isArray(paramUserId)) {
        targetUserId = paramUserId[0];
      } else if (paramUserId) {
        targetUserId = paramUserId;
      } else {
        targetUserId = req.user!.userId;
      }
      const isAdmin = this.isAdminOrTeacher(req);
      
      if (targetUserId !== req.user!.userId && !isAdmin) {
        throw new ForbiddenError('无权限查看他人统计数据');
      }
      
      const query: UserStatsQueryDto = {
        userId: targetUserId,
        courseOfferingId: req.query.courseOfferingId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const stats = await ForumService.getUserStats(query);
      success(res, stats);
    } catch (err) {
      this.handleError(res, err, '获取用户统计失败');
    }
  }

  /**
   * 按课程统计活跃度
   * GET /api/v1/forum/stats/course-activity
   */
  static async getCourseActivityStats(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限查看统计数据');
      }
      
      const courseOfferingId = req.query.courseOfferingId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const stats = await ForumService.getCourseActivityStats(courseOfferingId, startDate, endDate);
      success(res, stats);
    } catch (err) {
      this.handleError(res, err, '获取课程活跃度失败');
    }
  }

  /**
   * 导出统计结果（CSV格式）
   * GET /api/v1/forum/stats/export
   */
  static async exportStats(req: Request, res: Response) {
    try {
      if (!this.isAdminOrTeacher(req)) {
        throw new ForbiddenError('无权限导出统计数据');
      }
      
      const query: StatsQueryDto = {
        courseOfferingId: req.query.courseOfferingId as string,
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        period: req.query.period as any,
      };
      
      if (!query.startDate || !query.endDate) {
        throw new ValidationError('请提供开始和结束日期');
      }
      
      const csvContent = await ForumService.exportStatsAsCsv(query, req.user!.userId);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=forum_stats_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (err) {
      this.handleError(res, err, '导出统计失败');
    }
  }

  // ==================== 附件管理（Base64方式） ====================

  /**
   * 上传附件（Base64）
   * POST /api/v1/forum/attachments
   * Body: { fileName: string, fileType: string, content: string (base64) }
   */
  static async uploadAttachment(req: Request, res: Response) {
    try {
      const { fileName, fileType, content } = req.body;
      
      if (!fileName || !content) {
        throw new ValidationError('请提供文件名和文件内容');
      }
      
      // Base64 解码
      const buffer = Buffer.from(content, 'base64');
      const fileSize = buffer.length;
      
      // 文件大小校验（10MB）
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        throw new ValidationError(`文件大小超过限制，最大允许 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
      
      // 文件类型校验
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/markdown'
      ];
      
      // 根据文件扩展名推断 MIME 类型（如果前端未提供）
      let mimeType = fileType;
      if (!mimeType) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
          '.gif': 'image/gif', '.webp': 'image/webp',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.txt': 'text/plain', '.md': 'text/markdown'
        };
        mimeType = mimeMap[ext] || 'application/octet-stream';
      }
      
      if (!allowedTypes.includes(mimeType) && !mimeType.startsWith('image/')) {
        throw new ValidationError(`不支持的文件类型: ${mimeType}`);
      }
      
      // 确保上传目录存在
      const uploadDir = process.env.UPLOAD_DIR || 'uploads/forum';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 生成唯一文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(fileName);
      const safeFileName = `${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadDir, safeFileName);
      
      // 保存文件
      fs.writeFileSync(filePath, buffer);
      
      const attachment = await ForumService.uploadAttachment(
        req.user!.userId,
        {
          originalname: fileName,
          mimetype: mimeType,
          size: fileSize,
          path: filePath
        }
      );
      
      success(res, attachment, '附件上传成功', 201);
    } catch (err) {
      this.handleError(res, err, '附件上传失败');
    }
  }

  /**
   * 批量上传附件（Base64 数组）
   * POST /api/v1/forum/attachments/batch
   * Body: { files: Array<{ fileName, fileType, content }> }
   */
  static async uploadAttachments(req: Request, res: Response) {
    try {
      const { files } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new ValidationError('请提供要上传的文件列表');
      }
      
      if (files.length > 10) {
        throw new ValidationError('单次最多上传10个文件');
      }
      
      const attachments = [];
      for (const file of files) {
        const { fileName, fileType, content } = file;
        
        if (!fileName || !content) {
          throw new ValidationError('每个文件需提供文件名和内容');
        }
        
        const buffer = Buffer.from(content, 'base64');
        const fileSize = buffer.length;
        
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (fileSize > MAX_FILE_SIZE) {
          throw new ValidationError(`文件 ${fileName} 大小超过限制`);
        }
        
        const uploadDir = process.env.UPLOAD_DIR || 'uploads/forum';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(fileName);
        const safeFileName = `${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadDir, safeFileName);
        
        fs.writeFileSync(filePath, buffer);
        
        const attachment = await ForumService.uploadAttachment(
          req.user!.userId,
          {
            originalname: fileName,
            mimetype: fileType || 'application/octet-stream',
            size: fileSize,
            path: filePath
          }
        );
        
        attachments.push(attachment);
      }
      
      success(res, attachments, '批量上传成功', 201);
    } catch (err) {
      this.handleError(res, err, '批量上传失败');
    }
  }

  /**
   * 删除附件
   * DELETE /api/v1/forum/attachments/:id
   */
  static async deleteAttachment(req: Request, res: Response) {
    try {
      const isAdmin = this.isAdminOrTeacher(req);
      const attachmentId = this.getParamId(req);
      await ForumService.deleteAttachment(attachmentId, req.user!.userId, isAdmin);
      success(res, null, '附件删除成功');
    } catch (err) {
      this.handleError(res, err, '附件删除失败');
    }
  }
}