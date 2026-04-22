import { Prisma } from '@prisma/client'; // 新增这一行：引入 Prisma 类型
import prisma from '../../shared/prisma/client.js';
import { CreatePostDto, UpdatePostDto, CreateCommentDto, QueryPostDto } from './forum.types.js';
import { NotFoundError, ForbiddenError } from '@stss/shared';

export class ForumService {
  /**
   * 1. 发布新帖
   * 包含事务逻辑：创建帖子的同时，更新预上传附件的外键 (postId)
   */
  static async createPost(authorId: string, data: CreatePostDto) {
    const { attachmentIds, ...postData } = data;
    
    return await prisma.$transaction(async (tx) => {
      // 创建帖子数据
      const post = await tx.forumPost.create({
        data: { ...postData, authorId },
      });

      // 如果有附件，将附件与新创建的帖子绑定
      if (attachmentIds && attachmentIds.length > 0) {
        await tx.forumAttachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { postId: post.id },
        });
      }
      return post;
    });
  }

  /**
   * 2. 分页查询帖子列表
   * 支持多条件组合查询，自动过滤已删除(DELETED)状态的帖子
   */
  static async getPosts(query: QueryPostDto) {
    const { page = 1, pageSize = 20, courseOfferingId, keyword, postType, isAnnouncement } = query;
    const skip = (page - 1) * pageSize;

    // 构建动态查询条件 (仅查询正常帖子)
    // 修改点：使用 Prisma 的类型替换 any
    const where: Prisma.ForumPostWhereInput = { status: 'NORMAL' };
    
    if (courseOfferingId) where.courseOfferingId = courseOfferingId;
    if (postType) where.postType = postType;
    if (isAnnouncement !== undefined) where.isAnnouncement = isAnnouncement;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } }, // 忽略大小写匹配标题
        { content: { contains: keyword, mode: 'insensitive' } } // 忽略大小写匹配正文
      ];
    }

    // 并发执行 count 和 findMany，提升响应速度
    const [total, posts] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { isPinned: 'desc' }, // 置顶帖优先
          { createdAt: 'desc' } // 按时间倒序
        ],
        // 连表查询出作者基本信息
        include: {
          author: { select: { id: true, realName: true, avatarUrl: true } }
        }
      })
    ]);

    return { total, page, pageSize, posts };
  }

  /**
   * 3. 获取帖子详情
   * 每次请求会自动将帖子的浏览量 (viewCount) +1
   */
  static async getPostDetail(postId: string) {
    // 先检查帖子是否存在
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, realName: true, avatarUrl: true } },
        attachments: true // 带上附件信息
      }
    });

    if (!post) {
      throw new NotFoundError('帖子');
    }

    // 更新浏览量
    return await prisma.forumPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
      include: {
        author: { select: { id: true, realName: true, avatarUrl: true } },
        attachments: true
      }
    });
  }

  /**
   * 4. 发表评论/回复
   * 自动计算当前评论的深度 (depth)
   */
  static async createComment(postId: string, authorId: string, data: CreateCommentDto) {
    // 先检查帖子是否存在
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true }
    });

    if (!post) {
      throw new NotFoundError('帖子');
    }

    let depth = 0;
    
    // 如果是回复某条评论，深度 = 父评论深度 + 1
    if (data.parentId) {
      const parent = await prisma.forumComment.findUnique({
        where: { id: data.parentId },
        select: { depth: true }
      });
      if (parent) depth = parent.depth + 1;
    }

    return await prisma.forumComment.create({
      data: {
        postId,
        authorId,
        content: data.content,
        parentId: data.parentId,
        depth
      }
    });
  }

  /**
   * 5. 获取帖子下所有的评论
   * 取出所有有效评论，前台可以根据 parentId 和 depth 自行组装树形/楼中楼结构
   */
  static async getComments(postId: string) {
    return await prisma.forumComment.findMany({
      where: { postId, status: 'NORMAL' }, // 忽略被软删除的评论
      orderBy: { createdAt: 'asc' },       // 按时间正序排（盖楼顺序）
      include: {
        author: { select: { id: true, realName: true, avatarUrl: true } }
      }
    });
  }

  /**
   * 6. 编辑帖子
   * 只允许作者本人或管理员编辑
   */
  static async updatePost(postId: string, userId: string, data: UpdatePostDto, isAdmin: boolean) {
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    // 权限校验：只允许发帖人自己，或拥有管理权限的人编辑
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限编辑此帖子');
    }

    // 如果非管理员试图修改置顶或公告状态，拒绝操作
    if (!isAdmin && (data.isPinned !== undefined || data.isAnnouncement !== undefined)) {
      throw new ForbiddenError('只有管理员或教师可以设置置顶和公告');
    }

    return await prisma.forumPost.update({
      where: { id: postId },
      data: {
        ...data,
        updatedAt: new Date() // 更新修改时间
      },
      include: {
        author: { select: { id: true, realName: true, avatarUrl: true } }
      }
    });
  }

  /**
   * 7. 软删除帖子
   * 仅将 status 修改为 DELETED，数据依旧保留在数据库中
   */
  static async deletePost(postId: string, userId: string, isAdmin: boolean) {
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundError('帖子');
    }
    
    // 权限校验：只允许发帖人自己，或拥有管理权限的人删除
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('无权限删除此帖子');
    }

    return await prisma.forumPost.update({
      where: { id: postId },
      data: { status: 'DELETED' } // 软删除标记
    });
  }
}