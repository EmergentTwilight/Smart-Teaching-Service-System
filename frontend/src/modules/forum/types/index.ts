/** 论坛模块类型定义（对齐 backend forum.types.ts） */

export type PostType = 'QUESTION' | 'DISCUSSION' | 'SHARE' | 'ANNOUNCEMENT'
export type PostStatus = 'NORMAL' | 'HIDDEN' | 'DELETED'

export interface AuthorInfo {
  id: string
  username: string
  realName?: string | null
  avatarUrl?: string | null
}

export interface CourseInfo {
  id: string
  name: string
  code: string
}

export interface CourseOfferingInfo {
  id: string
  course: CourseInfo
}

export interface ForumAttachment {
  id: string
  fileName: string
  fileSize: number | string
  fileType?: string | null
  fileUrl?: string
  filePath?: string
  uploadedAt?: string
}

export interface ForumPost {
  id: string
  title: string
  content: string
  postType: PostType
  status?: PostStatus
  isPinned: boolean
  isAnnouncement: boolean
  viewCount: number
  commentCount: number
  author: AuthorInfo
  courseOffering: CourseOfferingInfo
  attachments?: ForumAttachment[]
  createdAt: string
  updatedAt?: string | null
  summary?: string
}

export interface ForumComment {
  id: string
  content: string
  status?: PostStatus
  depth: number
  author: AuthorInfo
  children: ForumComment[]
  createdAt: string
}

export interface ForumPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ForumPaginatedResult<T> {
  data: T[]
  pagination: ForumPagination
}

export type ForumPostListResult = ForumPaginatedResult<ForumPost>

export interface CourseOption {
  courseOfferingId: string
  courseName: string
  courseCode: string
  teacherName?: string
  postCount?: number
  commentCount?: number
  participantCount?: number
  activityScore?: number
}

export interface CreatePostPayload {
  courseOfferingId: string
  title: string
  content: string
  postType: PostType
  isAnnouncement?: boolean
  attachmentIds?: string[]
}

export interface UpdatePostPayload {
  title?: string
  content?: string
  isPinned?: boolean
  isAnnouncement?: boolean
}

export interface CreateAnnouncementPayload {
  courseOfferingId: string
  title: string
  content: string
  isPinned?: boolean
}

export interface UpdateAnnouncementPayload {
  title?: string
  content?: string
  isPinned?: boolean
}

export interface UploadAttachmentPayload {
  fileName: string
  fileType?: string
  content: string
}

export interface UploadAttachmentResult {
  id: string
  fileName: string
  fileSize: number
  fileType?: string | null
  fileUrl?: string
}

export interface ForumStatsOverview {
  totalPosts: number
  totalComments: number
  totalAttachments: number
  activeUsers: number
  periodData?: Array<{
    date: string
    postCount: number
    commentCount: number
  }>
}

export interface HotPostItem {
  id: string
  title: string
  viewCount: number
  commentCount: number
  author: AuthorInfo
  courseName: string
  activityScore: number
}

export interface UserStats {
  userId: string
  username: string
  realName: string
  postCount: number
  commentCount: number
  announcementCount: number
  totalCount: number
}

export interface HiddenComment {
  id: string
  content: string
  author: AuthorInfo
  post: {
    id: string
    title: string
    courseOfferingId: string
  }
  createdAt: string
}
