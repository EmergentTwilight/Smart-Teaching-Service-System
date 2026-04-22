import { Request, Response } from 'express';
import { ForumService } from './forum.service.js';
import { success, error } from '../../shared/utils/response.js';
import { NotFoundError, ForbiddenError } from '@stss/shared';
import { QueryPostDto } from './forum.types.js'; // 引入类型

export class ForumController {
  // 处理发帖请求
  static async createPost(req: Request, res: Response) {
    try {
      // req.user 由 auth 中间件注入，一定存在
      const post = await ForumService.createPost(req.user!.userId, req.body);
      success(res, post, '发布成功', 201); // 创建成功返回 201
    } catch (err) {
      error(res, err instanceof Error ? err.message : '发布失败', 500);
    }
  }

  // 处理获取列表请求
  static async getPosts(req: Request, res: Response) {
    try {
      // 分页和筛选参数在 req.query 中，使用安全的类型断言替代 any
      const data = await ForumService.getPosts(req.query as unknown as QueryPostDto);
      success(res, data);
    } catch (err) {
      error(res, err instanceof Error ? err.message : '获取列表失败', 500);
    }
  }

  // 处理获取详情请求
  static async getPostDetail(req: Request, res: Response) {
    try {
      // 帖子ID在路由路径中：/posts/:id
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const post = await ForumService.getPostDetail(postId);
      success(res, post);
    } catch (err) {
      if (err instanceof NotFoundError) {
        error(res, err.message, 404);
      } else {
        error(res, err instanceof Error ? err.message : '获取详情失败', 500);
      }
    }
  }

  // 处理评论请求
  static async createComment(req: Request, res: Response) {
    try {
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const comment = await ForumService.createComment(postId, req.user!.userId, req.body);
      success(res, comment, '评论成功', 201); // 创建成功返回 201
    } catch (err) {
      if (err instanceof NotFoundError) {
        error(res, err.message, 404);
      } else {
        error(res, err instanceof Error ? err.message : '评论失败', 500);
      }
    }
  }

  // 处理获取评论列表请求
  static async getComments(req: Request, res: Response) {
    try {
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const comments = await ForumService.getComments(postId);
      success(res, comments);
    } catch (err) {
      error(res, err instanceof Error ? err.message : '获取评论失败', 500);
    }
  }

  // 处理编辑帖子请求
  static async updatePost(req: Request, res: Response) {
    try {
      // 检查当前操作者是否具有管理权限
      const isAdmin = req.user!.roles.some(role => ['admin', 'teacher'].includes(role));
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const post = await ForumService.updatePost(postId, req.user!.userId, req.body, isAdmin);
      success(res, post, '更新成功');
    } catch (err) {
      if (err instanceof NotFoundError) {
        error(res, err.message, 404);
      } else if (err instanceof ForbiddenError) {
        error(res, err.message, 403);
      } else {
        error(res, err instanceof Error ? err.message : '更新失败', 500);
      }
    }
  }

  // 处理删帖请求
  static async deletePost(req: Request, res: Response) {
    try {
      // 检查当前操作者是否具有管理权限
      const isAdmin = req.user!.roles.some(role => ['admin', 'teacher'].includes(role));
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ForumService.deletePost(postId, req.user!.userId, isAdmin);
      success(res, null, '删除成功');
    } catch (err) {
      if (err instanceof NotFoundError) {
        error(res, err.message, 404);
      } else if (err instanceof ForbiddenError) {
        error(res, err.message, 403);
      } else {
        error(res, err instanceof Error ? err.message : '删除失败', 500);
      }
    }
  }
}