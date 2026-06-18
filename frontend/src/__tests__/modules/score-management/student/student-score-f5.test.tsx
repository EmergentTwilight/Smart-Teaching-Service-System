import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { StudentScoreAdapter } from '@/modules/score-management/student/adapters/student-score-adapter'
import { CreditProgressCard } from '@/modules/score-management/student/components/gpa-summary'
import { ScoreListTable } from '@/modules/score-management/student/components/score-list'
import type {
  ScoreItem,
  StudentScoreSummary,
} from '@/modules/score-management/student/types/score-types'

beforeAll(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        getPropertyValue: () => '0px',
      }) as CSSStyleDeclaration
  )

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  class ResizeObserverMock {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

const summary: StudentScoreSummary = {
  studentId: 'stu-1',
  studentName: '测试学生',
  majorName: '计算机科学与技术',
  grade: 2023,
  gpa: 3.24,
  averageScore: 80.6,
  totalRequiredCredits: 120,
  earnedCredits: 19,
  passedCredits: 19,
  inProgressCredits: 8,
  remainingRequiredCredits: 101,
  passedCourseCount: 5,
  failedCourseCount: 0,
  effectiveScoreRule: '同一课程多次成绩按最高总评计入统计；总评相同时取最近修改或录入记录',
  curriculumProgress: {
    curriculumId: 'cur-1',
    curriculumName: '计算机科学与技术 2023 培养方案',
    totalRequiredCredits: 120,
    requiredCredits: 90,
    electiveCredits: 30,
    passedCredits: 19,
    requiredPassedCredits: 17,
    electivePassedCredits: 2,
    remainingRequiredCredits: 101,
    curriculumCourseCount: 8,
    completedCurriculumCourseCount: 5,
    completionRate: 15.83,
  },
}

const scoreRows: ScoreItem[] = [
  {
    scoreId: 'score-effective',
    enrollmentId: 'enrollment-1',
    courseOfferingId: 'offering-1',
    courseId: 'course-1',
    courseCode: 'CS101',
    courseName: '数据结构与算法',
    credits: 4,
    courseType: 'REQUIRED',
    semesterId: 'sem-1',
    semesterName: '2025-2026-1',
    usualScore: 95,
    midtermScore: 95,
    finalScore: 95,
    totalScore: 95,
    gradePoint: 1.5,
    gradeLetter: 'C',
    status: 'SUBMITTED',
    hasPendingModificationRequest: false,
    isEffective: true,
  },
  {
    scoreId: 'score-ignored',
    enrollmentId: 'enrollment-2',
    courseOfferingId: 'offering-2',
    courseId: 'course-1',
    courseCode: 'CS101',
    courseName: '数据结构与算法',
    credits: 4,
    courseType: 'REQUIRED',
    semesterId: 'sem-2',
    semesterName: '2025-2026-2',
    usualScore: 80,
    midtermScore: 80,
    finalScore: 80,
    totalScore: 80,
    gradePoint: 3,
    gradeLetter: 'B',
    status: 'CONFIRMED',
    hasPendingModificationRequest: false,
    isEffective: false,
  },
]

describe('F5 student score frontend', () => {
  it('adapts latest F3 score summary and score list fields', () => {
    const adaptedSummary = StudentScoreAdapter.adaptScoreSummary(summary)

    expect(adaptedSummary.remainingRequiredCredits).toBe(101)
    expect(adaptedSummary.effectiveScoreRule).toContain('同一课程多次成绩')
    expect(adaptedSummary.curriculumProgress.completionRate).toBe(15.83)

    const adaptedList = StudentScoreAdapter.adaptScoreList({
      items: scoreRows,
      pagination: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      },
    })

    expect(adaptedList.items[0].isEffective).toBe(true)
    expect(adaptedList.items[1].isEffective).toBe(false)
  })

  it('renders curriculum progress from F3 summary data', () => {
    render(<CreditProgressCard summary={summary} />)

    expect(screen.getByText('培养方案进度')).toBeInTheDocument()
    expect(screen.getByText('总完成度')).toBeInTheDocument()
    expect(screen.getByText('必修学分')).toBeInTheDocument()
    expect(screen.getByText('17.0 / 90.0')).toBeInTheDocument()
    expect(screen.getByText('计算机科学与技术 2023 培养方案')).toBeInTheDocument()
  })

  it('shows backend grade letter and effective score marker in score table', () => {
    render(
      <ScoreListTable
        dataSource={scoreRows}
        current={1}
        pageSize={20}
        total={2}
        onPageChange={vi.fn()}
      />
    )

    expect(screen.getByText('C / 1.50')).toBeInTheDocument()
    expect(screen.getByText('B / 3.00')).toBeInTheDocument()
    expect(screen.getByText('计入统计')).toBeInTheDocument()
    expect(screen.getByText('不计入统计')).toBeInTheDocument()
  })
})
