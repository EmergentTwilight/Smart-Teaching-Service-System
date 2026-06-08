import { describe, expect, it } from 'vitest'
import {
  createEnrollmentBodySchema,
  dropEnrollmentBodySchema,
} from '../../../modules/course-selection/course-selection.schemas.js'

describe('C3 enrollment schemas', () => {
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
})
