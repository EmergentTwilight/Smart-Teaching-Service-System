import { describe, expect, it } from 'vitest'
import {
  admissionLeaseBodySchema,
  aiExplainBodySchema,
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
})
