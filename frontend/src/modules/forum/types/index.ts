/** 论坛模块类型定义（对齐后端 forum.types.ts） */

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

export interface ForumPostListResult {
  data: ForumPost[]
  pagination: ForumPagination
}

export interface CourseOption {
  courseOfferingId: string
  courseName: string
  courseCode: string
}

export interface CreatePostPayload {
  courseOfferingId: string
  title: string
  content: string
  postType: PostType
  attachmentIds?: string[]
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
}
