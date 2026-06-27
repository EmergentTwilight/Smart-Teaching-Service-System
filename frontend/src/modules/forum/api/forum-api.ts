import axios from 'axios'
import request from '@/shared/utils/request'
import { enrollmentsApi } from '@/modules/course-selection/api/enrollments'
import type { EnrollmentListPayload } from '@/modules/course-selection/types/enrollment'
import type {
  CourseOption,
  CreateAnnouncementPayload,
  CreatePostPayload,
  ForumComment,
  ForumPost,
  ForumPostListResult,
  ForumStatsOverview,
  HiddenComment,
  HotPostItem,
  UpdateAnnouncementPayload,
  UpdatePostPayload,
  UploadAttachmentPayload,
  UploadAttachmentResult,
  UserStats,
} from '../types'

export interface PostQueryParams {
  page?: number
  pageSize?: number
  courseOfferingId?: string
  keyword?: string
  postType?: string
  authorId?: string
  isAnnouncement?: boolean
  sortBy?: string
  sortOrder?: string
}

export interface SearchQueryParams {
  keyword: string
  courseOfferingId?: string
  authorId?: string
  postType?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sortBy?: string
}

export interface StatsQueryParams {
  courseOfferingId?: string
  startDate: string
  endDate: string
  period?: 'day' | 'week' | 'month'
}

type CourseActivityApiItem = {
  courseOfferingId: string
  courseName: string
  courseCode: string
  teacherName?: string
  postCount?: number
  commentCount?: number
  participantCount?: number
  activityScore?: number
}

function getAuthToken(): string | null {
  const authStorage = localStorage.getItem('auth-storage')
  if (!authStorage) return null
  return JSON.parse(authStorage)?.state?.token ?? null
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
}

export const forumApi = {
  // ── 帖子 ──
  getPosts: (params?: PostQueryParams): Promise<ForumPostListResult> =>
    request.get('/forum/posts', { params }),

  getPost: (id: string): Promise<ForumPost> => request.get(`/forum/posts/${id}`),

  createPost: (data: CreatePostPayload): Promise<ForumPost> =>
    request.post('/forum/posts', data),

  updatePost: (id: string, data: UpdatePostPayload): Promise<ForumPost> =>
    request.patch(`/forum/posts/${id}`, data),

  deletePost: (id: string): Promise<void> => request.delete(`/forum/posts/${id}`),

  togglePin: (id: string, pinned: boolean): Promise<ForumPost> =>
    request.patch(`/forum/posts/${id}/pin`, { pinned }),

  // ── 评论 ──
  getComments: (postId: string): Promise<ForumComment[]> =>
    request.get(`/forum/posts/${postId}/comments`),

  createComment: (
    postId: string,
    data: { content: string; parentId?: string }
  ): Promise<ForumComment> => request.post(`/forum/posts/${postId}/comments`, data),

  deleteComment: (commentId: string): Promise<void> =>
    request.delete(`/forum/comments/${commentId}`),

  hideComment: (commentId: string): Promise<void> =>
    request.patch(`/forum/comments/${commentId}/hide`),

  restoreComment: (commentId: string): Promise<void> =>
    request.patch(`/forum/comments/${commentId}/restore`),

  getHiddenComments: (params?: {
    courseOfferingId?: string
    page?: number
    pageSize?: number
  }): Promise<ForumPostListResult & { data: HiddenComment[] }> =>
    request.get('/forum/comments/hidden', { params }),

  // ── 公告 ──
  getAnnouncements: (params?: {
    courseOfferingId?: string
    page?: number
    pageSize?: number
  }): Promise<ForumPostListResult> => request.get('/forum/announcements', { params }),

  createAnnouncement: (data: CreateAnnouncementPayload): Promise<ForumPost> =>
    request.post('/forum/announcements', data),

  updateAnnouncement: (id: string, data: UpdateAnnouncementPayload): Promise<ForumPost> =>
    request.patch(`/forum/announcements/${id}`, data),

  deleteAnnouncement: (id: string): Promise<void> =>
    request.delete(`/forum/announcements/${id}`),

  // ── 检索 ──
  searchPosts: (params: SearchQueryParams): Promise<ForumPostListResult> =>
    request.get('/forum/search', { params }),

  // ── 统计 ──
  getStats: (params: StatsQueryParams): Promise<ForumStatsOverview> =>
    request.get('/forum/stats', { params }),

  getHotPosts: (params?: {
    period?: 'week' | 'month'
    courseOfferingId?: string
    limit?: number
  }): Promise<HotPostItem[]> => request.get('/forum/stats/hot-posts', { params }),

  getUserStats: (userId?: string): Promise<UserStats> =>
    userId
      ? request.get(`/forum/stats/user/${userId}`)
      : request.get('/forum/stats/user'),

  getCourseActivity: async (params?: {
    startDate?: string
    endDate?: string
    courseOfferingId?: string
  }): Promise<CourseOption[]> => {
    const end = params?.endDate ? new Date(params.endDate) : new Date()
    const start = params?.startDate
      ? new Date(params.startDate)
      : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000)

    const list = (await request.get('/forum/stats/course-activity', {
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        courseOfferingId: params?.courseOfferingId,
      },
    })) as CourseActivityApiItem[]

    return (list ?? []).map((item) => ({
      courseOfferingId: item.courseOfferingId,
      courseName: item.courseName,
      courseCode: item.courseCode,
      teacherName: item.teacherName,
      postCount: item.postCount,
      commentCount: item.commentCount,
      participantCount: item.participantCount,
      activityScore: item.activityScore,
    }))
  },

  getMyEnrollmentCourses: async (): Promise<CourseOption[]> => {
    const payload = (await enrollmentsApi.listMyEnrollments({
      page: 1,
      pageSize: 100,
      status: 'enrolled',
    })) as EnrollmentListPayload

    return (payload.items ?? [])
      .map((item) => item.courseOffering)
      .filter((courseOffering) => courseOffering?.id)
      .map((courseOffering) => ({
        courseOfferingId: courseOffering.id,
        courseName: courseOffering.courseName,
        courseCode: courseOffering.courseCode,
        teacherName: courseOffering.teacherName,
      }))
  },

  exportStatsCsv: async (params: StatsQueryParams): Promise<Blob> => {
    const token = getAuthToken()
    const response = await axios.get(`${getApiBaseUrl()}/forum/stats/export`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
      withCredentials: true,
    })
    return response.data as Blob
  },

  // ── 附件 ──
  uploadAttachment: (data: UploadAttachmentPayload): Promise<UploadAttachmentResult> =>
    request.post('/forum/attachments', data, { timeout: 60000 }),

  uploadAttachmentsBatch: (files: UploadAttachmentPayload[]): Promise<UploadAttachmentResult[]> =>
    request.post('/forum/attachments/batch', { files }, { timeout: 60000 }),

  deleteAttachment: (id: string): Promise<void> => request.delete(`/forum/attachments/${id}`),
}
