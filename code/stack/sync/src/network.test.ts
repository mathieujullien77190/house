// Tests de la lecture du réseau (un faux /sys dans un dossier temporaire).
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseSignal, parseSpeed, readNetwork } from './network.ts'
import { tempDir } from './testing.ts'

test('parseSpeed : positif seulement', () => {
  assert.equal(parseSpeed('1000'), 1000)
  assert.equal(parseSpeed('-1'), null)
  assert.equal(parseSpeed(''), null)
  assert.equal(parseSpeed('abc'), null)
})

test('parseSignal : le complément à 256 est rendu négatif', () => {
  assert.equal(parseSignal('-55'), -55)
  assert.equal(parseSignal('201'), -55)
  assert.equal(parseSignal('0'), null)
  assert.equal(parseSignal(''), null)
})

const card = (root: string, name: string, files: Record<string, string>, dirs: string[] = []) => {
  const base = `${root}/class/net/${name}`
  mkdirSync(base, { recursive: true })
  for (const dir of dirs) mkdirSync(`${base}/${dir}`, { recursive: true })
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(`${base}/${file}/..`, { recursive: true })
    writeFileSync(`${base}/${file}`, content)
  }
}

test('readNetwork : cartes physiques seulement, le câble avant le WiFi', async () => {
  const root = tempDir()
  card(root, 'wlan0', { operstate: 'up\n', carrier: '1\n', speed: '300\n', address: 'aa:bb\n', 'statistics/rx_bytes': '10\n', 'statistics/tx_bytes': '20\n', 'wireless/level': '201\n' }, ['device', 'wireless'])
  card(root, 'eth1', { operstate: 'down' }, ['device'])
  card(root, 'eth0', { operstate: 'up', carrier: '1', speed: '1000', duplex: 'full', address: 'cc:dd', 'statistics/rx_bytes': '5', 'statistics/tx_bytes': '6' }, ['device'])
  card(root, 'docker0', { operstate: 'up' })
  card(root, 'eth2', { operstate: 'up' }, ['device'])
  card(root, 'eth3', {}, ['device'])
  card(root, 'eth4', { operstate: 'down', carrier: '0' }, ['device'])
  const cards = await readNetwork(root)
  assert.deepEqual(cards.map((c) => c.name), ['eth0', 'eth1', 'eth2', 'eth3', 'eth4', 'wlan0'])
  const [eth0, eth1, eth2, eth3, eth4, wlan0] = cards
  assert.deepEqual(eth0, { name: 'eth0', kind: 'ethernet', up: true, connected: true, speedMbps: 1000, duplex: 'full', mac: 'cc:dd', rxBytes: 5, txBytes: 6, signalDbm: null })
  assert.equal(eth1?.connected, false)
  assert.equal(eth1?.rxBytes, 0)
  assert.equal(eth2?.connected, true)
  assert.equal(eth3?.connected, null)
  assert.equal(eth4?.connected, false)
  assert.deepEqual(wlan0, { name: 'wlan0', kind: 'wifi', up: true, connected: true, speedMbps: 300, duplex: null, mac: 'aa:bb', rxBytes: 10, txBytes: 20, signalDbm: -55 })
})

test('readNetwork : une carte reconnue par son fabricant seulement, ou /sys absent', async () => {
  const root = tempDir()
  card(root, 'eth0', { device: 'fichier, pas un dossier' })
  assert.deepEqual(await readNetwork(root), [])
  assert.deepEqual(await readNetwork(`${root}/absent`), [])
})

test('readNetwork : deux cartes du même genre sont triées par nom', async () => {
  const root = tempDir()
  card(root, 'wlan1', {}, ['device', 'wireless'])
  card(root, 'wlan0', {}, ['device', 'wireless'])
  assert.deepEqual((await readNetwork(root)).map((c) => c.name), ['wlan0', 'wlan1'])
})

test('readNetwork : sans dossier, lit le /sys de l\'hôte (absent ici)', async () => {
  assert.ok(Array.isArray(await readNetwork()))
})

test('readNetwork : le câble passe avant le WiFi même quand le WiFi est lu en premier', async () => {
  const root = tempDir()
  card(root, 'aw0', {}, ['device', 'wireless'])
  card(root, 'zeth0', {}, ['device'])
  card(root, 'beth0', {}, ['device'])
  assert.deepEqual((await readNetwork(root)).map((c) => c.name), ['beth0', 'zeth0', 'aw0'])
})
