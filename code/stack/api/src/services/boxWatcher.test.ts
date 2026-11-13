import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBoxConnectionLog } from '../lib/boxConnectionLog.ts'
import { createBoxGuestsStore } from '../lib/boxGuestsStore.ts'
import { createBoxKnownStore } from '../lib/boxKnownStore.ts'
import { withTempDir } from '../testing/helpers.ts'
import type { BoxDevice, BoxService } from './boxService.ts'
import { createBoxWatcher } from './boxWatcher.ts'

const device = (n: number, patch: Partial<BoxDevice> = {}): BoxDevice => ({
  name: `Appareil ${n}`,
  ip: `192.168.1.${n}`,
  mac: `aa:bb:cc:dd:ee:0${n}`,
  active: true,
  staticLease: null,
  type: 'smartphone',
  vendor: 'Acme',
  ...patch,
})

const setup = (dir: string) => {
  const state = { devices: [] as BoxDevice[], fail: false, time: 1_000_000 }
  const box = {
    lanDevices: async () => {
      if (state.fail) throw new Error('box muette')
      return state.devices
    },
  } as unknown as BoxService
  const log = createBoxConnectionLog(`${dir}/log.jsonl`)
  const known = createBoxKnownStore(`${dir}/known.json`)
  const guests = createBoxGuestsStore(`${dir}/guests.json`)
  const watcher = createBoxWatcher({ box, log, known, guests, now: () => state.time })
  return { state, log, known, guests, watcher }
}

test('la photo de départ : les appareils actifs forment la maison, rien n’est loggé', async () => {
  await withTempDir(async (dir) => {
    const { state, log, known, watcher } = setup(dir)
    // aucun appareil actif : pas de photo
    await watcher.poll()
    assert.equal(known.list(), null)
    state.devices = [device(1), device(2), device(3, { active: false })]
    await watcher.poll()
    assert.deepEqual(
      known.list()?.map((k) => k.mac),
      ['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02'],
    )
    assert.deepEqual(log.recent(10), [])
    assert.equal(watcher.homeList().length, 2)
  })
})

test('un invité connecté entre dans la liste dès la première lecture, sans ligne de journal', async () => {
  await withTempDir(async (dir) => {
    const { state, log, guests, watcher } = setup(dir)
    // la maison existe déjà (redémarrage), un invité est déjà connecté
    const first = setup(dir)
    first.state.devices = [device(1)]
    await first.watcher.poll()
    state.devices = [device(1), device(2)]
    await watcher.poll()
    assert.equal(log.recent(10).length, 0)
    assert.deepEqual(
      guests.list().map((g) => [g.mac, g.firstSeen]),
      [['AA:BB:CC:DD:EE:02', 1000]],
    )
    assert.deepEqual(
      watcher.guestList().map((g) => [g.mac, g.active]),
      [['AA:BB:CC:DD:EE:02', true]],
    )
  })
})

test('un invité qui se connecte puis part est loggé et reste dans la liste, pas un appareil de la maison', async () => {
  await withTempDir(async (dir) => {
    const { state, log, watcher } = setup(dir)
    state.devices = [device(1)]
    await watcher.poll()
    state.time += 15_000
    state.devices = [device(1, { active: false }), device(2), device(3)]
    await watcher.poll()
    assert.deepEqual(
      log.recent(10).map((e) => [e.event, e.mac, e.at]),
      [
        ['connect', 'AA:BB:CC:DD:EE:03', 1015],
        ['connect', 'AA:BB:CC:DD:EE:02', 1015],
      ],
    )
    // rien ne change : rien n'est loggé
    await watcher.poll()
    assert.equal(log.recent(10).length, 2)
    // l'un part (inactif), l'autre disparaît de la liste
    state.time += 15_000
    state.devices = [device(2, { active: false })]
    await watcher.poll()
    const events = log.recent(10).slice(0, 2)
    assert.deepEqual(events.map((e) => [e.event, e.mac]).sort(), [
      ['disconnect', 'AA:BB:CC:DD:EE:02'],
      ['disconnect', 'AA:BB:CC:DD:EE:03'],
    ])
    assert.equal(events.find((e) => e.mac.endsWith('02'))?.name, 'Appareil 2')
    assert.equal(events.find((e) => e.mac.endsWith('03'))?.name, 'Appareil 3')
    // hors ligne mais toujours invités
    assert.equal(watcher.guestList().every((g) => !g.active), true)
  })
})

test('une lecture qui échoue ne change rien, et une MAC illisible est ignorée', async () => {
  await withTempDir(async (dir) => {
    const { state, log, watcher } = setup(dir)
    state.devices = [device(1), device(2)]
    await watcher.poll()
    state.fail = true
    await watcher.poll()
    state.fail = false
    state.devices = [device(1), device(2), device(3, { mac: 'pas-une-mac' })]
    await watcher.poll()
    assert.deepEqual(log.recent(10), [])
  })
})

test('un redémarrage : l’invité déjà présent n’est pas re-loggé', async () => {
  await withTempDir(async (dir) => {
    const first = setup(dir)
    first.state.devices = [device(1)]
    await first.watcher.poll()
    first.state.devices = [device(1), device(2)]
    await first.watcher.poll()
    assert.equal(first.log.recent(10).length, 1)
    const second = setup(dir)
    second.state.devices = [device(1), device(2)]
    await second.watcher.poll()
    assert.equal(second.log.recent(10).length, 1)
  })
})

test('addToHome : valide, retire des invités et ne logge pas de déconnexion', async () => {
  await withTempDir(async (dir) => {
    const { state, log, watcher } = setup(dir)
    assert.equal(watcher.addToHome(3), 'invalid')
    assert.equal(watcher.addToHome('AA:BB:CC:DD:EE:02'), 'not-ready')
    state.devices = [device(1)]
    await watcher.poll()
    state.devices = [device(1), device(2)]
    await watcher.poll()
    assert.deepEqual(watcher.addToHome('aa-bb-cc-dd-ee-02'), { mac: 'AA:BB:CC:DD:EE:02', name: 'Appareil 2', ip: '192.168.1.2' })
    assert.equal(watcher.guestList().length, 0)
    state.devices = [device(1)]
    await watcher.poll()
    assert.equal(log.recent(10).length, 1)
    // un appareil absent de la lecture : nom pris dans la liste des invités, puis dans le journal, sinon la MAC
    assert.equal(watcher.addToHome('AA:BB:CC:DD:EE:09'), watcher.homeList().at(-1))
    assert.equal(watcher.homeList().at(-1)?.name, 'AA:BB:CC:DD:EE:09')
    log.append([{ at: 5, event: 'connect', mac: 'AA:BB:CC:DD:EE:08', name: 'Vieux', ip: '10.0.0.8', type: null, vendor: null }])
    assert.deepEqual(watcher.addToHome('AA:BB:CC:DD:EE:08'), { mac: 'AA:BB:CC:DD:EE:08', name: 'Vieux', ip: '10.0.0.8' })
    state.devices = [device(1), device(4)]
    await watcher.poll()
    state.devices = [device(1)]
    await watcher.poll()
    assert.deepEqual(watcher.addToHome('AA:BB:CC:DD:EE:04')?.valueOf(), { mac: 'AA:BB:CC:DD:EE:04', name: 'Appareil 4', ip: '192.168.1.4' })
  })
})

test('homeList est vide avant la photo de départ, recent rend le journal', async () => {
  await withTempDir(async (dir) => {
    const { log, watcher } = setup(dir)
    assert.deepEqual(watcher.homeList(), [])
    log.append([{ at: 5, event: 'connect', mac: 'AA:BB:CC:DD:EE:08', name: 'Vieux', ip: null, type: null, vendor: null }])
    assert.deepEqual(watcher.recent(10).map((entry) => entry.name), ['Vieux'])
  })
})

test('start lance une lecture et un minuteur, stop l’arrête', async () => {
  await withTempDir(async (dir) => {
    const timers: { work: () => void; ms: number }[] = []
    const cleared: unknown[] = []
    const watcher = createBoxWatcher({
      box: { lanDevices: async () => [device(1)] } as unknown as BoxService,
      log: createBoxConnectionLog(`${dir}/l.jsonl`),
      known: createBoxKnownStore(`${dir}/k.json`),
      guests: createBoxGuestsStore(`${dir}/g.json`),
      setTimer: (work, ms) => {
        timers.push({ work, ms })
        return timers.length
      },
      clearTimer: (timer) => cleared.push(timer),
    })
    watcher.stop()
    watcher.start()
    watcher.start()
    assert.deepEqual(
      timers.map((t) => t.ms),
      [15_000],
    )
    timers[0].work()
    watcher.stop()
    assert.deepEqual(cleared, [1])
  })
})

test('les minuteurs par défaut sont réels et ne retiennent pas le processus', async () => {
  await withTempDir((dir) => {
    const watcher = createBoxWatcher({
      box: { lanDevices: async () => [] } as unknown as BoxService,
      log: createBoxConnectionLog(`${dir}/l.jsonl`),
      known: createBoxKnownStore(`${dir}/k.json`),
      guests: createBoxGuestsStore(`${dir}/g.json`),
      intervalMs: 1_000_000,
    })
    watcher.start()
    watcher.stop()
  })
})

test('removeFromHome : MAC fausse, liste pas prête, absent, puis retiré (l’appareil devient un invité, connecté s’il l’est)', async () => {
  await withTempDir(async (dir) => {
    const { state, log, known, watcher } = setup(dir)
    assert.equal(watcher.removeFromHome(3), 'invalid')
    assert.equal(watcher.removeFromHome('AA:BB:CC:DD:EE:01'), 'not-ready')
    // liste de départ déjà sur le disque, avant toute lecture
    known.init([{ mac: 'AA:BB:CC:DD:EE:01', name: 'Appareil 1', ip: null }])
    assert.equal(watcher.removeFromHome('AA:BB:CC:DD:EE:02'), 'absent')
    assert.equal(watcher.removeFromHome('aa-bb-cc-dd-ee-01'), 'removed')
    assert.deepEqual(watcher.homeList(), [])
    assert.equal(state.devices.length, 0)
    assert.deepEqual(log.recent(10), [])
  })
  await withTempDir(async (dir) => {
    const { state, log, watcher } = setup(dir)
    state.devices = [device(1), device(2)]
    await watcher.poll()
    state.devices = [device(1), device(2), device(3)]
    await watcher.poll()
    assert.equal(watcher.removeFromHome('AA:BB:CC:DD:EE:01'), 'removed')
    await watcher.poll()
    assert.deepEqual(watcher.guestList().map((guest) => guest.mac).sort(), ['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:03'])
    assert.deepEqual(log.recent(10).map((entry) => entry.mac), ['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:03'])
  })
})
