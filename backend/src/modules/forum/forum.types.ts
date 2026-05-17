// forum.types.ts
import { PostType, PostStatus } from '@prisma/client';

// ============ 请求 DTO ============

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
  status?: PostStatus;      // 状态管理 (FR-D-10): NORMAL | HIDDEN | DELETED
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
  authorId?: string;        // 按作者筛选
  status?: PostStatus;      // 按状态筛选（管理员）：NORMAL | HIDDEN | DELETED
  startDate?: Date;         // 时间范围筛选
  endDate?: Date;
  sortBy?: 'createdAt' | 'viewCount';  // 排序字段（commentCount 需要聚合计算，不支持直接排序）
  sortOrder?: 'asc' | 'desc';
}

// ============ 帖子检索 DTO (FR-D-22 ~ FR-D-26) ============
export interface SearchPostsDto {
  keyword: string;                    // 必填关键字
  courseOfferingId?: string;
  authorId?: string;
  postType?: PostType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'createdAt' | 'viewCount';  // 相关度或时间排序
}

// ============ 公告管理 DTO ============
export interface CreateAnnouncementDto {
  courseOfferingId: string;
  title: string;
  content: string;
  isPinned?: boolean;       // 是否置顶
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
}

export interface QueryAnnouncementDto {
  page?: number;
  pageSize?: number;
  courseOfferingId?: string;
}

// ============ 数据统计 DTO (FR-D-18 ~ FR-D-21) ============
export interface StatsQueryDto {
  courseOfferingId?: string;
  startDate: Date;
  endDate: Date;
  period?: 'day' | 'week' | 'month';
}

export interface HotPostsQueryDto {
  period: 'week' | 'month';
  courseOfferingId?: string;
  limit?: number;
}

// ============ 新增：用户统计 DTO (FR-D-18) ============
export interface UserStatsQueryDto {
  userId: string;
  courseOfferingId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UserStatsDto {
  userId: string;
  username: string;
  realName: string;
  postCount: number;        // 发帖数
  commentCount: number;     // 评论数
  announcementCount: number;// 公告数
  totalCount: number;       // 总计
}

// ============ 新增：课程活跃度统计 DTO (FR-D-19) ============
export interface CourseActivityStatsDto {
  courseOfferingId: string;
  courseName: string;
  courseCode: string;
  teacherName: string;
  postCount: number;
  commentCount: number;
  participantCount: number;   // 参与人数（发帖+评论的去重用户）
  uniqueAuthors: number;      // 独立发帖人数
  uniqueCommenters: number;   // 独立评论人数
  activityScore: number;      // 活跃度分数
}

// ============ 新增：统计导出 DTO (FR-D-21) ============
export interface StatsExportDto {
  period: 'week' | 'month' | 'custom';
  startDate: Date;
  endDate: Date;
  data: CourseActivityStatsDto[];
  generatedAt: Date;
  exportedBy: string;
}

// ============ 新增：评论管理 DTO (FR-D-17 完整) ============
export interface ManageCommentDto {
  action: 'hide' | 'restore' | 'delete';
  reason?: string;
}

// ============ 新增：审计日志 DTO (NFR-D-05) ============
export interface AuditLogDto {
  userId: string;
  action: string;
  resourceType: 'post' | 'comment' | 'announcement' | 'attachment';
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ============ 新增：请求信息（用于审计） ============
export interface RequestInfo {
  ip?: string;
  ua?: string;
}

// ============ 新增：文件上传相关类型 ============
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export interface AttachmentUploadDto {
  fileName: string;
  fileType?: string;
  content: string;  // base64 编码的内容
}

// ============ 响应类型 ============

// 作者信息（基础）
export interface AuthorInfoDto {
  id: string;
  username: string;
  realName?: string;        // 添加真实姓名，便于教学管理
  avatarUrl?: string;       // 修正为 avatarUrl（schema 中的字段名）
}

// 课程信息（基础）
export interface CourseInfoDto {
  id: string;
  name: string;
  code: string;
}

// 开课信息（扩展）
export interface CourseOfferingInfoDto {
  id: string;
  course: CourseInfoDto;
}

// 附件响应 DTO
export interface AttachmentResponseDto {
  id: string;
  fileName: string;
  fileSize: bigint | number;  // Prisma 返回 BigInt，需要序列化处理
  fileType: string | null;
  fileUrl: string;            // 根据 filePath 构建的完整 URL
  uploadedAt: Date;           // schema 中使用 uploadedAt
}

// 帖子响应 DTO
export interface PostResponseDto {
  id: string;
  title: string;
  content: string;
  postType: PostType;
  status: PostStatus;
  isPinned: boolean;
  isAnnouncement: boolean;
  viewCount: number;
  commentCount: number;       // 动态计算，不从数据库直接读取
  author: AuthorInfoDto;
  courseOffering: CourseOfferingInfoDto;
  attachments: AttachmentResponseDto[];
  createdAt: Date;
  updatedAt: Date | null;     // schema 中 updatedAt 可为空
}

// 评论响应 DTO（使用 PostStatus 而非 CommentStatus）
export interface CommentResponseDto {
  id: string;
  content: string;
  status: PostStatus;         // 修改：使用 PostStatus 替代 CommentStatus
  depth: number;
  author: AuthorInfoDto;
  children: CommentResponseDto[];  // 子评论（嵌套结构）
  createdAt: Date;
  // 注意：schema 中 ForumComment 没有 updatedAt 字段
}

// 分页响应包装器
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 统计响应 DTO
export interface StatsResponseDto {
  totalPosts: number;
  totalComments: number;
  totalAttachments: number;
  activeUsers: number;
  periodData?: {
    date: string;
    postCount: number;
    commentCount: number;
  }[];
}

// 热帖响应 DTO
export interface HotPostDto {
  id: string;
  title: string;
  viewCount: number;
  commentCount: number;
  author: AuthorInfoDto;
  courseName: string;
  activityScore: number;      // 综合热度分数
}

// ============ 新增：隐藏评论列表响应 ============
export interface HiddenCommentDto {
  id: string;
  content: string;
  author: AuthorInfoDto;
  post: {
    id: string;
    title: string;
    courseOfferingId: string;
  };
  createdAt: Date;
}