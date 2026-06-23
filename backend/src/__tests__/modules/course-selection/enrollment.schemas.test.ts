import { describe, expect, it } from 'vitest'
import {
  admissionLeaseBodySchema,
  aiSaveRecordBodySchema,
  aiExplainBodySchema,
  aiSavedRecordQuerySchema,
  courseOfferingParamsSchema,
  createEnrollmentBodySchema,
  curriculumConfirmationBodySchema,
  dropEnrollmentBodySchema,
  dropEnrollmentParamsSchema,
} from '../../../modules/course-selection/course-selection.schemas.js'

describe('course-selection request schemas', () => {
  it('normalizes documented snake_case create enrollment fields', () => {
    const result = createEnrollmentBodySchema.parse({
      course_offering_id: '8bb51f34-82a7-4e30-b89a-6326909d0001',
      client_request_id: 'select-20260519-0001',
    })

    expect(result).toEqual({
      courseOfferingId: '8bb51f34-82a7-4e30-b89a-6326909d0001',
      clientRequestId: 'select-20260519-0001',
    })
  })

  it('accepts opaque manual QA course offering ids for create enrollment', () => {
    const result = createEnrollmentBodySchema.parse({
      course_offering_id: 'cmanual-offering-009',
      client_request_id: 'select-20260519-0001',
    })

    expect(result).toEqual({
      courseOfferingId: 'cmanual-offering-009',
      clientRequestId: 'select-20260519-0001',
    })
  })

  it('trims opaque course offering ids before service validation', () => {
    const result = createEnrollmentBodySchema.parse({
      course_offering_id: '  cmanual-offering-009  ',
    })

    expect(result.courseOfferingId).toBe('cmanual-offering-009')
  })

  it('does not accept blank course offering ids for create enrollment', () => {
    expect(() =>
      createEnrollmentBodySchema.parse({
        course_offering_id: '   ',
      })
    ).toThrow()
  })

  it('does not accept camelCase create enrollment fields from external callers', () => {
    expect(() =>
      createEnrollmentBodySchema.parse({
        courseOfferingId: '8bb51f34-82a7-4e30-b89a-6326909d0001',
        clientRequestId: 'select-20260519-0001',
      })
    ).toThrow()
  })

  it('does not accept student identity in create enrollment body', () => {
    expect(() =>
      createEnrollmentBodySchema.parse({
        student_id: '8bb51f34-82a7-4e30-b89a-6326909d9999',
        course_offering_id: '8bb51f34-82a7-4e30-b89a-6326909d0001',
      })
    ).toThrow()
  })

  it('does not accept create enrollment reason from external callers', () => {
    expect(() =>
      createEnrollmentBodySchema.parse({
        course_offering_id: '8bb51f34-82a7-4e30-b89a-6326909d0001',
        reason: '课表调整',
      })
    ).toThrow()
  })

  it('accepts an empty drop body', () => {
    const result = dropEnrollmentBodySchema.parse({})

    expect(result).toEqual({
      reason: undefined,
      clientRequestId: undefined,
    })
  })

  it('normalizes documented snake_case drop idempotency field', () => {
    const result = dropEnrollmentBodySchema.parse({
      reason: '课表调整',
      client_request_id: 'drop-20260519-0001',
    })

    expect(result).toEqual({
      reason: '课表调整',
      clientRequestId: 'drop-20260519-0001',
    })
  })

  it('does not accept camelCase drop idempotency field from external callers', () => {
    expect(() =>
      dropEnrollmentBodySchema.parse({
        clientRequestId: 'drop-20260519-0001',
      })
    ).toThrow()
  })

  it('does not accept student identity in drop body', () => {
    expect(() =>
      dropEnrollmentBodySchema.parse({
        student_id: '8bb51f34-82a7-4e30-b89a-6326909d9999',
        client_request_id: 'drop-20260519-0001',
      })
    ).toThrow()
  })

  it('accepts UUID drop enrollment route params', () => {
    const result = dropEnrollmentParamsSchema.parse({
      id: '10000000-0000-4000-8000-000000000031',
    })

    expect(result).toEqual({
      id: '10000000-0000-4000-8000-000000000031',
    })
  })

  it('accepts opaque manual QA drop enrollment route params', () => {
    const result = dropEnrollmentParamsSchema.parse({
      id: 'cmanual-enrollment-001',
    })

    expect(result).toEqual({
      id: 'cmanual-enrollment-001',
    })
  })

  it('does not accept blank route params', () => {
    expect(() =>
      dropEnrollmentParamsSchema.parse({
        id: '   ',
      })
    ).toThrow()
  })

  it('accepts opaque manual QA ids for course detail params', () => {
    const result = courseOfferingParamsSchema.parse({
      id: 'cmanual-offering-009',
    })

    expect(result).toEqual({
      id: 'cmanual-offering-009',
    })
  })

  it('accepts opaque manual QA curriculum confirmation ids', () => {
    const result = curriculumConfirmationBodySchema.parse({
      curriculum_id: 'cmanual-curriculum-2026',
    })

    expect(result).toEqual({
      curriculumId: 'cmanual-curriculum-2026',
    })
  })

  it('accepts opaque semester ids while keeping admission lease id as UUID', () => {
    const result = admissionLeaseBodySchema.parse({
      semester_id: 'cmanual-semester-2026-spring',
      lease_id: '8bb51f34-82a7-4e30-b89a-6326909d0001',
    })

    expect(result).toEqual({
      semesterId: 'cmanual-semester-2026-spring',
      leaseId: '8bb51f34-82a7-4e30-b89a-6326909d0001',
    })
  })

  it('still rejects non-UUID admission lease ids', () => {
    expect(() =>
      admissionLeaseBodySchema.parse({
        semester_id: 'cmanual-semester-2026-spring',
        lease_id: 'not-a-lease-uuid',
      })
    ).toThrow()
  })

  it('accepts opaque manual QA course offering ids for AI explain', () => {
    const result = aiExplainBodySchema.parse({
      course_offering_id: 'cmanual-offering-009',
      question: '为什么推荐这门课？',
    })

    expect(result).toEqual({
      offeringId: 'cmanual-offering-009',
      question: '为什么推荐这门课？',
    })
  })

  it('normalizes AI saved recommendation payloads without student identity', () => {
    const result = aiSaveRecordBodySchema.parse({
      record_type: 'recommendation',
      title: '稳妥推荐',
      question: '帮我推荐低风险课程',
      semester_id: 'cmanual-semester-2026-spring',
      request_payload: { question: '帮我推荐低风险课程' },
      result_payload: { recommendations: [], disclaimer: '仅供参考' },
    })

    expect(result).toEqual({
      recordType: 'recommendation',
      title: '稳妥推荐',
      question: '帮我推荐低风险课程',
      semesterId: 'cmanual-semester-2026-spring',
      courseOfferingId: undefined,
      requestPayload: { question: '帮我推荐低风险课程' },
      resultPayload: { recommendations: [], disclaimer: '仅供参考' },
    })
  })

  it('truncates long AI saved record titles before service validation', () => {
    const longTitle = '推荐摘要'.repeat(40)
    const result = aiSaveRecordBodySchema.parse({
      record_type: 'recommendation',
      title: longTitle,
      result_payload: { recommendations: [] },
    })

    expect(result.title).toHaveLength(120)
  })

  it('requires course offering id when saving AI explanations', () => {
    expect(() =>
      aiSaveRecordBodySchema.parse({
        record_type: 'explanation',
        result_payload: { explanation: '这门课当前可选' },
      })
    ).toThrow()
  })

  it('does not accept student identity in AI saved record body', () => {
    expect(() =>
      aiSaveRecordBodySchema.parse({
        record_type: 'recommendation',
        student_id: 'student-other',
        result_payload: { recommendations: [] },
      })
    ).toThrow()
  })

  it('normalizes AI saved record list query filters', () => {
    const result = aiSavedRecordQuerySchema.parse({
      page: '2',
      page_size: '10',
      record_type: 'explanation',
      semester_id: 'cmanual-semester-2026-spring',
    })

    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      recordType: 'explanation',
      semesterId: 'cmanual-semester-2026-spring',
    })
  })
})
