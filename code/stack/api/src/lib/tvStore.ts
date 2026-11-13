// L'appairage du Player : le certificat client et sa clé privée, dans le dossier `tv/` de STATE_DIR (data/house/tv). Le dossier est en 0700, la clé en 0600.
// Rien de ce qui est lu ici ne sort dans une réponse d'API ni dans un log ; seul `paired()` (vrai ou faux) est montré.
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TvIdentity } from './tvCert.ts'

export interface TvStore {
  /** L'identité gardée à l'appairage ; null tant que le Player n'est pas appairé. */
  load: () => TvIdentity | null
  paired: () => boolean
  save: (identity: TvIdentity) => void
  /** Oublie l'appairage (supprime la clé et le certificat). */
  clear: () => void
}

export const createTvStore = (directory: string): TvStore => {
  const keyFile = join(directory, 'client.key')
  const certFile = join(directory, 'client.crt')
  let cache: TvIdentity | null | undefined
  const load = (): TvIdentity | null => {
    if (cache === undefined) {
      try {
        cache = { key: readFileSync(keyFile, 'utf8'), cert: readFileSync(certFile, 'utf8') }
      } catch {
        cache = null
      }
    }
    return cache
  }
  return {
    load,
    paired: () => load() !== null,
    save: (identity) => {
      mkdirSync(directory, { recursive: true, mode: 0o700 })
      chmodSync(directory, 0o700)
      writeFileSync(keyFile, identity.key, { mode: 0o600 })
      chmodSync(keyFile, 0o600)
      writeFileSync(certFile, identity.cert, { mode: 0o644 })
      cache = identity
    },
    clear: () => {
      rmSync(keyFile, { force: true })
      rmSync(certFile, { force: true })
      cache = null
    },
  }
}
