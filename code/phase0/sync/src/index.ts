// House Sync, version minimale : prépare la base SQLite, se connecte à Frigate avec le compte viewer
// et vérifie à intervalle régulier que Frigate répond à une requête authentifiée.
// Plus tard : polling des événements, copie des clips, écriture des adresses.
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const FRIGATE_URL = process.env.FRIGATE_URL ?? 'https://frigate:8971'
const FRIGATE_USER = process.env.FRIGATE_USER ?? ''
const FRIGATE_PASSWORD = process.env.FRIGATE_PASSWORD ?? ''
const DATA_DIR = process.env.DATA_DIR ?? './data'
const INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000

mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(`${DATA_DIR}/events.db`)
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    camera TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    clip_path TEXT
  );
  CREATE TABLE IF NOT EXISTS last_images (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS live_streams (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
`)

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

// Cookie de session de Frigate (frigate_token), renvoyé par POST /api/login. Vide tant qu'on n'est pas connecté.
let cookie = ''

const login = async () => {
  const res = await fetch(`${FRIGATE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: FRIGATE_USER, password: FRIGATE_PASSWORD }),
  })
  if (!res.ok) throw new Error(`connexion refusée (HTTP ${res.status})`)
  // On ne garde que la paire nom=valeur du cookie, sans ses attributs (Path, HttpOnly…).
  const token = res.headers.getSetCookie().find((c) => c.startsWith('frigate_token='))
  if (!token) throw new Error('pas de cookie frigate_token dans la réponse')
  cookie = token.split(';')[0]
  log(`Connecté à Frigate (${FRIGATE_USER})`)
}

// Requête authentifiée : se connecte si besoin, et une seule fois de plus si la session a expiré (401).
const frigate = async (path: string): Promise<Response> => {
  if (!cookie) await login()
  const res = await fetch(`${FRIGATE_URL}${path}`, { headers: { Cookie: cookie } })
  if (res.status !== 401) return res
  cookie = ''
  await login()
  return fetch(`${FRIGATE_URL}${path}`, { headers: { Cookie: cookie } })
}

const check = async () => {
  try {
    const res = await frigate('/api/version')
    log(`Frigate répond : HTTP ${res.status}${res.ok ? ` (version ${(await res.text()).trim()})` : ''}`)
  } catch (error) {
    log(`Frigate injoignable : ${error instanceof Error ? error.message : String(error)}`)
  }
}

log(`House Sync démarré (${DATA_DIR}/events.db, toutes les ${INTERVAL_MS / 1000} s)`)
await check()
const timer = setInterval(check, INTERVAL_MS)

const stop = () => {
  clearInterval(timer)
  db.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
