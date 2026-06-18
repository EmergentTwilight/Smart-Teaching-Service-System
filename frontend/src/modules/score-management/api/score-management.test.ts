import { describe, expect, it } from 'vitest'
import { normalizeCourseScoresResult } from './score-management'

describe('normalizeCourseScoresResult', () => {
  it('should normalize paginated F1-style score rows', () => {
    const result = normalizeCourseScoresResult(
      {
        items: [
          {
            scoreId: 'score-1',
            enrollmentId: 'enrollment-1',
            studentId: 'student-1',
            studentNumber: '20230001',
            studentName: 'Alice',
            className: 'Class 1',
            usualScore: 86,
            midtermScore: 88,
            finalScore: 90,
            totalScore: 89.2,
            gradePoint: 3.7,
            gradeLetter: 'A-',
            status: 'SUBMITTED',
            hasPendingModificationRequest: true,
            modifiedAt: '2026-04-25T10:00:00.000Z',
          },
        ],
        pagination: {
          page: 2,
          pageSize: 10,
          total: 11,
        },
      },
      'course-offering-1',
      {
        page: 1,
        pageSize: 20,
      }
    )

    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 11,
    })

    expect(result.rows).toEqual([
      expect.objectContaining({
        scoreId: 'score-1',
        enrollmentId: 'enrollment-1',
        courseOfferingId: 'course-offering-1',
        studentNumber: '20230001',
        studentName: 'Alice',
        status: 'SUBMITTED',
        hasPendingModificationRequest: true,
        totalScore: 89.2,
      }),
    ])
  })

  it('should read F1 explicit EMPTY and DRAFT statuses', () => {
    const result = normalizeCourseScoresResult(
      {
        items: [
          {
            enrollmentId: 'enrollment-empty',
            studentId: 'student-2',
            studentNumber: '20230002',
            studentName: 'Bob',
            className: null,
            scoreId: null,
            usualScore: null,
            midtermScore: null,
            finalScore: null,
            totalScore: null,
            gradePoint: null,
            gradeLetter: null,
            status: 'EMPTY',
            hasPendingModificationRequest: false,
            enteredAt: null,
            modifiedAt: null,
          },
          {
            enrollmentId: 'enrollment-draft',
            studentId: 'student-3',
            studentNumber: '20230003',
            studentName: 'Carol',
            className: null,
            scoreId: 'score-draft',
            usualScore: 75,
            midtermScore: null,
            finalScore: null,
            totalScore: null,
            gradePoint: null,
            gradeLetter: null,
            status: 'DRAFT',
            hasPendingModificationRequest: false,
            enteredAt: '2026-04-25T09:00:00.000Z',
            modifiedAt: null,
          },
        ],
      },
      'course-offering-2'
    )

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        enrollmentId: 'enrollment-empty',
        status: 'EMPTY',
        scoreId: null,
      })
    )

    expect(result.rows[1]).toEqual(
      expect.objectContaining({
        enrollmentId: 'enrollment-draft',
        status: 'DRAFT',
        scoreId: 'score-draft',
        usualScore: 75,
      })
    )
  })

  it('should default status to EMPTY when backend sends unknown value', () => {
    const result = normalizeCourseScoresResult(
      {
        items: [
          {
            enrollmentId: 'enrollment-x',
            studentId: 'student-x',
            studentNumber: '20230099',
            studentName: 'Unknown',
          },
        ],
      },
      'course-offering-x'
    )

    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        enrollmentId: 'enrollment-x',
        status: 'EMPTY',
      })
    )
  })
})
