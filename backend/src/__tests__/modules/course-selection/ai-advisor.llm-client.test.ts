import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { llmClient } from '../../../modules/course-selection/ai-advisor.llm-client.js'

describe('llmClient diagnostics', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.OPENROUTER_MODEL = 'openrouter/free'
    process.env.OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
    process.env.AI_ENABLED = 'true'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
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
      finishReason: 'length',
      nativeFinishReason: 'length',
      promptTokens: 14,
      completionTokens: 64,
      totalTokens: 78,
      reasoningTokens: 66,
      retriable: true,
    })
  })
})
