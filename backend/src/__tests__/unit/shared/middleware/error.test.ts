import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { errorHandler } from '../../../../shared/middleware/error.js'

describe('errorHandler middleware', () => {
  it('should return a 400 JSON response for Zod validation errors', () => {
    const req = { requestId: 'test-request-id' } as Request
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const res = { status } as unknown as Response
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const parseResult = z
      .object({
        requiredRoomType: z.enum(['LECTURE', 'LAB', 'MULTIMEDIA']),
      })
      .safeParse({ requiredRoomType: 'lecture' })

    expect(parseResult.success).toBe(false)
    if (!parseResult.success) {
      errorHandler(parseResult.error, req, res, next)
    }

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '验证失败',
        request_id: 'test-request-id',
      })
    )
    expect(json.mock.calls[0][0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['requiredRoomType'],
        }),
      ])
    )
    expect(next).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
