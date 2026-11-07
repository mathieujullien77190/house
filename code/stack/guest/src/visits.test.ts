import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createVisitLog, describeAgent, normalizeIp, originOf, type VisitEntry } from './visits.ts'

const entry = (patch: Partial<VisitEntry> = {}): VisitEntry => ({
  at: 1_800_000_000,
  kind: 'page',
  ip: '192.168.1.66',
  origin: 'maison',
  device: 'Chrome 130 · Windows',
  user_agent: 'x',
  language: 'fr-FR',
  host: 'mini.local:8090',
  key: 'avec clé',
  path: '/',
  camera: '',
  quality: '',
  status: 200,
  duration: null,
  bytes: null,
  ...patch,
})

test('normalizeIp enlève le préfixe IPv4-dans-IPv6', () => {
  assert.equal(normalizeIp('::ffff:192.168.1.66'), '192.168.1.66')
  assert.equal(normalizeIp('2a01:e0a::1'), '2a01:e0a::1')
})

test('originOf : maison, VPN, mini PC, internet', () => {
  assert.equal(originOf('::ffff:192.168.1.66'), 'maison')
  assert.equal(originOf('192.168.27.5'), 'VPN')
  assert.equal(originOf('::ffff:172.21.0.1'), 'mini PC')
  assert.equal(originOf('127.0.0.1'), 'mini PC')
  assert.equal(originOf('::1'), 'mini PC')
  assert.equal(originOf('203.0.113.9'), 'internet')
  assert.equal(originOf('2a01:e0a:a16:58d0::1'), 'internet')
  assert.equal(originOf('fe80::1'), 'maison')
})

test('describeAgent reconnaît les navigateurs et systèmes courants', () => {
  assert.equal(describeAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'), 'Chrome 130 · Windows')
  assert.equal(describeAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.5'), 'Edge 130 · Windows')
  assert.equal(describeAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'), 'Safari 17 · iOS')
  assert.equal(describeAgent('Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0'), 'Firefox 128 · Android')
  assert.equal(describeAgent('curl/8.18.0'), 'curl 8')
  assert.equal(describeAgent(''), 'inconnu')
})

test('le journal ajoute une ligne JSON par visite', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'guest-visits-'))
  const file = join(dir, 'visits.jsonl')
  try {
    const log = createVisitLog(file)
    log.log(entry())
    log.log(entry({ kind: 'stream', camera: 'voliere-interieur', quality: '4K', duration: 12.3, bytes: 5_000_000 }))
    await log.idle()
    const lines = readFileSync(file, 'utf8').trim().split('\n')
    assert.equal(lines.length, 2)
    assert.equal(JSON.parse(lines[1]).camera, 'voliere-interieur')
    assert.equal(JSON.parse(lines[1]).duration, 12.3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('au-delà de la taille maximale, le fichier passe en .old', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'guest-visits-'))
  const file = join(dir, 'visits.jsonl')
  try {
    writeFileSync(file, 'x'.repeat(200))
    const log = createVisitLog(file, 100)
    log.log(entry())
    await log.idle()
    assert.ok(existsSync(`${file}.old`))
    assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('sans fichier configuré ou dossier absent, rien ne plante', async () => {
  const none = createVisitLog('')
  none.log(entry())
  await none.idle()
  const missing = createVisitLog(join(tmpdir(), 'dossier-qui-n-existe-pas-visites', 'v.jsonl'))
  missing.log(entry())
  await missing.idle()
})
