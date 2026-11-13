// L'identité du client Android TV Remote : une paire de clés RSA 2048 et un certificat X.509 auto-signé, écrits en DER à la main (pas de bibliothèque, node:crypto signe).
// La TV retient ce certificat à l'appairage ; la clé privée ne sort jamais de l'API (voir tvStore.ts).
import { createSign, generateKeyPairSync, randomBytes } from 'node:crypto'

export interface TvIdentity {
  /** Certificat PEM (public). */
  cert: string
  /** Clé privée PEM : un secret. */
  key: string
}

const length = (size: number): Buffer => {
  if (size < 0x80) return Buffer.from([size])
  const bytes: number[] = []
  for (let rest = size; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256)
  return Buffer.from([0x80 | bytes.length, ...bytes])
}
const der = (tag: number, ...parts: Buffer[]): Buffer => {
  const body = Buffer.concat(parts)
  return Buffer.concat([Buffer.from([tag]), length(body.length), body])
}
const sequence = (...parts: Buffer[]): Buffer => der(0x30, ...parts)
/** sha256WithRSAEncryption (1.2.840.113549.1.1.11) et NULL. */
const SIGNATURE_ALGORITHM = sequence(der(0x06, Buffer.from('2a864886f70d01010b', 'hex')), Buffer.from([0x05, 0x00]))
/** commonName (2.5.4.3) = House. */
const NAME = sequence(der(0x31, sequence(der(0x06, Buffer.from('550403', 'hex')), der(0x0c, Buffer.from('House')))))
const utcTime = (date: Date): Buffer => der(0x17, Buffer.from(`${date.toISOString().slice(2, 19).replace(/[-:T]/g, '')}Z`))

const pem = (label: string, data: Buffer): string => `-----BEGIN ${label}-----\n${(data.toString('base64').match(/.{1,64}/g) as string[]).join('\n')}\n-----END ${label}-----\n`

/** Une identité neuve, valable dix ans (la TV ne regarde pas les dates). */
export const generateIdentity = (now: Date = new Date()): TvIdentity => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const serial = randomBytes(16)
  serial[0] &= 0x7f
  serial[0] |= 0x01
  const notBefore = new Date(now.getTime() - 24 * 3600 * 1000)
  const notAfter = new Date(now.getTime() + 10 * 365 * 24 * 3600 * 1000)
  const tbs = sequence(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, serial),
    SIGNATURE_ALGORITHM,
    NAME,
    sequence(utcTime(notBefore), utcTime(notAfter)),
    NAME,
    publicKey.export({ type: 'spki', format: 'der' }),
  )
  const signature = createSign('sha256').update(tbs).sign(privateKey)
  const certificate = sequence(tbs, SIGNATURE_ALGORITHM, der(0x03, Buffer.concat([Buffer.from([0]), signature])))
  return { cert: pem('CERTIFICATE', certificate), key: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string }
}
