import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminScoreApprovalPage from '@/modules/score-management/admin/pages/AdminScoreApprovalPage'
import { scoreManagementApi } from '@/modules/score-management/api/score-management'

vi.mock('@/modules/score-management/api/score-management', () => ({
  scoreManagementApi: {
    getPendingModificationRequests: vi.fn(),
    approveModificationRequest: vi.fn(),
    rejectModificationRequest: vi.fn(),
    getModificationLogs: vi.fn(),
  },
}))

const mockedApi = vi.mocked(scoreManagementApi)

describe('AdminScoreApprovalPage', () => {
  it('renders pending requests and opens approval dialog', async () => {
    mockedApi.getPendingModificationRequests.mockResolvedValue({
      items: [
        {
          scoreId: 'score-1',
          status: 'SUBMITTED',
          courseOfferingId: 'course-offering-1',
          teacherId: 'teacher-1',
          studentId: 'student-1',
          request: {
            proposedChanges: { finalScore: 92 },
            reason: '试卷复核后调整',
            applicantId: 'teacher-1',
            appliedAt: '2026-06-14T10:00:00.000Z',
          },
          student: { id: 'student-1', username: 'student', realName: '测试学生' },
          teacher: { id: 'teacher-1', username: 'teacher', realName: '测试教师' },
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1 },
    })

    render(<AdminScoreApprovalPage />)

    expect(await screen.findByText('测试学生')).toBeInTheDocument()
    expect(screen.getByText('测试教师')).toBeInTheDocument()
    expect(screen.getByText('期末 92')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /通\s*过/ }))

    await waitFor(() => {
      expect(screen.getByText('通过改分申请')).toBeInTheDocument()
    })
  })
})
