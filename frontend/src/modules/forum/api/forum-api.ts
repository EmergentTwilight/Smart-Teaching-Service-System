import request from '@/shared/utils/request'
import type {
  CourseOption,
  CreatePostPayload,
  ForumComment,
  ForumPost,
  ForumPostListResult,
  UploadAttachmentPayload,
  UploadAttachmentResult,
} from '../types'

export interface PostQueryParams {
  page?: number
  pageSize?: number
  courseOfferingId?: string
  keyword?: string
  postType?: string
  authorId?: string
  sortBy?: string
  sortOrder?: string
}

export interface SearchQueryParams {
  keyword: string
  courseOfferingId?: string
  page?: number
  pageSize?: number
}

export const forumApi = {
  getPosts: (params?: PostQueryParams): Promise<ForumPostListResult> =>
    request.get('/forum/posts', { params }),

  getPost: (id: string): Promise<ForumPost> => request.get(`/forum/posts/${id}`),

  createPost: (data: CreatePostPayload): Promise<ForumPost> =>
    request.post('/forum/posts', data),

  getAnnouncements: (params?: {
    courseOfferingId?: string
    page?: number
    pageSize?: number
  }): Promise<ForumPostListResult> => request.get('/forum/announcements', { params }),

  getComments: (postId: string): Promise<ForumComment[]> =>
    request.get(`/forum/posts/${postId}/comments`),

  createComment: (
    postId: string,
    data: { content: string; parentId?: string }
  ): Promise<ForumComment> => request.post(`/forum/posts/${postId}/comments`, data),

  searchPosts: (params: SearchQueryParams): Promise<ForumPostListResult> =>
    request.get('/forum/search', { params }),

  uploadAttachment: (data: UploadAttachmentPayload): Promise<UploadAttachmentResult> =>
    request.post('/forum/attachments', data),

  getCourseActivity: async (): Promise<CourseOption[]> => {
    const end = new Date()
    const start = new Date()
    start.setFullYear(start.getFullYear() - 1)
    const list = await request.get('/forum/stats/course-activity', {
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    }) as unknown as Array<{
        courseOfferingId: string
        courseName: string
        courseCode: string
      }>
    return (list ?? []).map((item) => ({
      courseOfferingId: item.courseOfferingId,
      courseName: item.courseName,
      courseCode: item.courseCode,
    }))
  },
}
