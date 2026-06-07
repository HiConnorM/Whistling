import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env['ENCRYPTION_KEY']
  if (!raw) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production')
    }
    // Dev-only deterministic key — never reaches production
    return createHash('sha256').update('dev-only-encryption-key-not-for-prod').digest()
  }
  // Support hex (64 chars) or base64 (44 chars for 32 bytes) formats
  if (raw.length === 64) return Buffer.from(raw, 'hex')
  return Buffer.from(raw, 'base64')
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a single string: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a value produced by `encrypt()`.
 * Returns null if the value is malformed or tampered (do not throw — callers handle gracefully).
 */
export function decrypt(ciphertext: string): string | null {
  try {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return null
    const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string]

    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
  } catch {
    return null
  }
}

/** Returns true if the value looks like an encrypted token produced by encrypt(). */
export function isEncrypted(value: string): boolean {
  return value.split(':').length === 3
}
