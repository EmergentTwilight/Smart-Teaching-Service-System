import type { PostType } from '../types'

export const FORUM_COURSE_STORAGE_KEY = 'stss.forum.courseOfferingId'
export const FORUM_DEMO_MODE_KEY = 'stss.forum.demoMode'

export const POST_TYPE_LABELS: Record<PostType, string> = {
  QUESTION: '提问',
  DISCUSSION: '讨论',
  SHARE: '分享',
  ANNOUNCEMENT: '公告',
}

export const POST_TYPE_COLORS: Record<PostType, string> = {
  QUESTION: 'blue',
  DISCUSSION: 'green',
  SHARE: 'cyan',
  ANNOUNCEMENT: 'gold',
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export const ALLOWED_ATTACHMENT_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.md',
]
