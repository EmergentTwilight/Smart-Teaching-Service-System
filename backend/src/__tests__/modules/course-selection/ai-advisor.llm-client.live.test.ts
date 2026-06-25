import { describe, expect, it } from 'vitest'
import { llmClient } from '../../../modules/course-selection/ai-advisor.llm-client.js'

const describeLive = process.env.RUN_LIVE_LLM_TEST === '1' ? describe : describe.skip

describeLive('llmClient OpenRouter live smoke test', () => {
  it('uses the configured Nemotron free model and receives a non-empty response', async () => {
    expect(process.env.OPENROUTER_API_KEY ? 'present' : 'missing').toBe('present')
    expect(process.env.OPENROUTER_MODEL).toBe('nvidia/nemotron-3-ultra-550b-a55b:free')
    expect(process.env.OPENROUTER_API_URL).toBe('https://openrouter.ai/api/v1/chat/completions')

    const attempts = []
    for (let index = 0; index < 3; index += 1) {
      const result = await llmClient.complete(
        'Reply with exactly: OK',
        {
          maxTokens: 80,
          temperature: 0,
          timeoutMs: Math.max(Number(process.env.LLM_TIMEOUT_MS ?? 600000), 600000),
        }
      )

      attempts.push(result)
      if (result.ok && result.content?.trim()) {
        expect(result.content.trim().length).toBeGreaterThan(0)
        return
      }
    }

    expect(
      attempts.some((result) => result.ok && result.content?.trim()),
      attempts.map((result) => result.reason ?? 'empty_content').join(', ')
    ).toBe(true)
  }, 1850000)
})
