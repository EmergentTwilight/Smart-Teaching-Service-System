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
  diagnostics?: LlmFailureDiagnostics
  raw?: unknown
}

export interface LlmFailureDiagnostics {
  provider: 'openrouter'
  model?: string | null
  endpointHost?: string | null
  statusCode?: number
  providerCode?: string
  providerMessage?: string
  finishReason?: string
  nativeFinishReason?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  retryAfter?: string | null
  durationMs: number
  retriable: boolean
}

const defaultModel = () =>
  process.env.OPENROUTER_MODEL ?? process.env.AI_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b:free'

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

const resolveTimeoutMs = () => Math.max(Number(process.env.LLM_TIMEOUT_MS ?? 20000), 20000)

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

const pickTextContent = (content: unknown): string | null => {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return null
  }

  const text = content
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }

      if (!part || typeof part !== 'object') {
        return ''
      }

      const value = (part as { text?: unknown; content?: unknown }).text ?? (part as { content?: unknown }).content
      return typeof value === 'string' ? value : ''
    })
    .join('')

  return text.length > 0 ? text : null
}

const pickContent = (choice: unknown): string | null => {
  if (!choice || typeof choice !== 'object') {
    return null
  }

  const message = (choice as { message?: { content?: unknown } }).message
  if (!message) {
    return null
  }

  return pickTextContent(message.content)
}

const endpointHost = (endpoint: string): string | null => {
  try {
    return new URL(endpoint).host
  } catch {
    return null
  }
}

const pickProviderError = (raw: unknown): { code?: string; message?: string } => {
  if (!raw || typeof raw !== 'object') {
    return typeof raw === 'string' ? { message: raw.slice(0, 500) } : {}
  }

  const root = raw as {
    error?: unknown
    code?: unknown
    message?: unknown
  }
  const error = root.error

  if (error && typeof error === 'object') {
    const nested = error as { code?: unknown; message?: unknown }
    return {
      code: typeof nested.code === 'string' ? nested.code : undefined,
      message: typeof nested.message === 'string' ? nested.message.slice(0, 500) : undefined,
    }
  }

  return {
    code: typeof root.code === 'string' ? root.code : undefined,
    message: typeof root.message === 'string' ? root.message.slice(0, 500) : undefined,
  }
}

const pickProviderCompletionDiagnostics = (raw: unknown): Partial<LlmFailureDiagnostics> => {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const root = raw as {
    choices?: unknown[]
    usage?: {
      prompt_tokens?: unknown
      completion_tokens?: unknown
      total_tokens?: unknown
      completion_tokens_details?: {
        reasoning_tokens?: unknown
      }
    }
  }
  const choice = root.choices?.[0] as
    | {
        finish_reason?: unknown
        native_finish_reason?: unknown
      }
    | undefined
  const usage = root.usage
  const completionDetails = usage?.completion_tokens_details

  return {
    finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined,
    nativeFinishReason:
      typeof choice?.native_finish_reason === 'string' ? choice.native_finish_reason : undefined,
    promptTokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
    completionTokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : undefined,
    totalTokens: typeof usage?.total_tokens === 'number' ? usage.total_tokens : undefined,
    reasoningTokens:
      typeof completionDetails?.reasoning_tokens === 'number'
        ? completionDetails.reasoning_tokens
        : undefined,
  }
}

const isRetriableFailure = (reason: string, statusCode?: number): boolean => {
  if (reason === 'timeout' || reason === 'network_error') {
    return true
  }

  if (statusCode !== undefined) {
    return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500
  }

  return reason === 'invalid_provider_response' || reason === 'empty_content'
}

const buildDiagnostics = (params: {
  endpoint: string
  model?: string | null
  reason: string
  startedAt: number
  statusCode?: number
  raw?: unknown
  retryAfter?: string | null
}): LlmFailureDiagnostics => {
  const providerError = pickProviderError(params.raw)
  const providerCompletion = pickProviderCompletionDiagnostics(params.raw)
  return {
    provider: 'openrouter',
    model: params.model ?? null,
    endpointHost: endpointHost(params.endpoint),
    statusCode: params.statusCode,
    providerCode: providerError.code,
    providerMessage: providerError.message,
    ...providerCompletion,
    retryAfter: params.retryAfter ?? null,
    durationMs: Date.now() - params.startedAt,
    retriable: isRetriableFailure(params.reason, params.statusCode),
  }
}

const buildTimeoutResult = (params: {
  endpoint: string
  model: string
  startedAt: number
}): LlmCompletionResult => {
  const reason = 'timeout'
  return {
    ok: false,
    reason,
    model: params.model,
    diagnostics: buildDiagnostics({
      endpoint: params.endpoint,
      model: params.model,
      reason,
      startedAt: params.startedAt,
    }),
  }
}

export const llmClient = {
  async complete(
    messages: string | LlmMessage | LlmMessage[],
    options: LlmCompletionOptions = {}
  ): Promise<LlmCompletionResult> {
    if (!isProviderEnabled()) {
      const model = defaultModel()
      const endpoint = apiEndpoint()
      const startedAt = Date.now()
      return {
        ok: false,
        reason: 'provider_disabled',
        model,
        diagnostics: buildDiagnostics({ endpoint, model, reason: 'provider_disabled', startedAt }),
      }
    }

    const key = resolveApiKey()
    if (!key) {
      const model = defaultModel()
      const endpoint = apiEndpoint()
      const startedAt = Date.now()
      return {
        ok: false,
        reason: 'missing_api_key',
        model,
        diagnostics: buildDiagnostics({ endpoint, model, reason: 'missing_api_key', startedAt }),
      }
    }

    const timeoutMs = options.timeoutMs ?? resolveTimeoutMs()
    const maxTokens = options.maxTokens ?? 800
    const temperature = options.temperature ?? 0.2
    const model = defaultModel()
    const endpoint = apiEndpoint()
    const startedAt = Date.now()

    const controller = new AbortController()
    let didTimeout = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const request = (async (): Promise<LlmCompletionResult> => {
      try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': process.env.APP_PUBLIC_URL ?? 'http://localhost',
          'X-OpenRouter-Title': process.env.APP_NAME ?? 'STSS',
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

      const raw = await extractTextContent(response)
      if (!response.ok) {
        const reason = `provider_error:${response.status}`
        return {
          ok: false,
          reason,
          model,
          diagnostics: buildDiagnostics({
            endpoint,
            model,
            reason,
            startedAt,
            statusCode: response.status,
            raw,
            retryAfter: response.headers.get('retry-after'),
          }),
          raw,
        }
      }

      if (typeof raw !== 'object' || raw === null) {
        const reason = 'invalid_provider_response'
        return {
          ok: false,
          reason,
          model,
          diagnostics: buildDiagnostics({ endpoint, model, reason, startedAt, raw }),
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
        const reason = 'empty_content'
        return {
          ok: false,
          reason,
          model: root.model,
          diagnostics: buildDiagnostics({ endpoint, model: root.model ?? model, reason, startedAt, raw }),
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
      if (didTimeout || (error instanceof DOMException && error.name === 'AbortError')) {
        return buildTimeoutResult({ endpoint, model, startedAt })
      }

      const reason = 'network_error'
      return {
        ok: false,
        reason,
        model,
        diagnostics: buildDiagnostics({ endpoint, model, reason, startedAt, raw: error }),
        raw: error,
      }
    }
    })()

    const deadline = new Promise<LlmCompletionResult>((resolve) => {
      timer = setTimeout(() => {
        didTimeout = true
        controller.abort()
        resolve(buildTimeoutResult({ endpoint, model, startedAt }))
      }, timeoutMs)
    })

    try {
      return await Promise.race([request, deadline])
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  },
}
