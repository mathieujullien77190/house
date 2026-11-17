import assert from 'node:assert/strict'
import { test } from 'node:test'
import { columnOf, createTemperatureLog, createTemperatureTable, parseAcTemperatures, parseSensorTemperatures, readTemperatures, weatherTemperatureUrl } from './temperatureLog.ts'
import { testContext } from './testing.ts'
import type { ApiTarget } from './power.ts'

test('parseAcTemperatures : les unités qui répondent et ont une température', () => {
  const data = { units: [{ name: 'salon', reachable: true, roomTemp: 20.5 }, { name: 'matou', reachable: false, roomTemp: 18 }, { name: 'x', reachable: true, roomTemp: null }, null] }
  assert.deepEqual(parseAcTemperatures(data), [{ name: 'Clim salon', celsius: 20.5 }])
  assert.equal(parseAcTemperatures({}), null)
  assert.equal(parseAcTemperatures(null), null)
})

test('parseSensorTemperatures : les détecteurs avec une température', () => {
  assert.deepEqual(parseSensorTemperatures([{ name: 'motion exterieur', temperature: 7.2 }, { name: 'sans', temperature: null }, null]), [{ name: 'Hue motion exterieur', celsius: 7.2 }])
  assert.equal(parseSensorTemperatures({}), null)
})

test('weatherTemperatureUrl : la position et la température courante', () => {
  assert.match(weatherTemperatureUrl(48.5, 2.6), /latitude=48\.5&longitude=2\.6&current=temperature_2m/)
})

test('sans API, seule la météo est relevée, une fois par heure', async () => {
  const ctx = testContext(() => Response.json({ current: { temperature_2m: 6.5 } }))
  ctx.time.set(Date.parse('2026-11-17T10:20:00Z'))
  const log = createTemperatureLog(ctx, () => null)
  assert.equal(await log.sample(), 1)
  assert.equal(await log.sample(), 0)
  const points = readTemperatures(ctx.db, Math.floor(ctx.now() / 1000), 10)
  assert.deepEqual(points.map((p) => [p.name, p.celsius]), [['meteo', 6.5]])
})

test('une source qui échoue est sautée et journalisée', async () => {
  const ctx = testContext(() => new Response('', { status: 500 }))
  ctx.time.set(Date.parse('2026-11-17T10:20:00Z'))
  const target: ApiTarget = { url: 'https://127.0.0.1:1', key: 'k', ca: '', servername: 'api' }
  const log = createTemperatureLog(ctx, () => target)
  assert.equal(await log.sample(), 0)
  assert.ok(ctx.logs.some((line) => line.includes('Températures : météo sautée')))
  assert.ok(ctx.logs.some((line) => line.includes('pompes à chaleur sautée')))
})

test('readTemperatures ne rend que les derniers jours', () => {
  const ctx = testContext()
  ctx.db.exec('ALTER TABLE temperature_log ADD COLUMN meteo REAL')
  ctx.db.exec('INSERT INTO temperature_log (taken_at, meteo) VALUES (1000, 1), (900000, 2)')
  assert.deepEqual(readTemperatures(ctx.db, 900000, 1).map((p) => p.celsius), [2])
})

test('columnOf : sans accents, en minuscules, en lettres et chiffres', () => {
  assert.equal(columnOf('Météo'), 'meteo')
  assert.equal(columnOf('Clim Chambre matou'), 'clim_chambre_matou')
  assert.equal(columnOf(' Hue motion--exterieur '), 'hue_motion_exterieur')
})

test('une ligne par heure : chaque source a sa colonne, ajoutée au premier relevé', async () => {
  const ctx = testContext(() => Response.json({ current: { temperature_2m: 6.5 } }))
  ctx.time.set(Date.parse('2026-11-17T10:20:00Z'))
  const log = createTemperatureLog(ctx, () => null)
  await log.sample()
  ctx.time.set(Date.parse('2026-11-17T11:05:00Z'))
  await log.sample()
  const rows = ctx.db.prepare('SELECT * FROM temperature_log ORDER BY taken_at').all() as { meteo: number }[]
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map((row) => row.meteo), [6.5, 6.5])
})

test('l’ancienne table (une ligne par source) est gardée en _long et reprise en une ligne par heure', () => {
  const ctx = testContext()
  ctx.db.exec('DROP TABLE temperature_log')
  ctx.db.exec('CREATE TABLE temperature_log (taken_at INTEGER NOT NULL, name TEXT NOT NULL, celsius REAL NOT NULL, PRIMARY KEY (taken_at, name))')
  ctx.db.exec("INSERT INTO temperature_log VALUES (3600, 'Météo', 5), (3600, 'Clim Salon', 21)")
  createTemperatureTable(ctx.db)
  assert.deepEqual(ctx.db.prepare('SELECT taken_at, meteo, clim_salon FROM temperature_log').all().map((row) => ({ ...row })), [{ taken_at: 3600, meteo: 5, clim_salon: 21 }])
  assert.equal((ctx.db.prepare('SELECT COUNT(*) AS n FROM temperature_log_long').get() as { n: number }).n, 2)
})
