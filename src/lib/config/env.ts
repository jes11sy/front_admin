const FALLBACK_API_BASE_URL = 'https://api.lead-schem.ru/api/v1'

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL
  if (!configuredUrl) {
    return FALLBACK_API_BASE_URL
  }

  try {
    return normalizeApiBaseUrl(new URL(configuredUrl).toString())
  } catch {
    return FALLBACK_API_BASE_URL
  }
}

export const API_BASE_URL = getApiBaseUrl()
