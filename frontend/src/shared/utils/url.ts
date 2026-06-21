const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

function getApiOrigin(): string {
  try {
    return new URL(apiBase).origin
  } catch {
    return 'http://localhost:3000'
  }
}

export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  if (url.startsWith('/')) {
    return `${getApiOrigin()}${url}`
  }

  return `${getApiOrigin()}/${url}`
}
