import { URL } from 'url'

// Private/reserved IP ranges — block to prevent SSRF
const BLOCKED_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,     // link-local
  /^0\./,
  /^::1$/,           // IPv6 loopback
  /^fc00:/i,         // IPv6 unique local
  /^fe80:/i,         // IPv6 link-local
  /^fd/i,
  /^localhost$/i,
  /^metadata\.google\.internal$/i,
  /^169\.254\.169\.254$/,  // AWS metadata
]

const ALLOWED_SCHEMES = new Set(['https:', 'http:'])

/**
 * Validates a URL supplied by a user for use in outbound requests.
 * Throws a descriptive error if the URL is invalid or targets a private/reserved address.
 */
export function validateExternalUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`Invalid URL: ${raw}`)
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new Error(`URL scheme '${url.protocol}' is not allowed`)
  }

  const hostname = url.hostname.toLowerCase()

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(`URL targets a private or reserved address and cannot be used`)
    }
  }

  // Block numeric IPv4 without dot notation (e.g., decimal-encoded IPs)
  if (/^\d+$/.test(hostname)) {
    throw new Error(`URL targets a private or reserved address and cannot be used`)
  }

  return url
}

/**
 * Returns true if the URL is safe for outbound requests.
 * Use when you need a boolean check rather than throwing.
 */
export function isSafeUrl(raw: string): boolean {
  try {
    validateExternalUrl(raw)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitizes a URL string: strips credentials, fragments, and validates it.
 * Returns the cleaned URL string, or throws if invalid/unsafe.
 */
export function sanitizeUrl(raw: string): string {
  const url = validateExternalUrl(raw)
  url.username = ''
  url.password = ''
  url.hash = ''
  return url.toString()
}
