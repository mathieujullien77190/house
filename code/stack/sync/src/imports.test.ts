// Tests des imports périodiques : plan de la maison et visites de la page invité.
import assert from 'node:assert/strict'
import { appendFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { createImports } from './imports.ts'
import { testContext } from './testing.ts'

const PLAN = { version: 2, trees: [{ id: 't1', x: 1, y: 2, r: 3 }] }
const visit = (at: number) => JSON.stringify({ at, kind: 'page', ip: '1.2.3.4', origin: 'maison', device: 'x', key: 'avec clé' })

test('syncPlan : importe le plan quand il change, se tait sinon', async () => {
  const ctx = testContext()
  const imports = createImports(ctx)
  writeFileSync(ctx.config.planFile, JSON.stringify(PLAN))
  await imports.syncPlan()
  assert.deepEqual(ctx.logs, ['Plan de la maison : 1 élément(s) enregistré(s)'])
  await imports.syncPlan()
  assert.equal(ctx.logs.length, 1)
  writeFileSync(ctx.config.planFile, '{abîmé')
  await imports.syncPlan()
  assert.equal(ctx.logs.length, 1)
})

test('syncPlan : une erreur de la base reste dans le journal', async () => {
  const ctx = testContext()
  ctx.db.exec('DROP TABLE plan')
  const imports = createImports(ctx)
  writeFileSync(ctx.config.planFile, JSON.stringify(PLAN))
  // La table du plan n'existe pas encore : l'import échoue, le service continue.
  await imports.syncPlan()
  assert.match(ctx.logs[0] ?? '', /^Plan de la maison : /)
})

test('syncGuestVisits : importe les visites, et purge les vieilles une fois par jour', async () => {
  const ctx = testContext()
  const imports = createImports(ctx)
  const now = Math.floor(ctx.now() / 1000)
  writeFileSync(ctx.config.guestVisitsFile, `${visit(now - 400 * 86400)}\n${visit(now)}\n`)
  await imports.syncGuestVisits()
  assert.deepEqual(ctx.logs, ['Page invité : 2 visite(s) notée(s)', 'Page invité : 1 visite(s) de plus de 365 jours supprimée(s)'])
  // Le même jour : on importe, sans purger.
  appendFileSync(ctx.config.guestVisitsFile, `${visit(now - 500 * 86400)}\n`)
  await imports.syncGuestVisits()
  assert.equal(ctx.logs.length, 3)
  // Un jour plus tard : on purge (et la vieille visite part).
  ctx.time.advance(86_400_001)
  await imports.syncGuestVisits()
  assert.equal(ctx.logs.length, 4)
  // Encore un jour plus tard, rien à supprimer : pas de ligne.
  ctx.time.advance(86_400_001)
  await imports.syncGuestVisits()
  assert.equal(ctx.logs.length, 4)
})

test('syncGuestVisits : une erreur de la base reste dans le journal', async () => {
  const ctx = testContext()
  ctx.db.exec('DROP TABLE guest_visits')
  const imports = createImports(ctx)
  writeFileSync(ctx.config.guestVisitsFile, `${visit(1)}\n`)
  await imports.syncGuestVisits()
  assert.match(ctx.logs[0] ?? '', /^Visites de la page invité : /)
})

test('syncHeatingLog : importe les activations, se tait quand il n’y a rien de neuf, garde l’erreur dans le journal', async () => {
  const ctx = testContext()
  const imports = createImports(ctx)
  await imports.syncHeatingLog()
  assert.deepEqual(ctx.logs, [])
  writeFileSync(ctx.config.heatingLogFile, `${JSON.stringify({ at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2, note: null, cost: 0.0265 })}\n`)
  await imports.syncHeatingLog()
  assert.deepEqual(ctx.logs, ['Chauffage : 1 activation(s) notée(s)'])
  await imports.syncHeatingLog()
  assert.equal(ctx.logs.length, 1)
  ctx.db.exec('DROP TABLE heating_log')
  appendFileSync(ctx.config.heatingLogFile, `${JSON.stringify({ at: 1_800_000_100, origin: 'manuel', minutes: 5 })}\n`)
  await imports.syncHeatingLog()
  assert.match(ctx.logs[1] ?? '', /^Journal du chauffage : /)
})
