import { createDecipheriv, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env['ENCRYPTION_KEY']
  if (!raw) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production')
    }
    return createHash('sha256').update('dev-only-encryption-key-not-for-prod').digest()
  }
  if (raw.length === 64) return Buffer.from(raw, 'hex')
  return Buffer.from(raw, 'base64')
}

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
