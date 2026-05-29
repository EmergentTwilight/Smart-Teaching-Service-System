import type { CourseOption, ForumComment, ForumPost } from '../types'

export const DEMO_COURSE_OFFERING_ID = '00000000-0000-4000-8000-000000000001'

export const DEMO_COURSES: CourseOption[] = [
  {
    courseOfferingId: DEMO_COURSE_OFFERING_ID,
    courseName: '软件工程',
    courseCode: 'CS301',
  },
  {
    courseOfferingId: '00000000-0000-4000-8000-000000000002',
    courseName: '数据结构',
    courseCode: 'CS201',
  },
]

const author = (name: string, username: string) => ({
  id: `demo-user-${username}`,
  username,
  realName: name,
  avatarUrl: null,
})

const course = (name: string, code: string) => ({
  id: DEMO_COURSE_OFFERING_ID,
  course: { id: 'demo-course-1', name, code },
})

export const DEMO_POSTS: ForumPost[] = [
  {
    id: 'demo-post-1',
    title: '【公告】第 12 周实验安排与提交说明',
    content:
      '各位同学好，请于本周五前完成实验报告上传。附件含实验模板与评分标准，如有疑问可在本帖回复。',
    postType: 'ANNOUNCEMENT',
    isPinned: true,
    isAnnouncement: true,
    viewCount: 328,
    commentCount: 12,
    author: author('李老师', 'teacher'),
    courseOffering: course('软件工程', 'CS301'),
    attachments: [
      {
        id: 'demo-att-1',
        fileName: '实验报告模板.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-post-2',
    title: '关于第三章作业中动态规划状态转移的疑问',
    content:
      '课件例题里 f[i][j] 的定义和习题 3-2 不太一样，想确认边界条件应该怎么设？',
    postType: 'QUESTION',
    isPinned: false,
    isAnnouncement: false,
    viewCount: 156,
    commentCount: 8,
    author: author('张同学', 'student'),
    courseOffering: course('软件工程', 'CS301'),
    attachments: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-post-3',
    title: '分享：期末复习思维导图（可下载）',
    content: '整理了一份课程知识脉络图，希望对大家复习有帮助。',
    postType: 'SHARE',
    isPinned: false,
    isAnnouncement: false,
    viewCount: 89,
    commentCount: 3,
    author: author('王同学', 'student'),
    courseOffering: course('软件工程', 'CS301'),
    attachments: [
      {
        id: 'demo-att-2',
        fileName: '复习导图.png',
        fileSize: 512000,
        fileType: 'image/png',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
]

export const DEMO_COMMENTS: Record<string, ForumComment[]> = {
  'demo-post-2': [
    {
      id: 'demo-c1',
      content: '边界条件建议先看子问题规模最小的情况，再对照课件表格。',
      depth: 0,
      author: author('李老师', 'teacher'),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      children: [
        {
          id: 'demo-c2',
          content: '明白了，谢谢老师！',
          depth: 1,
          author: author('张同学', 'student'),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          children: [],
        },
      ],
    },
    {
      id: 'demo-c3',
      content: '我也卡在这题，蹲一个详细推导。',
      depth: 0,
      author: author('赵同学', 'student'),
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      children: [],
    },
  ],
}

export function getDemoPostById(id: string): ForumPost | undefined {
  return DEMO_POSTS.find((p) => p.id === id)
}

export function getDemoComments(postId: string): ForumComment[] {
  return DEMO_COMMENTS[postId] ?? []
}
