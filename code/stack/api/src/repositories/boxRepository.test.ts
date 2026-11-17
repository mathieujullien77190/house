import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDatabase } from '../testing/helpers.ts'
import { ACTIVE_WITHIN_SECONDS, createBoxRepository, normalizeMac } from './boxRepository.ts'

const MAC = 'AA:BB:CC:DD:EE:01'
const NOW = 1_000_000

/** Une base avec la maison (la TV) ; l'invité et ses connexions si demandé. */
const setup = (withGuest = true) => {
  const db = memoryDatabase()
  db.run("INSERT INTO box_known (mac, name, ip) VALUES ('AA:BB:CC:DD:EE:02', 'TV', '192.168.1.20')")
  if (withGuest) {
    db.run("INSERT INTO box_guests VALUES (?, 'Tel', '192.168.1.30', 'smartphone', 'Apple', ?, ?)", MAC, NOW - 500, NOW - 10)
    db.run("INSERT INTO box_guests VALUES ('AA:BB:CC:DD:EE:03', 'Vieux', NULL, NULL, NULL, 1, ?)", NOW - ACTIVE_WITHIN_SECONDS - 1)
    db.run("INSERT INTO box_connections (happened_at, event, mac, name, ip, type, vendor) VALUES (?, 'connect', ?, 'Tel', '192.168.1.30', 'smartphone', 'Apple')", NOW - 500, MAC)
    db.run("INSERT INTO box_connections (happened_at, event, mac, name) VALUES (?, 'disconnect', ?, 'Tel')", NOW - 100, MAC)
  }
  return { db, repo: createBoxRepository(db, () => NOW * 1000) }
}

test('normalizeMac : majuscules séparées par deux-points, ou null', () => {
  assert.equal(normalizeMac('aa-bb-cc-dd-ee-01'), MAC)
  assert.equal(normalizeMac(' aabbccddee01 '), MAC)
  assert.equal(normalizeMac('pas une mac'), null)
  assert.equal(normalizeMac(5), null)
})

test('la maison, les invités (actifs ou non) et les dernières connexions se lisent dans les tables', () => {
  const { repo } = setup()
  assert.deepEqual(repo.homeList().map((device) => ({ ...device })), [{ mac: 'AA:BB:CC:DD:EE:02', name: 'TV', ip: '192.168.1.20' }])
  assert.deepEqual(
    repo.guestList().map((guest) => [guest.mac, guest.active, guest.firstSeen, guest.lastSeen]),
    [
      [MAC, true, NOW - 500, NOW - 10],
      ['AA:BB:CC:DD:EE:03', false, 1, NOW - ACTIVE_WITHIN_SECONDS - 1],
    ],
  )
  assert.deepEqual(
    repo.recent(10).map((entry) => [entry.at, entry.event]),
    [
      [NOW - 100, 'disconnect'],
      [NOW - 500, 'connect'],
    ],
  )
  assert.equal(repo.recent(1).length, 1)
})

test('l’horloge par défaut est celle de la machine', () => {
  const db = memoryDatabase()
  db.run("INSERT INTO box_guests VALUES (?, 'Tel', NULL, NULL, NULL, 1, ?)", MAC, Math.floor(Date.now() / 1000))
  assert.equal(createBoxRepository(db).guestList()[0].active, true)
})

test('ajouter à la maison : un invité devient connu, son historique est effacé', () => {
  const { db, repo } = setup()
  assert.deepEqual({ ...(repo.addToHome(MAC.toLowerCase()) as object) }, { mac: MAC, name: 'Tel', ip: '192.168.1.30' })
  assert.equal(db.get('SELECT 1 FROM box_guests WHERE mac = ?', MAC), undefined)
  assert.equal(db.all('SELECT 1 FROM box_connections WHERE mac = ?', MAC).length, 0)
  assert.equal(repo.homeList().length, 2)
  // déjà dans la maison : rien n'est dupliqué
  repo.addToHome(MAC)
  assert.equal(repo.homeList().length, 2)
})

test('ajouter à la maison : le nom vivant de la box prime, puis l’historique, puis la MAC elle-même', () => {
  const live = setup()
  assert.deepEqual({ ...(live.repo.addToHome(MAC, { name: 'Pixel', ip: null }) as object) }, { mac: MAC, name: 'Pixel', ip: '192.168.1.30' })

  const logged = setup(false)
  logged.db.run("INSERT INTO box_connections (happened_at, event, mac, name, ip) VALUES (5, 'connect', ?, 'Ancien', '192.168.1.40')", MAC)
  assert.deepEqual({ ...(logged.repo.addToHome(MAC) as object) }, { mac: MAC, name: 'Ancien', ip: '192.168.1.40' })

  const unknown = setup(false)
  assert.deepEqual({ ...(unknown.repo.addToHome('AA:BB:CC:DD:EE:09') as object) }, { mac: 'AA:BB:CC:DD:EE:09', name: 'AA:BB:CC:DD:EE:09', ip: null })
})

test('ajouter à la maison : MAC fausse, ou maison encore vide', () => {
  assert.equal(setup().repo.addToHome('x'), 'invalid')
  const empty = createBoxRepository(memoryDatabase())
  assert.equal(empty.addToHome(MAC), 'not-ready')
})

test('retirer de la maison : retiré, absent ou MAC fausse', () => {
  const { repo } = setup()
  assert.equal(repo.removeFromHome('aa:bb:cc:dd:ee:02'), 'removed')
  assert.equal(repo.removeFromHome('AA:BB:CC:DD:EE:02'), 'absent')
  assert.equal(repo.removeFromHome('x'), 'invalid')
  assert.deepEqual(repo.homeList(), [])
})
