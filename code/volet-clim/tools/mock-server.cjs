// Maquette de la page du boîtier, à lancer sur le PC : `node tools/mock-server.cjs`, puis http://localhost:8099
// Elle sert la vraie page (src/page.h) et simule l'API de l'ESP32 : aucun matériel, aucun envoi radio ni infrarouge.
// Chaque ordre reçu est écrit dans ce terminal. L'état est gardé en mémoire (relancer le script le remet à zéro).
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = Number(process.env.PORT) || 8099
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'page.h'), 'utf8')
const start = source.indexOf('R"HTML(') + 'R"HTML('.length
const end = source.indexOf(')HTML"')
const page = () => source.slice(start, end) // relu à chaque demande : modifier page.h puis recharger le navigateur

const state = {
  radio: true,
  mhz: 433.42,
  shutters: [{ id: 0, name: 'Volet 1', code: 1 }],
  protocols: ['heavy152', 'heavy88', 'mitsubishi_ac', 'mitsubishi112'],
  schedule: { up: '', down: '' },
  programs: [],
  ac: { power: false, mode: 'heat', temperature: 21, fan: 'auto', vane: 'auto', protocol: 'heavy152' },
}

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}
const log = (text) => console.log(new Date().toLocaleTimeString('fr-FR') + '  ' + text)

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const q = url.searchParams
    const key = `${req.method} ${url.pathname}`
    if (key === 'GET /') return send(res, 200, page(), 'text/html')
    if (key === 'GET /api/state') return send(res, 200, state)
    if (key === 'POST /api/shutter') {
      const shutter = state.shutters[Number(q.get('id'))]
      if (!shutter) return send(res, 404, { error: 'volet inconnu' })
      shutter.code += 1
      log(`volet « ${shutter.name} » : ${q.get('cmd')} (code tournant ${shutter.code})`)
      return send(res, 200, { ok: true, code: shutter.code })
    }
    if (key === 'POST /api/name') {
      const shutter = state.shutters[Number(q.get('id'))]
      if (!shutter) return send(res, 404, { error: 'volet inconnu' })
      shutter.name = q.get('name') || shutter.name
      log(`volet renommé : ${shutter.name}`)
      return send(res, 200, { ok: true })
    }
    if (key === 'POST /api/schedule') {
      state.schedule = { up: q.get('up') || '', down: q.get('down') || '' }
      log(`horaires : montée ${state.schedule.up || '—'}, descente ${state.schedule.down || '—'}`)
      return send(res, 200, { ok: true })
    }
    if (key === 'POST /api/ac/program') {
      state.programs.push({ time: q.get('time'), mode: q.get('mode'), temperature: Number(q.get('temp')), fan: q.get('fan'), vane: q.get('vane') })
      state.programs.sort((a, b) => a.time.localeCompare(b.time))
      log(`programme ajouté : ${q.get('time')} ${q.get('mode')} ${q.get('temp')} °C`)
      return send(res, 200, { ok: true })
    }
    if (key === 'POST /api/ac/program/delete') {
      const [gone] = state.programs.splice(Number(q.get('index')), 1)
      log(`programme supprimé : ${gone ? gone.time : '?'}`)
      return send(res, 200, { ok: true })
    }
    if (key === 'POST /api/frequency') {
      state.mhz = Number(q.get('mhz'))
      log(`fréquence : ${state.mhz} MHz`)
      return send(res, 200, { mhz: state.mhz })
    }
    if (key === 'POST /api/ac') {
      state.ac = {
        power: q.get('power') === '1',
        mode: q.get('mode') || state.ac.mode,
        temperature: Number(q.get('temp')) || state.ac.temperature,
        fan: q.get('fan') || state.ac.fan,
        vane: q.get('vane') || state.ac.vane,
        protocol: q.get('protocol') || state.ac.protocol,
      }
      log(`clim : ${JSON.stringify(state.ac)}`)
      return send(res, 200, { ok: true })
    }
    if (key === 'POST /api/update') {
      log('mise à jour du programme : reçue (simulée)')
      req.resume()
      return send(res, 200, { ok: true })
    }
    return send(res, 404, { error: 'not found' })
  })
  .listen(PORT, () => log(`Maquette sur http://localhost:${PORT} (Ctrl+C pour arrêter)`))
