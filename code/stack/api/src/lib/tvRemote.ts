// La télécommande du Freebox Player POP (Android TV / Google TV) : protocole « Android TV Remote v2 », celui de l'appli Google TV.
// - Appairage, port 6467 : TLS avec un certificat client neuf ; la TV affiche un code de 6 caractères hexadécimaux (le premier octet est une somme de contrôle) ; le client répond
//   avec SHA-256(modulo et exposant du client, modulo et exposant de la TV, code sans son premier octet). La TV retient alors le certificat client.
// - Télécommande, port 6466 : TLS avec ce même certificat, sans code. Poignée de main (remote_configure, remote_set_active), ping à répondre, puis une touche = un KeyCode Android.
// Les connexions passent par un `connect` injecté (les tests ne touchent jamais le réseau). Le certificat et la clé ne figurent dans aucune réponse, aucun message d'erreur, aucun log.
import { createHash, X509Certificate } from 'node:crypto'
import tls from 'node:tls'
import type { BoxDevice } from '../services/boxService.ts'
import { generateIdentity, type TvIdentity } from './tvCert.ts'
import { isTvApp, isTvKey, TV_APPS, TV_KEY_CODES, TV_KEYS, WAKE_FIRST, WAKEUP_KEY_CODE, type TvKey } from './tvKeys.ts'
import { DIRECTION, parsePairing, parseRemote, pairingConfiguration, pairingOptions, pairingRequest, pairingSecret, remoteAppLink, remoteConfigure, remoteKey, remotePong, remoteSetActive, STATUS_OK, type PairingKind } from './tvMessages.ts'
import type { TvStore } from './tvStore.ts'
import { createFrameReader, frame } from './tvWire.ts'

export { isTvKey, TV_KEYS, type TvKey }

export const REMOTE_PORT = 6466
export const PAIRING_PORT = 6467

export type TvErrorCode = 'not_paired' | 'no_pairing' | 'bad_code' | 'unreachable' | 'refused' | 'timeout'

/** Le Player est éteint, refuse, n'est pas appairé ou le code est faux. Le message ne contient jamais le certificat, la clé ni le code. */
export class TvRemoteError extends Error {
  code: TvErrorCode
  constructor(message: string, code: TvErrorCode = 'unreachable') {
    super(message)
    this.name = 'TvRemoteError'
    this.code = code
  }
}

/** Une connexion TLS ouverte vers le Player, réduite à ce dont le client a besoin. */
export interface TvSocket {
  write: (data: Buffer) => void
  close: () => void
  /** Le certificat de la TV (DER), null s'il manque. */
  serverCertificate: () => Buffer | null
  onData: (callback: (chunk: Buffer) => void) => void
  onClose: (callback: () => void) => void
}

/** Ouvre une connexion TLS (avec l'identité client) sur ce port du Player ; rejette si elle n'aboutit pas. */
export type TvConnect = (port: number, identity: TvIdentity) => Promise<TvSocket>

/** La vraie connexion : TLS sans vérification du certificat de la TV (il est auto-signé et personnel à chaque Player, le LAN est de confiance). */
export const connectTls =
  (host: string, timeoutMs = 3000): TvConnect =>
  (port, identity) =>
    new Promise((resolve, reject) => {
      const socket = tls.connect({ host, port, key: identity.key, cert: identity.cert, rejectUnauthorized: false })
      let opened = false
      socket.setTimeout(timeoutMs, () => socket.destroy())
      socket.on('error', () => undefined)
      socket.once('close', () => {
        if (!opened) reject(new TvRemoteError('player unreachable'))
      })
      socket.once('secureConnect', () => {
        opened = true
        socket.setTimeout(0)
        resolve({
          write: (data) => void socket.write(data),
          close: () => void socket.destroy(),
          serverCertificate: () => socket.getPeerCertificate().raw,
          onData: (callback) => void socket.on('data', callback),
          onClose: (callback) => void socket.on('close', callback),
        })
      })
    })

export interface TvRemote {
  /** Envoie une touche ; `long` simule un appui long. Échoue (TvRemoteError) quand le Player n'est pas appairé ou ne répond pas. */
  press: (key: TvKey, long?: boolean) => Promise<void>
  paired: () => boolean
  /** Ouvre l'appairage : la TV affiche le code. */
  pairStart: () => Promise<void>
  /** Termine l'appairage avec le code lu sur la TV et garde le certificat. */
  pairFinish: (code: string) => Promise<void>
  /** Oublie l'appairage (la TV garde le certificat, sans effet sans la clé). */
  unpair: () => void
}

export interface TvRemoteDeps {
  store: TvStore
  connect: TvConnect
  /** Attente d'un message de la TV, 5 s par défaut. */
  timeoutMs?: number
  /** Une connexion de télécommande inutilisée est fermée après ce délai (60 s). */
  idleMs?: number
  /** Une connexion muette depuis ce délai est jugée morte (la TV envoie un ping toutes les 5 s) : 20 s. */
  staleMs?: number
  /** Durée d'un appui long, 800 ms. */
  longMs?: number
  /** Le temps laissé au Player pour sortir de veille après `WAKEUP`, avant « Free » ou une application (3 s par défaut). */
  wakeMs?: number
  /** L'appairage ouvert sans code est refermé après ce délai (5 min). */
  pairingMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  generate?: () => TvIdentity
}

interface Session {
  socket: TvSocket
  closed: boolean
  lastRx: number
}

interface Pending {
  socket: TvSocket
  identity: TvIdentity
  next: () => Promise<Buffer>
  timer: NodeJS.Timeout
}

const CLIENT_NAME = 'House'

/** Modulo et exposant (RSA) d'un certificat DER ou PEM, en octets big-endian sans zéro de tête. */
const rsaParts = (certificate: Buffer | string): Buffer[] | null => {
  try {
    const jwk = new X509Certificate(certificate).publicKey.export({ format: 'jwk' })
    return [Buffer.from(jwk.n as string, 'base64url'), Buffer.from(jwk.e as string, 'base64url')]
  } catch {
    return null
  }
}

/** Un code écrit à la main : 6 caractères hexadécimaux, majuscules ou minuscules. */
export const normalizePairingCode = (value: unknown): string | null => (typeof value === 'string' && /^[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim().toUpperCase() : null)

export const createTvRemote = (deps: TvRemoteDeps): TvRemote => {
  const { store, connect } = deps
  const timeoutMs = deps.timeoutMs ?? 5000
  const idleMs = deps.idleMs ?? 60_000
  const staleMs = deps.staleMs ?? 20_000
  const longMs = deps.longMs ?? 800
  const wakeMs = deps.wakeMs ?? 3000
  const pairingMs = deps.pairingMs ?? 5 * 60_000
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const generate = deps.generate ?? generateIdentity

  const open = async (port: number, identity: TvIdentity): Promise<TvSocket> => {
    try {
      return await connect(port, identity)
    } catch {
      throw new TvRemoteError('player unreachable')
    }
  }

  // --- Télécommande ---

  let current: Promise<Session> | null = null
  let idleTimer: NodeJS.Timeout | null = null

  const openSession = async (): Promise<Session> => {
    const identity = store.load()
    if (!identity) throw new TvRemoteError('player not paired', 'not_paired')
    const socket = await open(REMOTE_PORT, identity)
    const session: Session = { socket, closed: false, lastRx: now() }
    return new Promise<Session>((resolve, reject) => {
      let features = 0
      let ready = false
      const timer = setTimeout(() => {
        reject(new TvRemoteError('player did not answer', 'timeout'))
        socket.close()
      }, timeoutMs)
      const ok = () => {
        if (ready) return
        ready = true
        clearTimeout(timer)
        resolve(session)
      }
      const reader = createFrameReader((raw) => {
        session.lastRx = now()
        const message = parseRemote(raw)
        if (message.kind === 'configure') {
          features = message.features
          socket.write(frame(remoteConfigure(features)))
        } else if (message.kind === 'set_active') {
          socket.write(frame(remoteSetActive(features)))
          ok()
        } else if (message.kind === 'start') ok()
        else if (message.kind === 'ping') socket.write(frame(remotePong(message.val1)))
        else if (message.kind === 'error') socket.close()
      })
      socket.onData((chunk) => {
        try {
          reader(chunk)
        } catch {
          socket.close()
        }
      })
      socket.onClose(() => {
        session.closed = true
        if (!ready) {
          clearTimeout(timer)
          reject(new TvRemoteError('player unreachable'))
        }
      })
    })
  }

  const getSession = async (): Promise<Session> => {
    const previous = current
    if (previous) {
      try {
        const session = await previous
        if (!session.closed && now() - session.lastRx < staleMs) return session
        session.socket.close()
      } catch {
        // la connexion précédente a échoué : on en ouvre une autre
      }
      if (current === previous) current = null
      if (current) return getSession()
    }
    const next = openSession()
    current = next
    try {
      return await next
    } catch (error) {
      if (current === next) current = null
      throw error
    }
  }

  const closeSession = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = null
    const previous = current
    current = null
    previous?.then((session) => session.socket.close(), () => undefined)
  }

  const send = (session: Session, keyCode: number, direction: number) => {
    if (session.closed) throw new TvRemoteError('player unreachable')
    session.socket.write(frame(remoteKey(keyCode, direction)))
  }

  // --- Appairage ---

  let pending: Pending | null = null

  const dropPending = () => {
    if (!pending) return
    clearTimeout(pending.timer)
    pending.socket.close()
    pending = null
  }

  /** Les messages reçus, un par un ; chaque attente échoue si la TV se tait ou ferme. */
  const inbox = (socket: TvSocket): (() => Promise<Buffer>) => {
    interface Waiter {
      resolve: (message: Buffer) => void
      reject: (error: TvRemoteError) => void
    }
    const queue: Buffer[] = []
    const state: { waiter: Waiter | null; closed: boolean } = { waiter: null, closed: false }
    const reader = createFrameReader((message) => {
      const waiter = state.waiter
      state.waiter = null
      if (waiter) waiter.resolve(message)
      else queue.push(message)
    })
    const fail = () => {
      state.closed = true
      const waiter = state.waiter
      state.waiter = null
      waiter?.reject(new TvRemoteError('player unreachable'))
    }
    socket.onData((chunk) => {
      try {
        reader(chunk)
      } catch {
        socket.close()
        fail()
      }
    })
    socket.onClose(fail)
    return () =>
      new Promise<Buffer>((resolve, reject) => {
        const queued = queue.shift()
        if (queued) return resolve(queued)
        if (state.closed) return reject(new TvRemoteError('player unreachable'))
        const timer = setTimeout(() => {
          state.waiter = null
          reject(new TvRemoteError('player did not answer', 'timeout'))
        }, timeoutMs)
        state.waiter = {
          resolve: (message) => {
            clearTimeout(timer)
            resolve(message)
          },
          reject: (error) => {
            clearTimeout(timer)
            reject(error)
          },
        }
      })
  }

  const expect = async (next: () => Promise<Buffer>, kind: PairingKind): Promise<void> => {
    let message: { status: number; kind: PairingKind }
    try {
      message = parsePairing(await next())
    } catch (error) {
      if (error instanceof TvRemoteError) throw error
      throw new TvRemoteError('pairing refused', 'refused')
    }
    if (message.status === 402) throw new TvRemoteError('wrong pairing code', 'bad_code')
    if (message.status !== STATUS_OK || message.kind !== kind) throw new TvRemoteError('pairing refused', 'refused')
  }

  return {
    paired: () => store.paired(),
    press: async (key, long = false) => {
      const session = await getSession()
      try {
        // Un Player allumé mais en veille (écran noir, réseau actif) ne réagit pas à « Free » ni à un lien d'application : on le réveille d'abord (sans effet s'il est allumé).
        // Éteint, il n'est pas joignable par le réseau : on l'allume avec la télécommande.
        if (WAKE_FIRST.includes(key)) {
          send(session, WAKEUP_KEY_CODE, DIRECTION.short)
          await sleep(wakeMs)
        }
        if (isTvApp(key)) {
          if (session.closed) throw new TvRemoteError('player unreachable')
          session.socket.write(frame(remoteAppLink(TV_APPS[key])))
        } else if (long) {
          const keyCode = TV_KEY_CODES[key]
          send(session, keyCode, DIRECTION.startLong)
          await sleep(longMs)
          send(session, keyCode, DIRECTION.endLong)
        } else send(session, TV_KEY_CODES[key], DIRECTION.short)
      } catch {
        throw new TvRemoteError('player unreachable')
      }
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(closeSession, idleMs)
      idleTimer.unref()
    },
    pairStart: async () => {
      dropPending()
      const identity = generate()
      const socket = await open(PAIRING_PORT, identity)
      const next = inbox(socket)
      try {
        socket.write(frame(pairingRequest(CLIENT_NAME)))
        await expect(next, 'request_ack')
        socket.write(frame(pairingOptions()))
        await expect(next, 'options')
        socket.write(frame(pairingConfiguration()))
        await expect(next, 'configuration_ack')
      } catch (error) {
        socket.close()
        throw error
      }
      const timer = setTimeout(dropPending, pairingMs)
      timer.unref()
      pending = { socket, identity, next, timer }
    },
    pairFinish: async (code) => {
      const normalized = normalizePairingCode(code)
      if (!normalized) throw new TvRemoteError('pairing code must be 6 hexadecimal characters', 'bad_code')
      const waiting = pending
      if (!waiting) throw new TvRemoteError('no pairing in progress', 'no_pairing')
      const client = rsaParts(waiting.identity.cert)
      const serverCertificate = waiting.socket.serverCertificate()
      const server = serverCertificate ? rsaParts(serverCertificate) : null
      if (!client || !server) {
        dropPending()
        throw new TvRemoteError('pairing refused', 'refused')
      }
      const hash = createHash('sha256')
      for (const part of [...client, ...server, Buffer.from(normalized.slice(2), 'hex')]) hash.update(part)
      const secret = hash.digest()
      // Le premier octet du code est le premier octet du hash : un code faux se voit sans rien envoyer, et on peut le ressaisir.
      if (secret[0] !== parseInt(normalized.slice(0, 2), 16)) throw new TvRemoteError('wrong pairing code', 'bad_code')
      try {
        waiting.socket.write(frame(pairingSecret(secret)))
        await expect(waiting.next, 'secret_ack')
      } catch (error) {
        dropPending()
        throw error
      }
      store.save(waiting.identity)
      dropPending()
      closeSession()
    },
    unpair: () => {
      dropPending()
      closeSession()
      store.clear()
    },
  }
}

/** Le Player parmi les appareils de la box : celui dont le nom contient « Player » (le Freebox Server est aussi de type `freebox_pop`, son nom ne convient pas) ; null s'il n'y est pas. */
export const findPlayer = (devices: BoxDevice[]): BoxDevice | null => devices.find((device) => /player/i.test(device.name)) ?? null
