// Outils des essais (hors couverture) : une base en mémoire prête, un contexte, de fausses requêtes et réponses HTTP, un faux réseau.
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import https, { type RequestOptions } from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { DatabaseSync } from 'node:sqlite'
import { after, mock } from 'node:test'
import { loadConfig, type Config } from './config.ts'
import type { Context, Fetch } from './context.ts'
import { initDatabase } from './database.ts'
import { createGuestVisitsTable } from './guestVisits.ts'
import { createHeatingLogTable } from './heatingLog.ts'
import { createHueLog } from './hueLog.ts'
import { createPlanTable } from './plan.ts'
import { createSettings } from './settings.ts'

/** Un dossier temporaire, supprimé à la fin du fichier d'essais. */
export const tempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'house-sync-'))
  after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

/** Une horloge réglable (millisecondes). */
export const clock = (start = Date.UTC(2026, 10, 9, 12, 0, 0)) => {
  let current = start
  return { now: () => current, set: (value: number) => void (current = value), advance: (ms: number) => void (current += ms) }
}

export interface TestContext extends Context {
  dir: string
  logs: string[]
  time: ReturnType<typeof clock>
  /** Les appels faits à `fetch`, dans l'ordre. */
  calls: { url: string; method: string; body?: string }[]
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

/** Un contexte complet : base en mémoire (schéma créé), dossier de données temporaire, horloge réglable, journal gardé, `fetch` simulé par `handler`. */
export const testContext = (handler: Handler = () => new Response('', { status: 404 }), env: Record<string, string> = {}): TestContext => {
  const dir = tempDir()
  const time = clock()
  const config: Config = loadConfig({ DATA_DIR: dir, RECORDER_URLS: 'http://rec1:8080', HOUSE_KEY: 'secret-key-123', WEB_DIR: join(dir, 'web'), ZONES_FILE: join(dir, 'zones.json'), SAVED_CLIPS_FILE: join(dir, 'saved.json'), PLAN_FILE: join(dir, 'plan.json'), GUEST_STATE_FILE: join(dir, 'guest', 'state.json'), GUEST_VISITS_FILE: join(dir, 'visits.jsonl'), HEATING_LOG_FILE: join(dir, 'heating-log.jsonl'), ...env })
  const db = new DatabaseSync(':memory:')
  const log = console.log
  console.log = () => undefined
  try {
    initDatabase(db, dir, time.now)
    // Les autres tables de la base, créées au démarrage par le journal Hue, les visites et le plan.
    createHueLog(db, { address: '', key: '', log: () => undefined })
    createGuestVisitsTable(db)
    createHeatingLogTable(db)
    createPlanTable(db)
  } finally {
    console.log = log
  }
  const calls: TestContext['calls'] = []
  const fakeFetch: Fetch = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined })
    return handler(url, init)
  }
  const logs: string[] = []
  return { db, config, settings: createSettings(db, config), fetch: fakeFetch, now: time.now, log: (message) => void logs.push(message), dir, logs, time, calls }
}

/** Une requête HTTP simulée. */
export const fakeRequest = (options: { method?: string; url?: string; headers?: Record<string, string>; body?: string; ip?: string | undefined } = {}): IncomingMessage => {
  const req = Readable.from(options.body === undefined ? [] : [Buffer.from(options.body)]) as unknown as IncomingMessage
  req.method = options.method ?? 'GET'
  req.url = options.url ?? '/'
  req.headers = options.headers ?? {}
  Object.defineProperty(req, 'socket', { value: { remoteAddress: 'ip' in options ? options.ip : '1.2.3.4' } })
  return req
}

export interface FakeResponse extends ServerResponse {
  status: number
  sentHeaders: Record<string, string | number>
  text: () => string
  buffer: () => Buffer
  done: Promise<void>
}

/** Une réponse HTTP simulée : garde le code, les en-têtes et le corps. */
export const fakeResponse = (): FakeResponse => {
  const chunks: Buffer[] = []
  let done: () => void = () => undefined
  const finished = new Promise<void>((resolve) => (done = resolve))
  const res = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      chunks.push(Buffer.from(chunk))
      callback()
    },
    final(callback) {
      done()
      callback()
    },
    destroy(error, callback) {
      done()
      callback(error)
    },
  }) as unknown as FakeResponse
  res.status = 0
  res.sentHeaders = {}
  let sent = false
  Object.defineProperty(res, 'headersSent', { get: () => sent })
  res.writeHead = ((status: number, headers: Record<string, string | number> = {}) => {
    res.status = status
    res.sentHeaders = headers
    sent = true
    return res
  }) as unknown as FakeResponse['writeHead']
  res.text = () => Buffer.concat(chunks).toString('utf8')
  res.buffer = () => Buffer.concat(chunks)
  res.done = finished
  return res
}

export interface BridgeAnswer {
  status?: number
  body?: string
  /** La requête échoue avec ce message. */
  error?: string
  /** La requête échoue avec cette valeur telle quelle (qui n'est pas forcément une Error). */
  rawError?: unknown
  /** La requête dépasse son délai. */
  timeout?: boolean
  /** La réponse reste ouverte sans rien envoyer (un flux d'événements). */
  hang?: boolean
}

export interface FakeRequest extends EventEmitter {
  options: RequestOptions
  destroyed: boolean
  idleMs: number
  idleCallback: () => void
  destroy: (error?: Error) => void
  setTimeout: (ms: number, callback: () => void) => FakeRequest
}

export interface FakeResponseStream extends EventEmitter {
  statusCode: number
  resumed: boolean
}

/** Remplace `https.get` : `answer` dit ce que répond le « pont » à chaque requête. Rend les requêtes faites et les réponses ouvertes. */
export const fakeHttpsGet = (answer: (options: RequestOptions) => BridgeAnswer) => {
  const requests: FakeRequest[] = []
  const responses: FakeResponseStream[] = []
  mock.method(https, 'get', (options: RequestOptions, callback: (res: FakeResponseStream) => void) => {
    const req = Object.assign(new EventEmitter(), {
      options,
      destroyed: false,
      idleMs: 0,
      idleCallback: () => undefined,
      destroy: (error?: Error) => {
        req.destroyed = true
        if (error) queueMicrotask(() => req.emit('error', error))
      },
      setTimeout: (ms: number, cb: () => void) => {
        req.idleMs = ms
        req.idleCallback = cb
        return req
      },
    }) as FakeRequest
    requests.push(req)
    queueMicrotask(() => {
      const a = answer(options)
      if (a.error) return void req.emit('error', new Error(a.error))
      if (a.rawError !== undefined) return void req.emit('error', a.rawError)
      if (a.timeout) return void req.emit('timeout')
      const res = Object.assign(new EventEmitter(), {
        statusCode: a.status ?? 200,
        resumed: false,
        setEncoding: () => undefined,
        resume: () => void (res.resumed = true),
      }) as FakeResponseStream
      responses.push(res)
      callback(res)
      if (!a.hang) {
        if (a.body !== undefined) res.emit('data', a.body)
        res.emit('end')
      }
    })
    return req
  })
  return { requests, responses }
}

/** Laisse les promesses et les microtâches en attente se terminer. */
export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))
