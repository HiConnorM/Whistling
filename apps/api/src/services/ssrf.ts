import { URL } from 'url'
import dns from 'dns/promises'

// Private/reserved IP ranges — block to prevent SSRF
const BLOCKED_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,     // link-local / cloud metadata
  /^100\.64\./,      // CGNAT
  /^198\.51\.100\./,  // TEST-NET-2
  /^203\.0\.113\./,   // TEST-NET-3
  /^0\./,
  /^::1$/,           // IPv6 loopback
  /^::$/,            // IPv6 unspecified
  /^fc00:/i,         // IPv6 unique local
  /^fe80:/i,         // IPv6 link-local
  /^fd/i,
  /^::ffff:127\./i,  // IPv6-mapped IPv4 loopback
  /^::ffff:10\./i,   // IPv6-mapped private
  /^::ffff:192\.168\./i,
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./i,
  /^::ffff:169\.254\./i,
  /^localhost$/i,
  /^metadata\.google\.internal$/i,
  /^169\.254\.169\.254$/,  // AWS/Azure metadata endpoint
]

const ALLOWED_SCHEMES = new Set(['https:', 'http:'])

// Hex-encoded IP pattern (e.g. 0x7f000001 for 127.0.0.1)
const HEX_IP = /^0x[0-9a-f]+$/i
// Octal-encoded octets (e.g. 0177.0.0.1 for 127.0.0.1)
const OCTAL_OCTET = /^0[0-7]+$/

function isPrivateIpString(ip: string): boolean {
  const normalized = ip.toLowerCase()
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) return true
  }
  return false
}

function rejectSuspiciousEncoding(hostname: string): boolean {
  // Block hex-encoded IPs
  if (HEX_IP.test(hostname)) return true
  // Block octal-encoded octets (e.g. 0177.0.0.1)
  const parts = hostname.split('.')
  if (parts.some((p) => OCTAL_OCTET.test(p))) return true
  return false
}

/**
 * Validates a URL supplied by a user for use in outbound requests.
 * Checks scheme, hostname patterns, and hex/octal encoding tricks.
 * Throws a descriptive error if the URL is invalid or suspicious.
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

  // Block hex or octal encoded IPs
  if (rejectSuspiciousEncoding(hostname)) {
    throw new Error('URL uses a disallowed IP encoding')
  }

  // Block known private/reserved patterns
  if (isPrivateIpString(hostname)) {
    throw new Error('URL targets a private or reserved address')
  }

  // Block numeric IPv4 without dot notation (decimal-encoded single integer)
  if (/^\d+$/.test(hostname)) {
    throw new Error('URL targets a private or reserved address')
  }

  return url
}

/**
 * Async variant that also resolves DNS and checks all A/AAAA records.
 * Use this for user-supplied URLs that will be fetched server-side.
 */
export async function validateExternalUrlResolved(raw: string): Promise<URL> {
  const url = validateExternalUrl(raw)
  const hostname = url.hostname

  let addresses: string[] = []
  try {
    const results = await dns.lookup(hostname, { all: true, family: 0 })
    addresses = results.map((r) => r.address)
  } catch {
    throw new Error(`Unable to resolve hostname: ${hostname}`)
  }

  for (const addr of addresses) {
    if (isPrivateIpString(addr)) {
      throw new Error(`URL resolves to a private or reserved address: ${addr}`)
    }
  }

  return url
}

/**
 * Returns true if the URL passes the basic (non-DNS) safety check.
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

// ── Per-source-type platform domain allowlists ───────────────────────────────
//
// Apify sources should only scrape their intended platforms.
// This prevents a user from supplying e.g. a Google Maps source URL that
// actually points to an attacker-controlled site.

const SOURCE_ALLOWED_HOSTS: Record<string, string[]> = {
  google: ['google.com', 'maps.google.com', 'www.google.com'],
  yelp: ['yelp.com', 'www.yelp.com'],
  tripadvisor: ['tripadvisor.com', 'www.tripadvisor.com', 'tripadvisor.co.uk'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
}

/**
 * Returns an error message string if the URL's host doesn't match the
 * expected platform for the given source type, or null if it's fine.
 * Only applies to source types that have a defined allowlist.
 */
export function assertHostForSourceType(raw: string, sourceType: string): string | null {
  const allowed = SOURCE_ALLOWED_HOSTS[sourceType.toLowerCase()]
  if (!allowed) return null // No allowlist for this type (e.g. manual, csv)

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return `Invalid URL for ${sourceType} source`
  }

  const hostname = url.hostname.toLowerCase()
  // Check exact match or subdomain match
  const isAllowed = allowed.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  )

  if (!isAllowed) {
    return `${sourceType} sources must use a ${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} URL (e.g. ${allowed[0]}). Got: ${hostname}`
  }

  return null
}
