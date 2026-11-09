import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockDriver, type ShutterDriver } from '../lib/shutterDriver.ts'
import { createShutterLog, type ShutterEntry, type ShutterLog } from '../lib/shutterLog.ts'
import { withTempDir } from '../testing/helpers.ts'
import { createShuttersService, NoCloseTime, OPEN_MARGIN_SECONDS, UnknownShutter } from './shuttersService.ts'

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
      { id: '1', name: 'Salon', lastCommand: null, lastAt: null, closeSeconds: null, halfRunning: false },
      { id: '2', name: 'Chambre', lastCommand: null, lastAt: null, closeSeconds: null, halfRunning: false },
    ],
  })
})

test('un ordre réussi : envoyé au bon numéro, noté (simulation), retenu', async () => {
  const driver = createMockDriver()
  const log = memoryLog()
  const service = createShuttersService({ shutters: SHUTTERS, driver, log, now: () => 500 })
  const shutter = await service.command('2', 'down')
  assert.deepEqual(shutter, { id: '2', name: 'Chambre', lastCommand: 'down', lastAt: 500, closeSeconds: null, halfRunning: false })
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
  assert.deepEqual(service.state().shutters[0], { id: '1', name: 'Salon', lastCommand: 'down', lastAt: 2, closeSeconds: null, halfRunning: false })
  assert.equal(service.state().shutters[1].lastCommand, null)
})

test('avec un vrai journal sur disque', async () => {
  await withTempDir(async (dir) => {
    const log = createShutterLog(`${dir}/log.jsonl`)
    await createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log, now: () => 9 }).command('1', 'up')
    assert.equal(createShuttersService({ shutters: SHUTTERS, driver: createMockDriver(), log }).state().shutters[0].lastAt, 9)
  })
})

const HALF = [{ id: '1', name: 'Cuisine', shadeId: 11, closeSeconds: 19 }, ...SHUTTERS.slice(1)]

/** Laisse la tâche de fond de « Fermer à moitié » avancer. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

/** Une attente qui ne finit que si le volet reçoit un autre ordre (l'annulation la fait échouer). */
const waitForCancel = (_ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('annulé'))))

test('fermer à moitié : monter, attendre, descendre, attendre la moitié, stop', async () => {
  const driver = createMockDriver()
  const log = memoryLog()
  const waits: number[] = []
  const service = createShuttersService({ shutters: HALF, driver, log, now: () => 5, wait: async (ms) => void waits.push(ms) })
  const started = await service.closeHalf('1')
  assert.deepEqual([started.lastCommand, started.closeSeconds, started.halfRunning], ['up', 19, true])
  await flush()
  assert.deepEqual(driver.sent.map((sent) => sent.command), ['up', 'down', 'stop'])
  assert.deepEqual(waits, [(19 + OPEN_MARGIN_SECONDS) * 1000, 9000])
  assert.deepEqual(log.entries.map((entry) => entry.note), ['à moitié : ouvrir à fond · simulation', 'à moitié : fermer · simulation', 'à moitié : arrêt · simulation'])
  assert.equal(service.state().shutters[0].halfRunning, false)
  assert.equal(service.state().shutters[0].lastCommand, 'stop')
})

test('fermer à moitié : volet inconnu, ou sans temps de fermeture', async () => {
  const service = createShuttersService({ shutters: HALF, driver: createMockDriver(), log: memoryLog() })
  await assert.rejects(service.closeHalf('9'), UnknownShutter)
  await assert.rejects(service.closeHalf('2'), NoCloseTime)
})

test('fermer à moitié : un échec du premier ordre est rendu, rien ne reste en cours', async () => {
  const driver: ShutterDriver = {
    mock: false,
    send: async () => {
      throw new Error('KO')
    },
  }
  const service = createShuttersService({ shutters: HALF, driver, log: memoryLog(), wait: waitForCancel })
  await assert.rejects(service.closeHalf('1'), /KO/)
  assert.equal(service.state().shutters[0].halfRunning, false)
})

test('fermer à moitié : un échec en route abandonne la suite', async () => {
  const sent: string[] = []
  const driver: ShutterDriver = {
    mock: false,
    send: async (_shadeId, command) => {
      sent.push(command)
      if (command === 'down') throw new Error('KO')
    },
  }
  const service = createShuttersService({ shutters: HALF, driver, log: memoryLog(), wait: async () => undefined })
  await service.closeHalf('1')
  await flush()
  assert.deepEqual(sent, ['up', 'down'])
  assert.equal(service.state().shutters[0].halfRunning, false)
})

test('fermer à moitié : un autre ordre au même volet annule la suite (attente par défaut comprise)', async () => {
  const driver = createMockDriver()
  const service = createShuttersService({ shutters: HALF, driver, log: memoryLog() })
  await service.closeHalf('1')
  assert.equal(service.state().shutters[0].halfRunning, true)
  const stopped = await service.command('1', 'stop')
  assert.equal(stopped.halfRunning, false)
  await flush()
  assert.deepEqual(driver.sent.map((sent) => sent.command), ['up', 'stop'])
})

test('fermer à moitié : relancé, il remplace le précédent', async () => {
  const driver = createMockDriver()
  const service = createShuttersService({ shutters: HALF, driver, log: memoryLog(), wait: waitForCancel })
  await service.closeHalf('1')
  await service.closeHalf('1')
  await flush()
  // l'ancienne suite s'est arrêtée sans toucher à la nouvelle
  assert.equal(service.state().shutters[0].halfRunning, true)
  assert.deepEqual(driver.sent.map((sent) => sent.command), ['up', 'up'])
  await service.command('1', 'stop')
})
