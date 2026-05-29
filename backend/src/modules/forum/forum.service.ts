import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { 
  CreatePostDto, 
  UpdatePostDto, 
  CreateCommentDto, 
  QueryPostDto,
  SearchPostsDto,
  StatsQueryDto,
  HotPostsQueryDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UserStatsQueryDto,
  UserStatsDto,
  CourseActivityStatsDto,
  StatsExportDto,
  AuditLogDto,
  RequestInfo,
  UploadedFile
} from './forum.types.js';
import { NotFoundError, ForbiddenError, ValidationError } from '@stss/shared';

const prisma = new PrismaClient();

// 附件配置常量
const ATTACHMENT_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/markdown'
  ]
};

// 帖子类型枚举值
const POST_TYPE_VALUES = ['QUESTION', 'DISCUSSION', 'SHARE', 'ANNOUNCEMENT'];

type ForumPostWhereInput = {
  id?: string;
  title?: string | { contains: string; mode?: 'insensitive' };
  content?: string | { contains: string; mode?: 'insensitive' };
  postType?: string;
  isAnnouncement?: boolean;
  isPinned?: boolean;
  status?: string;
  authorId?: string;
  courseOfferingId?: string | { in: string[] };
  createdAt?: Date | { gte?: Date; lte?: Date };
  OR?: Array<{ [key: string]: any }>;
  [key: string]: any;
};

export class ForumService {
  // ==================== 辅助方法 ====================
  
  /**
   * 验证用户对课程的访问权限
   */
  private static async verifyCourseAccess(userId: string, courseOfferingId: string): Promise<boolean> {
    const offering = await prisma.courseOffering.findFirst({
      where: {
        id: courseOfferingId,
        teacherId: userId
      }
    });
    if (offering) return true;
    
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: userId,
        courseOfferingId,
        status: 'ENROLLED'
      }
    });
    
    return !!enrollment;
  }

  /**
   * 获取用户有权限访问的课程列表
   */
  private static async getUserAccessibleCourses(userId: string): Promise<string[]> {
    const teacherCourses = await prisma.courseOffering.findMany({
      where: { teacherId: userId },
      select: { id: true }
    });
    
    const studentCourses = await prisma.enrollment.findMany({
      where: { 
        studentId: userId,
        status: 'ENROLLED'
      },
      select: { courseOfferingId: true }
    });
    
    const teacherIds = teacherCourses.map(c => c.id);
    const studentIds = studentCourses.map(e => e.courseOfferingId);
    
    return [...new Set([...teacherIds, ...studentIds])];
  }

  /**
   * 检查用户是否为课程的任课教师
   */
  private static async isTeacherForCourse(userId: string, courseOfferingId: string): Promise<boolean> {
    const offering = await prisma.courseOffering.findFirst({
      where: {
        id: courseOfferingId,
        teacherId: userId
      }
    });
    return !!offering;
  }

  /**
   * 检查用户是否为管理员或教师
   */
  private static async isAdminOrTeacher(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!user) return false;
    
    return user.userRoles.some(userRole => 
      ['admin', 'teacher', 'forum_admin', 'academic_admin'].includes(userRole.role.code)
    );
  }

  /**
   * 验证帖子类型
   */
  private static validatePostType(postType: string): void {
    if (!POST_TYPE_VALUES.includes(postType)) {
      throw new ValidationError(
        `无效的帖子类型，允许的类型：${POST_TYPE_VALUES.join(', ')}`
      );
    }
  }

  /**
   * 验证附件
   */
  private static validateAttachment(file: UploadedFile): void {
    if (file.size > ATTACHMENT_CONFIG.maxSize) {
      throw new ValidationError(
        `文件大小超过限制，最大允许 ${ATTACHMENT_CONFIG.maxSize / 1024 / 1024}MB`
      );
    }
    
    if (!ATTACHMENT_CONFIG.allowedTypes.includes(file.mimetype) && 
        !file.mimetype.startsWith('image/')) {
      throw new ValidationError(
        `不支持的文件类型，允许的类型：${ATTACHMENT_CONFIG.allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * 获取根评论ID
   */
  private static async getRootCommentId(commentId: string): Promise<string> {
    let currentId = commentId;
    let comment = await prisma.forumComment.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    
    while (comment?.parentId) {
      currentId = comment.parentId;
      comment = await prisma.forumComment.findUnique({
        where: { id: currentId },
        select: { parentId: true }
      });
    }
    
    return currentId;
  }

  /**
   * 生成高亮摘要
   */
  private static generateHighlight(content: string, keyword: string, length: number = 200): string {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return content.substring(0, length);
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }

  /**
   * 获取周期数据
   */
  private static async getPeriodData(startDate: Date, endDate: Date, period: string, courseOfferingId?: string) {
    const posts = await prisma.forumPost.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(courseOfferingId && { courseOfferingId }),
        status: 'NORMAL'
      },
      select: { createdAt: true }
    });
    
    const comments = await prisma.forumComment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'NORMAL',
        ...(courseOfferingId && {
          post: { courseOfferingId }
        })
      },
      select: { createdAt: true }
    });
    
    const groupMap = new Map<string, { postCount: number; commentCount: number }>();
    
    posts.forEach(post => {
      const date = post.createdAt.toISOString().split('T')[0];
      const existing = groupMap.get(date) || { postCount: 0, commentCount: 0 };
      groupMap.set(date, { ...existing, postCount: existing.postCount + 1 });
    });
    
    comments.forEach(comment => {
      const date = comment.createdAt.toISOString().split('T')[0];
      const existing = groupMap.get(date) || { postCount: 0, commentCount: 0 };
      groupMap.set(date, { ...existing, commentCount: existing.commentCount + 1 });
    });
    
    return Array.from(groupMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 创建审计日志
   */
  private static async createAuditLog(data: AuditLogDto): Promise<void> {
    await prisma.systemLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        createdAt: new Date()
      }
    });
  }

  // ==================== 帖子管理 ====================

  static async createPost(authorId: string, data: CreatePostDto, reqInfo?: RequestInfo) {
    // 验证帖子类型
    this.validatePostType(data.postType);
    
    const { attachmentIds, ...postData } = data;
    
    const hasAccess = await this.verifyCourseAccess(authorId, data.courseOfferingId);
    if (!hasAccess) {
      throw new ForbiddenError('无权在此课程下发帖');
    }
    
    if (data.isAnnouncement) {
      const isTeacher = await this.isTeacherForCourse(authorId, data.courseOfferingId);
      if (!isTeacher) {
        throw new ForbiddenError('仅教师可发布公告');
      }
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.forumPost.create({
        data: {
          ...postData,
          authorId,
          status: 'NORMAL',
          isPinned: false,
          viewCount: 0
        },
        include: {
          author: {
            select: { id: true, username: true, realName: true, avatarUrl: true }
          },
          courseOffering: {
            include: { course: { select: { id: true, name: true, code: true } } }
          }
        }
      });

      if (attachmentIds && attachmentIds.length > 0) {
        await tx.forumAttachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { postId: post.id },
        });
      }
      
      const commentCount = await tx.forumComment.count({
        where: { postId: post.id, status: 'NORMAL' }
      });
      
      return { ...post, commentCount };
    });
    
    // 审计日志
    await this.createAuditLog({
      userId: authorId,
      action: 'CREATE_POST',
      resourceType: 'post',
      resourceId: result.id,
      details: { title: data.title, postType: data.postType, courseOfferingId: data.courseOfferingId },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.ua
    });
    
    return result;
  }

  static async getPosts(query: QueryPostDto, userId: string) {
    const { 
      page = 1, 
      pageSize = 20, 
      courseOfferingId, 
      keyword, 
      postType, 
      isAnnouncement,
      authorId,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;
    
    const skip = (page - 1) * pageSize;
    const accessibleCourses = await this.getUserAccessibleCourses(userId);
    const isAdmin = await this.isAdminOrTeacher(userId);
    
    const where: any = {
      courseOfferingId: courseOfferingId || { in: accessibleCourses },
    };
    
    if (status && isAdmin) {
      where.status = status;
    } else {
      where.status = 'NORMAL';
    }
    
    if (postType) where.postType = postType;
    if (isAnnouncement !== undefined) where.isAnnouncement = isAnnouncement;
    if (authorId) where.authorId = authorId;
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };
    
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } }
      ];
    }

    let orderBy: any = { [sortBy]: sortOrder };
    if (sortBy === 'createdAt') {
      orderBy = [{ isPinned: 'desc' }, { createdAt: sortOrder }];
    }

    const [total, posts] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          author: { select: { id: true, username: true, realName: true, avatarUrl: true } },
          courseOffering: {
            include: { course: { select: { id: true, name: true, code: true } } }
          },
          attachments: true
        }
      })
    ]);
    
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        commentCount: await prisma.forumComment.count({
          where: { postId: post.id, status: 'NORMAL' }
        })
      }))
    );

    return { 
      data: postsWithCounts,
      pagination: { 
        page, 
        pageSize, 
        total, 
        totalPages: Math.ceil(total / pageSize) 
      }
    };
  }

  static async getPostDetail(postId: string, userId: string) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } },
        courseOffering: {
          include: { course: { select: { id: true, name: true, code: true } } }
        },
        attachments: true
      }
    });

    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    const hasAccess = await this.verifyCourseAccess(userId, post.courseOfferingId);
    if (!hasAccess) {
      throw new ForbiddenError('无权查看此帖子');
    }

    const updatedPost = await prisma.forumPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } },
        courseOffering: {
          include: { course: { select: { id: true, name: true, code: true } } }
        },
        attachments: true
      }
    });
    
    const commentCount = await prisma.forumComment.count({
      where: { postId, status: 'NORMAL' }
    });

    return { ...updatedPost, commentCount };
  }

  static async updatePost(postId: string, userId: string, data: UpdatePostDto, isAdmin: boolean) {
    const post = await prisma.forumPost.findUnique({ 
      where: { id: postId },
      include: { courseOffering: true }
    });
    
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    const hasAccess = await this.verifyCourseAccess(userId, post.courseOfferingId);
    if (!hasAccess) {
      throw new ForbiddenError('无权编辑此帖子');
    }
    
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限编辑此帖子');
    }

    if (!isAdmin && (data.isPinned !== undefined || data.isAnnouncement !== undefined)) {
      throw new ForbiddenError('只有管理员或教师可以设置置顶和公告');
    }

    return await prisma.forumPost.update({
      where: { id: postId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } },
        attachments: true
      }
    });
  }

  static async deletePost(postId: string, userId: string, isAdmin: boolean, reqInfo?: RequestInfo) {
    const post = await prisma.forumPost.findUnique({ 
      where: { id: postId },
      include: { courseOffering: true }
    });
    
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限删除此帖子');
    }

    const result = await prisma.forumPost.update({
      where: { id: postId },
      data: { status: 'DELETED', updatedAt: new Date() }
    });
    
    // 审计日志
    await this.createAuditLog({
      userId,
      action: isAdmin ? 'ADMIN_DELETE_POST' : 'DELETE_POST',
      resourceType: 'post',
      resourceId: postId,
      details: { postTitle: post.title, courseOfferingId: post.courseOfferingId },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.ua
    });
    
    return result;
  }

  static async togglePinPost(postId: string, isPinned: boolean, userId: string, reqInfo?: RequestInfo) {
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    const result = await prisma.forumPost.update({
      where: { id: postId },
      data: { isPinned, updatedAt: new Date() },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } }
      }
    });
    
    // 审计日志
    await this.createAuditLog({
      userId,
      action: isPinned ? 'PIN_POST' : 'UNPIN_POST',
      resourceType: 'post',
      resourceId: postId,
      details: { postTitle: post.title, isPinned },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.ua
    });
    
    return result;
  }

  // ==================== 评论管理 ====================

  static async createComment(postId: string, authorId: string, data: CreateCommentDto) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { status: true, courseOfferingId: true }
    });

    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    if (post.status !== 'NORMAL') {
      throw new ForbiddenError('帖子已关闭评论功能');
    }
    
    const hasAccess = await this.verifyCourseAccess(authorId, post.courseOfferingId);
    if (!hasAccess) {
      throw new ForbiddenError('无权评论此帖子');
    }

    let depth = 0;
    let parentId = data.parentId;
    
    if (data.parentId) {
      const parentComment = await prisma.forumComment.findUnique({
        where: { id: data.parentId },
        select: { depth: true, postId: true }
      });
      
      if (!parentComment || parentComment.postId !== postId) {
        throw new ValidationError('父评论不存在或不属于此帖子');
      }
      
      depth = Math.min(parentComment.depth + 1, 2);
      
      if (depth >= 2 && parentComment.depth >= 1) {
        parentId = await this.getRootCommentId(data.parentId);
        depth = 1;
      }
    }

    return await prisma.forumComment.create({
      data: {
        postId,
        authorId,
        content: data.content,
        parentId,
        depth,
        status: 'NORMAL'
      },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } }
      }
    });
  }

  static async getComments(postId: string, userId: string) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { courseOfferingId: true }
    });
    
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    const hasAccess = await this.verifyCourseAccess(userId, post.courseOfferingId);
    if (!hasAccess) {
      throw new ForbiddenError('无权查看此帖子的评论');
    }
    
    const comments = await prisma.forumComment.findMany({
      where: { postId, status: 'NORMAL' },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } }
      }
    });

    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, children: [] });
    });

    comments.forEach(comment => {
      const node = commentMap.get(comment.id);
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).children.push(node);
      } else {
        rootComments.push(node);
      }
    });

    return rootComments;
  }

  static async deleteComment(commentId: string, userId: string, isAdmin: boolean) {
    const comment = await prisma.forumComment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } }
    });
    
    if (!comment) {
      throw new NotFoundError('评论');
    }
    
    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限删除此评论');
    }
    
    return await prisma.forumComment.update({
      where: { id: commentId },
      data: { status: 'DELETED' }
    });
  }

  /**
   * 隐藏评论
   */
  static async hideComment(commentId: string, userId: string, isAdmin: boolean, reqInfo?: RequestInfo) {
    if (!isAdmin) {
      throw new ForbiddenError('无权限执行此操作');
    }
    
    const comment = await prisma.forumComment.findUnique({
      where: { id: commentId },
      include: { post: true }
    });
    
    if (!comment) throw new NotFoundError('评论');
    
    const result = await prisma.forumComment.update({
      where: { id: commentId },
      data: { status: 'HIDDEN' }
    });
    
    await this.createAuditLog({
      userId,
      action: 'HIDE_COMMENT',
      resourceType: 'comment',
      resourceId: commentId,
      details: { postId: comment.postId, contentPreview: comment.content.substring(0, 100) },
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.ua
    });
    
    return result;
  }

  /**
   * 恢复评论
   */
  static async restoreComment(commentId: string, userId: string, isAdmin: boolean, reqInfo?: RequestInfo) {
    if (!isAdmin) {
      throw new ForbiddenError('无权限执行此操作');
    }
    
    const comment = await prisma.forumComment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) throw new NotFoundError('评论');
    
    const result = await prisma.forumComment.update({
      where: { id: commentId },
      data: { status: 'NORMAL' }
    });
    
    await this.createAuditLog({
      userId,
      action: 'RESTORE_COMMENT',
      resourceType: 'comment',
      resourceId: commentId,
      ipAddress: reqInfo?.ip,
      userAgent: reqInfo?.ua
    });
    
    return result;
  }

  /**
   * 获取隐藏评论列表
   */
  static async getHiddenComments(courseOfferingId?: string, page = 1, pageSize = 20) {
    const where: any = { status: 'HIDDEN' };
    
    if (courseOfferingId) {
      where.post = { courseOfferingId };
    }
    
    const [total, comments] = await Promise.all([
      prisma.forumComment.count({ where }),
      prisma.forumComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, realName: true } },
          post: { select: { id: true, title: true, courseOfferingId: true } }
        }
      })
    ]);
    
    return {
      data: comments,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
  }

  // ==================== 公告管理 ====================

  static async createAnnouncement(authorId: string, data: CreateAnnouncementDto) {
    const isTeacher = await this.isTeacherForCourse(authorId, data.courseOfferingId);
    if (!isTeacher) {
      throw new ForbiddenError('仅任课教师可发布公告');
    }
    
    return await prisma.forumPost.create({
      data: {
        title: data.title,
        content: data.content,
        postType: 'ANNOUNCEMENT',
        isAnnouncement: true,
        isPinned: data.isPinned || false,
        status: 'NORMAL',
        authorId,
        courseOfferingId: data.courseOfferingId,
        viewCount: 0
      },
      include: {
        author: { select: { id: true, username: true, realName: true, avatarUrl: true } }
      }
    });
  }

  static async getAnnouncements(query: any, userId: string) {
    const { page = 1, pageSize = 20, courseOfferingId } = query;
    const accessibleCourses = await this.getUserAccessibleCourses(userId);
    
    const where: any = {
      isAnnouncement: true,
      status: 'NORMAL',
      courseOfferingId: courseOfferingId || { in: accessibleCourses }
    };
    
    const [total, announcements] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { id: true, username: true, realName: true } },
          courseOffering: { include: { course: true } }
        }
      })
    ]);
    
    return { data: announcements, pagination: { page, pageSize, total } };
  }

  static async updateAnnouncement(announcementId: string, userId: string, data: UpdateAnnouncementDto) {
    const announcement = await prisma.forumPost.findUnique({
      where: { id: announcementId, isAnnouncement: true }
    });
    
    if (!announcement) {
      throw new NotFoundError('公告');
    }
    
    const isTeacher = await this.isTeacherForCourse(userId, announcement.courseOfferingId);
    if (!isTeacher) {
      throw new ForbiddenError('仅任课教师可编辑公告');
    }
    
    return await prisma.forumPost.update({
      where: { id: announcementId },
      data: { ...data, updatedAt: new Date() }
    });
  }

  static async deleteAnnouncement(announcementId: string, userId: string) {
    const announcement = await prisma.forumPost.findUnique({
      where: { id: announcementId, isAnnouncement: true }
    });
    
    if (!announcement) {
      throw new NotFoundError('公告');
    }
    
    const isTeacher = await this.isTeacherForCourse(userId, announcement.courseOfferingId);
    if (!isTeacher) {
      throw new ForbiddenError('仅任课教师可删除公告');
    }
    
    return await prisma.forumPost.update({
      where: { id: announcementId },
      data: { status: 'DELETED', updatedAt: new Date() }
    });
  }

  // ==================== 检索功能 ====================

  static async searchPosts(query: SearchPostsDto, userId: string) {
    const {
      keyword,
      courseOfferingId,
      authorId,
      postType,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      sortBy = 'relevance'
    } = query;
    
    const accessibleCourses = await this.getUserAccessibleCourses(userId);
    
    const where: any = {
      status: 'NORMAL',
      courseOfferingId: courseOfferingId || { in: accessibleCourses },
      ...(authorId && { authorId }),
      ...(postType && { postType }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } }
      ]
    };
    
    const orderBy = sortBy === 'createdAt' 
      ? { createdAt: 'desc' as const }
      : sortBy === 'viewCount'
      ? { viewCount: 'desc' as const }
      : { createdAt: 'desc' as const };
    
    const [total, posts] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          author: { select: { id: true, username: true, realName: true, avatarUrl: true } }
        }
      })
    ]);
    
    const postsWithSummary = posts.map(post => ({
      ...post,
      summary: this.generateHighlight(post.content, keyword)
    }));
    
    return {
      data: postsWithSummary,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
  }

  // ==================== 统计功能 ====================

  static async getStats(query: StatsQueryDto) {
    const { courseOfferingId, startDate, endDate, period = 'week' } = query;
    
    const wherePost: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: 'NORMAL'
    };
    if (courseOfferingId) wherePost.courseOfferingId = courseOfferingId;
    
    const [totalPosts, totalComments, totalAttachments, activeUsers] = await Promise.all([
      prisma.forumPost.count({ where: wherePost }),
      prisma.forumComment.count({ 
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'NORMAL',
          ...(courseOfferingId && { post: { courseOfferingId } })
        }
      }),
      prisma.forumAttachment.count({ where: { uploadedAt: { gte: startDate, lte: endDate } } }),
      prisma.forumPost.groupBy({
        by: ['authorId'],
        where: wherePost,
        _count: { authorId: true }
      }).then(result => result.length)
    ]);
    
    return {
      totalPosts,
      totalComments,
      totalAttachments,
      activeUsers,
      periodData: await this.getPeriodData(startDate, endDate, period, courseOfferingId)
    };
  }

  static async getHotPosts(query: HotPostsQueryDto) {
    const { period, courseOfferingId, limit = 10 } = query;
    
    const now = new Date();
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }
    
    const where: any = {
      createdAt: { gte: startDate },
      status: 'NORMAL'
    };
    if (courseOfferingId) where.courseOfferingId = courseOfferingId;
    
    const posts = await prisma.forumPost.findMany({
      where,
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        author: { select: { id: true, username: true, realName: true } },
        courseOffering: { include: { course: true } },
        _count: { select: { comments: true } }
      }
    });
    
    return posts.map(post => ({
      id: post.id,
      title: post.title,
      viewCount: post.viewCount,
      commentCount: post._count.comments,
      author: post.author,
      courseName: post.courseOffering.course.name,
      activityScore: (post.viewCount * 0.7) + (post._count.comments * 1.3)
    }));
  }

  /**
   * 按用户统计（FR-D-18）
   */
  static async getUserStats(query: UserStatsQueryDto): Promise<UserStatsDto> {
    const { userId, courseOfferingId, startDate, endDate } = query;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, realName: true }
    });
    
    if (!user) {
      throw new NotFoundError('用户');
    }
    
    const dateFilter = startDate && endDate ? {
      createdAt: { gte: startDate, lte: endDate }
    } : {};
    
    const courseFilter = courseOfferingId ? { courseOfferingId } : {};
    
    const [postCount, commentCount, announcementCount] = await Promise.all([
      prisma.forumPost.count({
        where: {
          authorId: userId,
          ...dateFilter,
          ...courseFilter,
          status: 'NORMAL',
          isAnnouncement: false
        }
      }),
      prisma.forumComment.count({
        where: {
          authorId: userId,
          ...dateFilter,
          status: 'NORMAL',
          ...(courseOfferingId && {
            post: { courseOfferingId }
          })
        }
      }),
      prisma.forumPost.count({
        where: {
          authorId: userId,
          isAnnouncement: true,
          ...dateFilter,
          ...courseFilter,
          status: 'NORMAL'
        }
      })
    ]);
    
    return {
      userId: user.id,
      username: user.username,
      realName: user.realName,
      postCount,
      commentCount,
      announcementCount,
      totalCount: postCount + commentCount + announcementCount
    };
  }

  /**
   * 按课程统计活跃度（FR-D-19）
   */
  static async getCourseActivityStats(
    courseOfferingId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CourseActivityStatsDto[]> {
    const dateFilter = startDate && endDate ? {
      createdAt: { gte: startDate, lte: endDate }
    } : {};
    
    const courseFilter = courseOfferingId ? { id: courseOfferingId } : {};
    
    const courseOfferings = await prisma.courseOffering.findMany({
      where: courseFilter,
      include: {
        course: true,
        teacher: {
          include: { user: true }
        }
      }
    });
    
    const stats: CourseActivityStatsDto[] = [];
    
    for (const offering of courseOfferings) {
      const postCount = await prisma.forumPost.count({
        where: {
          courseOfferingId: offering.id,
          ...dateFilter,
          status: 'NORMAL'
        }
      });
      
      const commentCount = await prisma.forumComment.count({
        where: {
          post: { courseOfferingId: offering.id },
          ...dateFilter,
          status: 'NORMAL'
        }
      });
      
      const postAuthors = await prisma.forumPost.findMany({
        where: {
          courseOfferingId: offering.id,
          ...dateFilter,
          status: 'NORMAL'
        },
        distinct: ['authorId'],
        select: { authorId: true }
      });
      
      const commentAuthors = await prisma.forumComment.findMany({
        where: {
          post: { courseOfferingId: offering.id },
          ...dateFilter,
          status: 'NORMAL'
        },
        distinct: ['authorId'],
        select: { authorId: true }
      });
      
      const uniqueAuthors = new Set([
        ...postAuthors.map(p => p.authorId),
        ...commentAuthors.map(c => c.authorId)
      ]);
      
      const activityScore = postCount * 2 + commentCount * 1 + uniqueAuthors.size * 5;
      
      stats.push({
        courseOfferingId: offering.id,
        courseName: offering.course.name,
        courseCode: offering.course.code,
        teacherName: offering.teacher.user.realName,
        postCount,
        commentCount,
        participantCount: uniqueAuthors.size,
        uniqueAuthors: postAuthors.length,
        uniqueCommenters: commentAuthors.length,
        activityScore
      });
    }
    
    return stats.sort((a, b) => b.activityScore - a.activityScore);
  }

  /**
   * 导出统计结果（FR-D-21）
   */
  static async exportStats(query: StatsQueryDto, userId: string): Promise<StatsExportDto> {
    const { courseOfferingId, startDate, endDate, period = 'week' } = query;
    
    const courseStats = await this.getCourseActivityStats(courseOfferingId, startDate, endDate);
    
    await this.createAuditLog({
      userId,
      action: 'EXPORT_STATS',
      resourceType: 'post',
      resourceId: 'export',
      details: { period, startDate, endDate, recordCount: courseStats.length }
    });
    
    return {
      period: period as 'week' | 'month',
      startDate,
      endDate,
      data: courseStats,
      generatedAt: new Date(),
      exportedBy: userId
    };
  }

  /**
   * 导出为CSV格式
   */
  static async exportStatsAsCsv(query: StatsQueryDto, userId: string): Promise<string> {
    const exportData = await this.exportStats(query, userId);
    
    const headers = [
      '课程ID', '课程名称', '课程代码', '任课教师',
      '帖子数', '评论数', '参与人数', '独立发帖人数',
      '独立评论人数', '活跃度分数'
    ];
    
    const rows = exportData.data.map(item => [
      item.courseOfferingId,
      item.courseName,
      item.courseCode,
      item.teacherName,
      item.postCount,
      item.commentCount,
      item.participantCount,
      item.uniqueAuthors,
      item.uniqueCommenters,
      item.activityScore
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  // ==================== 附件管理 ====================

  static async uploadAttachment(userId: string, file: UploadedFile, postId?: string) {
    // 验证附件
    this.validateAttachment(file);
    
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!userExists) {
      throw new NotFoundError('用户');
    }
    
    const data: any = {
      fileName: file.originalname,
      filePath: file.path,
      fileSize: BigInt(file.size),
      fileType: file.mimetype,
      uploadedAt: new Date()
    };
    
    if (postId) {
      data.postId = postId;
    }
    
    const attachment = await prisma.forumAttachment.create({ data });
    
    // 审计日志
    await this.createAuditLog({
      userId,
      action: 'UPLOAD_ATTACHMENT',
      resourceType: 'attachment',
      resourceId: attachment.id,
      details: { fileName: file.originalname, fileSize: file.size, postId }
    });
    
    return attachment;
  }

  static async uploadAttachments(userId: string, files: UploadedFile[], postId?: string) {
    const attachments = await Promise.all(
      files.map(file => this.uploadAttachment(userId, file, postId))
    );
    return attachments;
  }

  static async deleteAttachment(attachmentId: string, userId: string, isAdmin: boolean) {
    const attachment = await prisma.forumAttachment.findUnique({
      where: { id: attachmentId },
      include: { post: true }
    });
    
    if (!attachment) {
      throw new NotFoundError('附件');
    }
    
    if (attachment.post && attachment.post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限删除此附件');
    }
    
    // 删除物理文件
    if (attachment.filePath && fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }
    
    return await prisma.forumAttachment.delete({
      where: { id: attachmentId }
    });
  }
}
