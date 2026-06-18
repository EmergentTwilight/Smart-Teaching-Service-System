import { describe, expect, it } from 'vitest'
import {
  buildDraftPayload,
  buildSubmitPayload,
  hasAnyScore,
  mergeRowValues,
  needsDraftSync,
  pickRowsForAction,
} from './submit-utils'
import type { DraftScorePatch, TeacherScoreRow } from './types'

const createRow = (overrides?: Partial<TeacherScoreRow>): TeacherScoreRow => ({
  id: 'row-1',
  scoreId: 'score-1',
  enrollmentId: 'enrollment-1',
  courseOfferingId: 'course-offering-1',
  studentId: 'student-1',
  studentNumber: '20230001',
  studentName: 'Alice',
  className: 'Class 1',
  usualScore: 80,
  midtermScore: 85,
  finalScore: 90,
  totalScore: 86.5,
  gradePoint: 3.7,
  gradeLetter: 'A-',
  status: 'DRAFT',
  hasPendingModificationRequest: false,
  enteredAt: '2026-04-25T10:00:00.000Z',
  modifiedAt: '2026-04-25T10:30:00.000Z',
  ...overrides,
})

describe('submit-utils', () => {
  it('should pick selected rows first', () => {
    const rows = [
      createRow(),
      createRow({
        id: 'row-2',
        scoreId: 'score-2',
        enrollmentId: 'enrollment-2',
        studentId: 'student-2',
        studentNumber: '20230002',
      }),
    ]

    const result = pickRowsForAction(rows, {}, ['enrollment-2'])

    expect(result).toEqual([expect.objectContaining({ enrollmentId: 'enrollment-2' })])
  })

  it('should fall back to dirty rows when nothing is selected', () => {
    const rows = [
      createRow(),
      createRow({
        id: 'row-2',
        scoreId: 'score-2',
        enrollmentId: 'enrollment-2',
        studentId: 'student-2',
        studentNumber: '20230002',
      }),
    ]
    const draftValues: Record<string, DraftScorePatch> = {
      'enrollment-1': { usualScore: 88 },
    }

    const result = pickRowsForAction(rows, draftValues, [])

    expect(result).toEqual([expect.objectContaining({ enrollmentId: 'enrollment-1' })])
  })

  it('should merge local draft values into the editable scores', () => {
    const row = createRow()

    expect(
      mergeRowValues(row, {
        usualScore: 92,
        finalScore: null,
      })
    ).toEqual({
      usualScore: 92,
      midtermScore: 85,
      finalScore: 90,
    })
  })

  it('should detect rows that need draft sync before submit', () => {
    expect(needsDraftSync([createRow({ scoreId: null })], {})).toBe(true)
    expect(
      needsDraftSync([createRow()], {
        'enrollment-1': { usualScore: 91 },
      })
    ).toBe(true)
    expect(needsDraftSync([createRow()], {})).toBe(false)
  })

  it('should build scoreIds submit payload and skip rows without scoreId', () => {
    const payload = buildSubmitPayload([
      createRow({ scoreId: 'score-1' }),
      createRow({
        id: 'row-2',
        scoreId: null,
        enrollmentId: 'enrollment-2',
        studentId: 'student-2',
        studentNumber: '20230002',
      }),
      createRow({
        id: 'row-3',
        scoreId: 'score-3',
        enrollmentId: 'enrollment-3',
        studentId: 'student-3',
        studentNumber: '20230003',
      }),
    ])

    expect(payload).toEqual({
      scoreIds: ['score-1', 'score-3'],
    })
  })

  it('should keep nullable scores in draft payload and detect empty rows', () => {
    const row = createRow({
      scoreId: null,
      usualScore: null,
      midtermScore: null,
      finalScore: null,
    })
    const payload = buildDraftPayload([row], {
      'enrollment-1': {
        usualScore: 75,
        midtermScore: null,
      },
    })

    expect(payload).toEqual([
      {
        enrollmentId: 'enrollment-1',
        scoreId: null,
        usualScore: 75,
        midtermScore: null,
        finalScore: null,
      },
    ])
    expect(hasAnyScore(payload[0])).toBe(true)
    expect(
      hasAnyScore({
        usualScore: null,
        midtermScore: null,
        finalScore: null,
      })
    ).toBe(false)
  })
})
