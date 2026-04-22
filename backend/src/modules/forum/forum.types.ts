import { PostType } from '@prisma/client';

// 发帖请求载荷 (DTO)
export interface CreatePostDto {
  courseOfferingId: string; // 关联的课程开设ID
  title: string;            // 帖子标题
  content: string;          // 帖子正文（建议前端传富文本HTML或Markdown）
  postType: PostType;       // 帖子类型：提问、讨论、分享、公告
  isAnnouncement?: boolean; // 是否设为公告（需教师/管理员权限）
  attachmentIds?: string[]; // 预先上传的附件ID列表，用于发帖时绑定
}

// 编辑帖子请求载荷
export interface UpdatePostDto {
  title?: string;
  content?: string;
  isPinned?: boolean;       // 是否置顶
  isAnnouncement?: boolean;
}

// 发表评论请求载荷
export interface CreateCommentDto {
  content: string;
  parentId?: string;        // 目标评论的ID（传空代表直接回复主帖，传值代表回复评论）
}

// 帖子列表分页与筛选请求载荷
export interface QueryPostDto {
  page?: number;            // 当前页码
  pageSize?: number;        // 每页数量
  courseOfferingId?: string;// 按课程过滤
  keyword?: string;         // 模糊搜索（匹配标题或内容）
  postType?: PostType;      // 按帖子类型过滤
  isAnnouncement?: boolean; // 是否只看公告
}