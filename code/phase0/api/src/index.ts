// House API, version minimale : un service welcome, et la WebApp servie comme fichiers statiques.
// Plus tard : auth, direct, image, events, clips, poe.
import { readFile } from 'node:fs/promises'
import { createServer, type ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const PORT = Number(process.env.PORT ?? 8080)
const WEB_DIR = resolve(process.env.WEB_DIR ?? './web')

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const sendFile = async (res: ServerResponse, pathname: string) => {
  const file = resolve(WEB_DIR, `.${pathname === '/' ? '/index.html' : pathname}`)
  // Jamais de fichier hors du dossier de la WebApp.
  if (!file.startsWith(WEB_DIR + sep)) return sendJson(res, 404, { error: 'not found' })
  try {
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    sendJson(res, 404, { error: 'not found' })
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'GET' && pathname === '/welcome') {
    return sendJson(res, 200, { service: 'house-api', message: 'Welcome to House API', time: new Date().toISOString() })
  }
  if (req.method === 'GET') return sendFile(res, pathname)
  sendJson(res, 405, { error: 'method not allowed' })
})

server.listen(PORT, () => console.log(`House API sur le port ${PORT}`))

const stop = () => server.close(() => process.exit(0))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
