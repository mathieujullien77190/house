import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockDriver, type ShutterDriver } from '../lib/shutterDriver.ts'
import { createShutterLog, type ShutterEntry, type ShutterLog } from '../lib/shutterLog.ts'
import { withTempDir } from '../testing/helpers.ts'
import { createShuttersService, UnknownShutter } from './shuttersService.ts'

const SHUTTERS = [
  { id: '1', name: 'Salon', shadeId: 11 },
  { id: '2', name: 'Chambre', shadeId: 12 },
]

const memoryLog = (initial: ShutterEntry[] = []): ShutterLog & { entries: ShutterEntry[] } => {
  const entries = [...initial]
  return { entries, append: (entry) => void entries.push(entry), recent: (count) => entries.slice(-count).reverse() }
}

test('l’état : aucun ordre au départ', () => {
  const driver = createMockDriver()
  const service = createShuttersService({ shutters: SHUTTERS, driver, log: memoryLog() })
  assert.deepEqual(service.state(), {
    mock: true,
    shutters: [
      { id: '1', name: 'Salon', lastCommand: null, lastAt: null },
      { id: '2', name: 'Chambre', lastCommand: null, lastAt: null },
    ],
  })
})

test('un ordre réussi : envoyé au bon numéro, noté (simulation), retenu', async () => {
  const driver = createMockDriver()
  const log = memoryLog()
  const service = createShuttersService({ shutters: SHUTTERS, driver, log, now: () => 500 })
  const shutter = await service.command('2', 'down')
  assert.deepEqual(shutter, { id: '2', name: 'Chambre', lastCommand: 'down', lastAt: 500 })
  assert.deepEqual(driver.sent, [{ shadeId: 12, command: 'down' }])
  assert.deepEqual(log.entries, [{ at: 500, shutter: '2', name: 'Chambre', command: 'down', ok: true, note: 'simulation' }])
  await service.command('2', 'up', 'auto : lever du soleil')
  assert.equal(log.entries[1].note, 'auto : lever du soleil · simulation')
  assert.equal(service.state().shutters[1].lastCommand, 'up')
})

test('avec le vrai pilote, pas de note sans raison', async () => {
  const driver: ShutterDriver = { mock: false, send: async () => undefined }
  const log = memoryLog()
  await createShuttersService({ shutters: SHUTTERS, driver, log }).command('1', 'stop')
  assert.equal(log.entries[0].note, null)
  assert.equal(typeof log.entries[0].at, 'number')
})

test('un échec est noté au journal et relancé, sans changer le dernier ordre', async () => {
  const log = memoryLog()
  let failure: unknown = new Error('ESP32 : HTTP 500')
  const driver: ShutterDriver = {
    mock: false,
    send: async () => {
      throw failure
    },
  }
  const service = createShuttersService({ shutters: SHUTTERS, driver, log, now: () => 7 })
  await assert.rejects(service.command('1', 'up', 'auto : lever du soleil'), /HTTP 500/)
  failure = 'texte'
  await assert.rejects(service.command('1', 'up'))
  assert.deepEqual(log.entries[0], { at: 7, shutter: '1', name: 'Salon', command: 'up', ok: false, note: 'auto : lever du soleil · ESP32 : HTTP 500' })
  assert.equal(log.entries[1].note, 'texte')
  assert.equal(service.state().shutters[0].lastCommand, null)
})

test('un volet inconnu', async () => {
  const service = createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log: memoryLog() })
  await assert.rejects(service.command('9', 'up'), UnknownShutter)
})

test('le dernier ordre est relu du journal (le plus récent réussi de chaque volet)', () => {
  const entry = (at: number, shutter: string, command: ShutterEntry['command'], ok = true): ShutterEntry => ({ at, shutter, name: shutter, command, ok, note: null })
  const log = memoryLog([entry(1, '1', 'up'), entry(2, '1', 'down'), entry(3, '1', 'up', false), entry(4, '9', 'up')])
  const service = createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log })
  assert.deepEqual(service.state().shutters[0], { id: '1', name: 'Salon', lastCommand: 'down', lastAt: 2 })
  assert.equal(service.state().shutters[1].lastCommand, null)
})

test('avec un vrai journal sur disque', async () => {
  await withTempDir(async (dir) => {
    const log = createShutterLog(`${dir}/log.jsonl`)
    await createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log, now: () => 9 }).command('1', 'up')
    assert.equal(createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log }).state().shutters[0].lastAt, 9)
  })
})
