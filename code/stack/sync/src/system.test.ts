// Tests de la lecture de la machine (processeur par thread, mémoire, faux /proc dans un dossier temporaire) : node --test (npm test).
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { countThreads, cpuPercent, parseCpuTimes, parseMemory, parseThreadTimes, readSystem } from './system.ts'
import { tempDir } from './testing.ts'

const STAT = ['cpu  400 0 200 1400 0 0 0 0 0 0', 'cpu0 100 0 50 350 0 0 0 0 0 0', 'cpu1 300 0 150 1050 0 0 0 0 0 0', 'intr 1'].join('\n')

test('parseThreadTimes rend un temps par ligne cpuN, dans l’ordre', () => {
  const threads = parseThreadTimes(STAT)
  assert.equal(threads.length, 2)
  assert.deepEqual(threads[0], { busy: 150, total: 500 })
  assert.deepEqual(threads[1], { busy: 450, total: 1500 })
})

test('un thread illisible compte pour zéro', () => {
  assert.deepEqual(parseThreadTimes('cpu0 1 x 3 4'), [{ busy: 0, total: 0 }])
})

test('la part d’un thread se calcule entre deux lectures', () => {
  assert.equal(cpuPercent({ busy: 150, total: 500 }, { busy: 200, total: 600 }), 50)
  assert.equal(cpuPercent({ busy: 0, total: 10 }, { busy: 0, total: 10 }), 0)
  assert.equal(cpuPercent({ busy: 0, total: 0 }, { busy: 200, total: 100 }), 100)
  assert.equal(cpuPercent({ busy: 10, total: 0 }, { busy: 0, total: 100 }), 0)
})

test('parseCpuTimes : la ligne « cpu » globale, ou null', () => {
  assert.deepEqual(parseCpuTimes(STAT), { busy: 600, total: 2000 })
  assert.equal(parseCpuTimes('cpu0 1 2 3 4'), null)
  assert.equal(parseCpuTimes('cpu  1 2'), null)
  assert.equal(parseCpuTimes('cpu  a b c d'), null)
  assert.deepEqual(parseCpuTimes('cpu  1 0 1 2'), { busy: 2, total: 4 })
})

test('countThreads compte les lignes cpuN', () => {
  assert.equal(countThreads(STAT), 2)
  assert.equal(countThreads(''), 0)
})

test('parseMemory : total et disponible en octets, null s\'il manque quelque chose', () => {
  assert.deepEqual(parseMemory('MemTotal:       1000 kB\nMemAvailable:    400 kB\n'), { total: 1024000, available: 409600 })
  assert.equal(parseMemory('MemTotal: 1000 kB'), null)
  assert.equal(parseMemory(''), null)
})

const proc = (files: Record<string, string>): string => {
  const root = tempDir()
  mkdirSync(`${root}/proc`)
  for (const [name, content] of Object.entries(files)) writeFileSync(`${root}/proc/${name}`, content)
  return root
}

test('readSystem : mémoire, processeur global et par thread', async () => {
  const root = proc({ meminfo: 'MemTotal: 2000 kB\nMemAvailable: 1000 kB\n', stat: STAT, loadavg: '0.52 0.4 0.3 1/200 123\n' })
  const report = await readSystem(root, 1)
  assert.deepEqual(report.memory, { total: 2048000, available: 1024000 })
  assert.deepEqual(report.cpu, { percent: 0, threads: 2, load1: 0.52, perThread: [0, 0] })
})

test('readSystem : une charge illisible vaut 0 ; sans /proc, rien', async () => {
  const root = proc({ stat: STAT, loadavg: 'x' })
  assert.equal((await readSystem(root, 1)).cpu?.load1, 0)
  const empty = await readSystem(`${root}/absent`, 1)
  assert.deepEqual(empty, { memory: null, cpu: null })
})

test('readSystem : un /proc/stat sans ligne « cpu » ne donne pas de processeur', async () => {
  const root = proc({ stat: 'intr 1', loadavg: '1 1 1' })
  assert.equal((await readSystem(root, 1)).cpu, null)
})

test('readSystem : un thread apparu entre les deux lectures est mesuré contre lui-même', async () => {
  const one = ['cpu  100 0 0 100', 'cpu0 100 0 0 100'].join('\n')
  const root = proc({ stat: one, loadavg: '1 1 1' })
  setTimeout(() => writeFileSync(`${root}/proc/stat`, STAT), 10)
  const report = await readSystem(root, 80)
  assert.equal(report.cpu?.perThread.length, 2)
  assert.equal(report.cpu?.perThread[1], 0)
})
