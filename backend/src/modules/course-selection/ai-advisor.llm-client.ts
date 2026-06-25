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
  providerRawErrorSummary?: string
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

const resolveTimeoutMs = () => Math.max(Number(process.env.LLM_TIMEOUT_MS ?? 600000), 600000)

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

const textValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.slice(0, 500)
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return undefined
}

const contentType = (value: unknown): string => {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  return typeof value
}

const pickProviderError = (raw: unknown): { code?: string; message?: string } => {
  if (!raw || typeof raw !== 'object') {
    return typeof raw === 'string' ? { message: raw.slice(0, 500) } : {}
  }

  const root = raw as {
    error?: unknown
    code?: unknown
    message?: unknown
    choices?: unknown[]
  }
  const error = root.error

  if (error && typeof error === 'object') {
    const nested = error as { code?: unknown; message?: unknown }
    return {
      code: textValue(nested.code),
      message: textValue(nested.message),
    }
  }

  const choice = root.choices?.[0] as
    | {
        error?: unknown
        message?: {
          refusal?: unknown
        }
      }
    | undefined
  if (choice?.error && typeof choice.error === 'object') {
    const nested = choice.error as { code?: unknown; message?: unknown }
    return {
      code: textValue(nested.code),
      message: textValue(nested.message),
    }
  }

  return {
    code: textValue(root.code),
    message: textValue(root.message) ?? textValue(choice?.message?.refusal),
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

const buildProviderRawErrorSummary = (raw: unknown): string | undefined => {
  if (raw === null || raw === undefined) {
    return undefined
  }

  if (typeof raw === 'string') {
    return raw.slice(0, 1000)
  }

  if (raw instanceof Error) {
    return JSON.stringify({
      name: raw.name,
      message: raw.message.slice(0, 500),
    })
  }

  if (typeof raw !== 'object') {
    return String(raw).slice(0, 1000)
  }

  const root = raw as {
    id?: unknown
    model?: unknown
    object?: unknown
    created?: unknown
    error?: unknown
    code?: unknown
    message?: unknown
    choices?: unknown[]
    usage?: unknown
  }
  const choice = root.choices?.[0] as
    | {
        finish_reason?: unknown
        native_finish_reason?: unknown
        error?: unknown
        message?: {
          role?: unknown
          content?: unknown
          refusal?: unknown
          reasoning?: unknown
        }
      }
    | undefined
  const message = choice?.message
  const summary = {
    id: textValue(root.id),
    object: textValue(root.object),
    model: textValue(root.model),
    created: typeof root.created === 'number' ? root.created : undefined,
    error: root.error,
    code: textValue(root.code),
    message: textValue(root.message),
    choicesCount: Array.isArray(root.choices) ? root.choices.length : undefined,
    firstChoice: choice
      ? {
          finishReason: textValue(choice.finish_reason),
          nativeFinishReason: textValue(choice.native_finish_reason),
          error: choice.error,
          messageRole: textValue(message?.role),
          contentType: contentType(message?.content),
          contentLength: typeof message?.content === 'string' ? message.content.length : undefined,
          refusal: textValue(message?.refusal),
          hasReasoning: Boolean(message?.reasoning),
        }
      : undefined,
    usage: root.usage,
  }

  try {
    return JSON.stringify(summary).slice(0, 1200)
  } catch {
    return '[unserializable provider response]'
  }
}

const isRetriableFailure = (reason: string, statusCode?: number): boolean => {
  if (reason === 'timeout' || reason === 'network_error') {
    return true
  }

  if (reason === 'invalid_provider_response' || reason === 'empty_content') {
    return true
  }

  if (statusCode !== undefined) {
    return statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429 || statusCode >= 500
  }

  return false
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
    providerRawErrorSummary: params.reason === 'success' ? undefined : buildProviderRawErrorSummary(params.raw),
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
          diagnostics: buildDiagnostics({
            endpoint,
            model: root.model ?? model,
            reason,
            startedAt,
            statusCode: response.status,
            raw,
            retryAfter: response.headers.get('retry-after'),
          }),
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
        diagnostics: buildDiagnostics({
          endpoint,
          model: root.model ?? model,
          reason: 'success',
          startedAt,
          statusCode: response.status,
          raw,
        }),
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
