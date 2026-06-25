import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { llmClient } from '../../../modules/course-selection/ai-advisor.llm-client.js'

describe('llmClient diagnostics', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
    process.env.AI_ENABLED = 'true'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it('returns a timeout result when the provider request does not settle', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))

    const resultPromise = llmClient.complete('Reply with exactly: OK', {
      maxTokens: 64,
      temperature: 0,
      timeoutMs: 25,
    })

    await vi.advanceTimersByTimeAsync(25)
    const result = await resultPromise

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('timeout')
    expect(result.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free')
    expect(result.diagnostics).toMatchObject({
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      endpointHost: 'openrouter.ai',
      retriable: true,
    })
  })

  it('returns a timeout result when the provider response body does not settle', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => new Promise(() => undefined),
      })
    )

    const resultPromise = llmClient.complete('Reply with exactly: OK', {
      maxTokens: 64,
      temperature: 0,
      timeoutMs: 25,
    })

    await vi.advanceTimersByTimeAsync(25)
    const result = await resultPromise

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('timeout')
    expect(result.model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free')
    expect(result.diagnostics).toMatchObject({
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      endpointHost: 'openrouter.ai',
      retriable: true,
    })
  })

  it('captures finish reason and reasoning token diagnostics for empty provider content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: 'liquid/lfm-2.5-1.2b-thinking-20260120:free',
            choices: [
              {
                finish_reason: 'length',
                native_finish_reason: 'length',
                message: {
                  role: 'assistant',
                  content: null,
                  reasoning: 'reasoning tokens consumed the completion budget',
                },
              },
            ],
            usage: {
              prompt_tokens: 14,
              completion_tokens: 64,
              total_tokens: 78,
              completion_tokens_details: {
                reasoning_tokens: 66,
              },
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const result = await llmClient.complete('Reply with exactly: OK', {
      maxTokens: 64,
      temperature: 0,
      timeoutMs: 20000,
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty_content')
    expect(result.diagnostics).toMatchObject({
      provider: 'openrouter',
      model: 'liquid/lfm-2.5-1.2b-thinking-20260120:free',
      endpointHost: 'openrouter.ai',
      statusCode: 200,
      finishReason: 'length',
      nativeFinishReason: 'length',
      promptTokens: 14,
      completionTokens: 64,
      totalTokens: 78,
      reasoningTokens: 66,
      retriable: true,
    })
    expect(result.diagnostics?.providerRawErrorSummary).toContain('"choicesCount":1')
    expect(result.diagnostics?.providerRawErrorSummary).toContain('"finishReason":"length"')
    expect(result.diagnostics?.providerRawErrorSummary).toContain('"contentType":"null"')
    expect(result.diagnostics?.providerRawErrorSummary).not.toContain('Reply with exactly')
  })

  it('captures provider errors nested inside an empty choice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
            choices: [
              {
                error: {
                  code: 529,
                  message: 'Provider overloaded while generating completion',
                },
                message: {
                  role: 'assistant',
                  content: null,
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      )
    )

    const result = await llmClient.complete('Reply with exactly: OK', {
      maxTokens: 64,
      temperature: 0,
      timeoutMs: 20000,
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty_content')
    expect(result.diagnostics).toMatchObject({
      provider: 'openrouter',
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      endpointHost: 'openrouter.ai',
      statusCode: 200,
      providerCode: '529',
      providerMessage: 'Provider overloaded while generating completion',
      retriable: true,
    })
    expect(result.diagnostics?.providerRawErrorSummary).toContain('"code":529')
    expect(result.diagnostics?.providerRawErrorSummary).toContain('Provider overloaded')
    expect(result.diagnostics?.providerRawErrorSummary).not.toContain('Reply with exactly')
  })
})
