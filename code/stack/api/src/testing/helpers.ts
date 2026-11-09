// Outils partagés par les tests (exclus de la couverture : ce n'est pas du code de l'API).
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type RequestListener } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import express, { type Router } from 'express'
import { openDatabase, type Database } from '../db/database.ts'
import { errorHandler, notFound } from '../middleware/errorHandler.ts'

/** Un dossier temporaire, supprimé après le travail. */
export const withTempDir = async <T>(work: (dir: string) => T | Promise<T>): Promise<T> => {
  const dir = mkdtempSync(join(tmpdir(), 'house-api-'))
  try {
    return await work(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export interface RunningServer {
  url: string
  close: () => Promise<void>
}

/** Un serveur HTTP sur le port 0 (libre) de la machine : pour tester les routes ou simuler un équipement. */
export const listen = (handler: RequestListener): Promise<RunningServer> =>
  new Promise((resolve) => {
    const server = createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done())
            server.closeAllConnections()
          }),
      })
    })
  })

/** Lance un serveur le temps du travail. */
export const withServer = async (handler: RequestListener, work: (url: string) => Promise<void>): Promise<void> => {
  const server = await listen(handler)
  try {
    await work(server.url)
  } finally {
    await server.close()
  }
}

/** Le schéma de la base de House Sync, réduit aux colonnes que l'API lit. */
export const SCHEMA = `
  CREATE TABLE live_streams (camera TEXT, url TEXT);
  CREATE TABLE settings (camera TEXT, orientation TEXT, rain_now TEXT);
  CREATE TABLE last_images (camera TEXT, url TEXT);
  CREATE TABLE events (
    id TEXT, camera TEXT, label TEXT, started_at INTEGER, ended_at INTEGER, clip_path TEXT,
    clip_started_at INTEGER, clip_web_path TEXT, clip_audio_path TEXT, orientation TEXT
  );
  CREATE TABLE snapshots (camera TEXT, taken_at INTEGER, path TEXT);
`

/** Crée un fichier SQLite avec ce SQL (le schéma, puis des lignes). */
export const createDatabaseFile = (path: string, sql: string): void => {
  const db = new DatabaseSync(path)
  db.exec(sql)
  db.close()
}

/** Les lignes de départ des tests : deux caméras, trois événements, trois images. */
export const FIXTURE_ROWS = `
  INSERT INTO live_streams VALUES ('cam-a', 'http://go2rtc:1984/stream.html?src=cam-a_sub'), ('cam-b', 'pas une adresse');
  INSERT INTO settings VALUES ('cam-a', 'portrait', 'heavy'), ('cam-b', 'landscape', NULL);
  INSERT INTO last_images VALUES ('cam-b', 'http://x/b.jpg'), ('cam-a', 'http://x/a.jpg');
  INSERT INTO events VALUES ('e1', 'cam-a', 'mouvement', 100, 200, 'clips/e1.mp4', 90, 'clips/e1.h264.mp4', 'clips/e1.aac', 'portrait');
  INSERT INTO events VALUES ('e2', 'cam-a', 'mouvement', 300, NULL, NULL, NULL, NULL, NULL, NULL);
  INSERT INTO events VALUES ('e3', 'cam-b', 'mouvement', 150, 160, 'clips/e3.mp4', 140, NULL, NULL, 'landscape');
  INSERT INTO snapshots VALUES ('cam-a', 1000, 'snaps/1000.jpg'), ('cam-a', 1060, 'snaps/1060.jpg'), ('cam-b', 1000, 'snaps/b1000.jpg');
`

/** Une base de test avec son schéma et ses lignes dans ce dossier ; à fermer (`close`) avant de supprimer le dossier. */
export const openFixture = (dir: string, rows = FIXTURE_ROWS): Database => {
  const file = join(dir, 'events.db')
  createDatabaseFile(file, SCHEMA + rows)
  return openDatabase(file)
}

/** Une application Express avec ces routeurs, le 404 et le gestionnaire d'erreurs de l'API. */
export const routerApp = (...routers: Router[]): express.Express => {
  const app = express()
  for (const router of routers) app.use(router)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export interface JsonReply {
  status: number
  body: unknown
  headers: Headers
}

/** Une requête JSON et sa réponse lue (le corps est du JSON, ou le texte brut s'il ne l'est pas). */
export const call = async (url: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}): Promise<JsonReply> => {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // pas du JSON : le texte reste
  }
  return { status: res.status, body: parsed, headers: res.headers }
}
