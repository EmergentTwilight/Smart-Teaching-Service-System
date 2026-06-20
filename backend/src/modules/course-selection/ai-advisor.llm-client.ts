import type { LlmMessage } from './ai-advisor.prompts.js'

export interface LlmCompletionOptions {
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
}

export interface LlmCompletionResult {
  ok: boolean
  content?: string
  model?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  reason?: string
  raw?: unknown
}

const defaultModel = () =>
  process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? 'google/gemini-2.0-flash-exp:free'

const apiEndpoint = () =>
  process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions'

const resolveApiKey = () =>
  process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY

const isProviderEnabled = () => {
  const enabled = process.env.AI_ENABLED
  if (!enabled) {
    return true
  }

  return enabled !== '0' && enabled.toLowerCase() !== 'false'
}

const normalizeMessages = (messages: string | LlmMessage | LlmMessage[]): LlmMessage[] => {
  if (Array.isArray(messages)) {
    return messages
  }

  if (typeof messages === 'string') {
    return [{ role: 'user', content: messages }]
  }

  return [messages]
}

const extractTextContent = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const pickContent = (choice: unknown): string | null => {
  if (!choice || typeof choice !== 'object') {
    return null
  }

  const message = (choice as { message?: { content?: string } }).message
  if (!message || typeof message.content !== 'string') {
    return null
  }

  return message.content
}

export const llmClient = {
  async complete(
    messages: string | LlmMessage | LlmMessage[],
    options: LlmCompletionOptions = {}
  ): Promise<LlmCompletionResult> {
    if (!isProviderEnabled()) {
      return {
        ok: false,
        reason: 'provider_disabled',
      }
    }

    const key = resolveApiKey()
    if (!key) {
      return {
        ok: false,
        reason: 'missing_api_key',
      }
    }

    const timeoutMs = options.timeoutMs ?? Number(process.env.LLM_TIMEOUT_MS ?? 9000)
    const maxTokens = options.maxTokens ?? 800
    const temperature = options.temperature ?? 0.2
    const model = defaultModel()
    const endpoint = apiEndpoint()

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': process.env.APP_PUBLIC_URL ?? 'http://localhost',
          'X-Title': process.env.APP_NAME ?? 'STSS',
        },
        body: JSON.stringify({
          model,
          messages: normalizeMessages(messages),
          max_tokens: maxTokens,
          temperature,
          top_p: 1,
          stream: false,
        }),
      })
      clearTimeout(timer)

      const raw = await extractTextContent(response)
      if (!response.ok) {
        return {
          ok: false,
          reason: `provider_error:${response.status}`,
          raw,
        }
      }

      if (typeof raw !== 'object' || raw === null) {
        return {
          ok: false,
          reason: 'invalid_provider_response',
          raw,
        }
      }

      const root = raw as {
        model?: string
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        }
        choices?: unknown[]
      }

      const choice = root.choices?.[0]
      const content = choice ? pickContent(choice) : null
      if (!content) {
        return {
          ok: false,
          reason: 'empty_content',
          model: root.model,
          raw,
        }
      }

      return {
        ok: true,
        content,
        model: root.model,
        usage: {
          promptTokens: root.usage?.prompt_tokens,
          completionTokens: root.usage?.completion_tokens,
          totalTokens: root.usage?.total_tokens,
        },
      }
    } catch (error) {
      clearTimeout(timer)
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          ok: false,
          reason: 'timeout',
        }
      }

      return {
        ok: false,
        reason: 'network_error',
        raw: error,
      }
    }
  },
}
