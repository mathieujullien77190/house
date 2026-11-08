import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import type { KasaClient, PlugInfo } from '../lib/kasaClient.ts'
import { withTempDir } from '../testing/helpers.ts'
import { createPlugService, type MotionSource } from './plugService.ts'

const INFO: PlugInfo = { alias: 'chauffage', model: 'HS100', on: true, rssi: -60, onTime: 10, timerSeconds: null }

/** Une fausse prise : son état, et la liste de ce qu'on lui a demandé. */
const fakePlug = () => {
  const state = { info: { ...INFO }, calls: [] as string[], infoCalls: 0, failSet: false }
  const client = {
    info: async () => {
      state.infoCalls += 1
      return { ...state.info }
    },
    set: async (on: boolean) => {
      if (state.failSet) throw new Error('prise injoignable')
      state.calls.push(`set ${on}`)
      state.info.on = on
    },
    startTimer: async (seconds: number) => {
      state.calls.push(`timer ${seconds}`)
      state.info.on = true
    },
  } as unknown as KasaClient
  return { client, state }
}

/** Un faux détecteur : on lui donne ce qu'il voit au prochain tour (ou une erreur). */
const fakeMotion = () => {
  const control: { next: (boolean | null) | Error; wait: Promise<void> | null } = { next: null, wait: null }
  const motion: MotionSource = {
    presence: async () => {
      if (control.wait) await control.wait
      if (control.next instanceof Error) throw control.next
      return control.next
    },
  }
  return { motion, control }
}

const flush = () => new Promise<void>((done) => setImmediate(done))

const clock = (t: TestContext) => t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1_000_000 })

test('sans garde : l’état se garde 2 secondes, allumer ne demande pas le détecteur', async (t) => {
  clock(t)
  const { client, state } = fakePlug()
  const plug = createPlugService(client)
  assert.equal(plug.canWatchMotion, false)
  assert.deepEqual(await plug.get(), { ...INFO, offOnMotion: false })
  await plug.get()
  assert.equal(state.infoCalls, 1)
  t.mock.timers.tick(2000)
  await plug.get()
  assert.equal(state.infoCalls, 2)

  const off = await plug.set(false)
  assert.equal(off.on, false)
  const on = await plug.startTimer(5, true)
  assert.deepEqual(state.calls, ['set false', 'timer 300'])
  assert.deepEqual(on, { ...INFO, offOnMotion: false })
  // allumer pour de bon avec l'option : sans pont Hue, elle ne s'arme pas
  assert.equal((await plug.set(true, true)).offOnMotion, false)
})

test('une commande qui échoue n’arme rien', async (t) => {
  clock(t)
  const { client, state } = fakePlug()
  const { motion } = fakeMotion()
  const plug = createPlugService(client, { motion, file: '' })
  state.failSet = true
  await assert.rejects(() => plug.set(true, true), /injoignable/)
  assert.equal((await plug.get()).offOnMotion, false)
})

test('éteindre au mouvement : le front montant éteint la prise, l’option se garde dans un fichier', async (t) => {
  await withTempDir(async (dir) => {
    clock(t)
    const file = join(dir, 'sous', 'guard.json')
    const { client, state } = fakePlug()
    const { motion, control } = fakeMotion()
    const plug = createPlugService(client, { motion, file })
    assert.equal(plug.canWatchMotion, true)

    // sans option armée, un tour ne fait rien
    t.mock.timers.tick(3000)
    await flush()
    assert.equal(state.infoCalls, 0)

    // un mouvement déjà en cours à l'armement ne compte pas
    control.next = true
    assert.equal((await plug.startTimer(15, true)).offOnMotion, true)
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { offOnMotion: true })
    t.mock.timers.tick(3000)
    await flush()
    assert.equal(state.info.on, true)

    // le détecteur ne dit rien : l'état précédent est gardé
    control.next = null
    t.mock.timers.tick(3000)
    await flush()
    // plus de mouvement, puis un mouvement : la prise s'éteint et l'option s'efface
    control.next = false
    t.mock.timers.tick(3000)
    await flush()
    control.next = true
    t.mock.timers.tick(3000)
    await flush()
    assert.equal(state.info.on, false)
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { offOnMotion: false })
    assert.equal((await plug.get()).offOnMotion, false)

    // une panne du détecteur ne casse rien : on réessaie au tour suivant
    await plug.set(true, true)
    control.next = new Error('pont injoignable')
    t.mock.timers.tick(3000)
    await flush()
    assert.equal((await plug.get()).offOnMotion, true)
  })
})

test('la prise éteinte autrement efface l’option ; un tour n’en attend pas un autre', async (t) => {
  await withTempDir(async (dir) => {
    clock(t)
    const file = join(dir, 'guard.json')
    const { client, state } = fakePlug()
    const { motion, control } = fakeMotion()
    const plug = createPlugService(client, { motion, file })
    await plug.startTimer(15, true)

    // le détecteur répond lentement : le deuxième tour est ignoré
    let release = () => {}
    control.wait = new Promise<void>((done) => (release = done))
    control.next = false
    const before = state.infoCalls
    t.mock.timers.tick(3000)
    await flush()
    t.mock.timers.tick(3000)
    await flush()
    assert.equal(state.infoCalls, before + 1)
    release()
    control.wait = null
    await flush()

    // quelqu'un éteint la prise à la main
    state.info.on = false
    t.mock.timers.tick(3000)
    await flush()
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { offOnMotion: false })
    // désarmer une option déjà désarmée n'écrit rien de plus
    await plug.set(false)
    assert.equal((await plug.get()).offOnMotion, false)
  })
})

test('l’option armée est relue au démarrage ; un fichier illisible ou absent donne faux', async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, 'guard.json')
    const { client } = fakePlug()
    const { motion } = fakeMotion()
    assert.equal((await createPlugService(client, { motion, file }).get()).offOnMotion, false)
    writeFileSync(file, 'pas du json')
    assert.equal((await createPlugService(client, { motion, file }).get()).offOnMotion, false)
    writeFileSync(file, JSON.stringify({ offOnMotion: true }))
    const armed = createPlugService(client, { motion, file })
    assert.equal((await armed.get()).offOnMotion, true)
  })
})

test('si le fichier de l’option ne s’écrit pas, elle marche quand même en mémoire', async () => {
  await withTempDir(async (dir) => {
    const blocker = join(dir, 'fichier')
    writeFileSync(blocker, 'x')
    const { client } = fakePlug()
    const { motion } = fakeMotion()
    const plug = createPlugService(client, { motion, file: join(blocker, 'sous', 'guard.json') })
    assert.equal((await plug.startTimer(5, true)).offOnMotion, true)
  })
})

test('le garde avec un détecteur mais sans fichier : l’option reste en mémoire', async () => {
  const { client } = fakePlug()
  const { motion } = fakeMotion()
  const plug = createPlugService(client, { motion, file: '' })
  assert.equal((await plug.set(true, true)).offOnMotion, true)
  assert.equal((await plug.set(false)).offOnMotion, false)
  // avec le détecteur mais sans le surveiller : le minuteur de l'intervalle est détaché du processus (unref)
})
