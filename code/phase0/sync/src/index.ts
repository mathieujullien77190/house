// House Sync, version minimale : prépare la base SQLite et vérifie à intervalle régulier que Frigate répond.
// Plus tard : connexion avec le compte viewer, polling des événements, copie des clips, écriture des adresses.
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const FRIGATE_URL = process.env.FRIGATE_URL ?? 'https://frigate:8971'
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

const check = async () => {
  try {
    const res = await fetch(`${FRIGATE_URL}/api/version`)
    log(`Frigate répond : HTTP ${res.status}`)
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
