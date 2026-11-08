// Tests de l'origine devinée d'un changement de lampe.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyLight, classifyScene, deviceVerdict, scheduleAt, type Schedule, type Trigger } from './hueOrigin.ts'

const rule: Schedule = { name: 'Eteind tout', days: ['monday'], secondOfDay: 36000, text: 'lundi à 10:00' }
const trigger = (kind: Trigger['kind'], at: number, name = 'N', id = 'owner'): Trigger => ({ at, kind, name, id })

test('scheduleAt : le bon jour et la fenêtre de -2 à +20 secondes', () => {
  assert.equal(scheduleAt([rule], 'monday', 36000), rule)
  assert.equal(scheduleAt([rule], 'monday', 35998), rule)
  assert.equal(scheduleAt([rule], 'monday', 36020), rule)
  assert.equal(scheduleAt([rule], 'monday', 35997), null)
  assert.equal(scheduleAt([rule], 'monday', 36021), null)
  assert.equal(scheduleAt([rule], 'tuesday', 36000), null)
})

test('classifyLight : un interrupteur juste avant', () => {
  const verdict = classifyLight({ at: 10_000, owner: 'o' }, [trigger('button', 9000, 'Dimmer')])
  assert.equal(verdict.origin, 'switch')
  assert.match(verdict.detail, /Dimmer/)
})

test('classifyLight : un détecteur de mouvement', () => {
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, [trigger('motion', 0, 'Couloir')]).origin, 'sensor')
  assert.equal(classifyLight({ at: 20_000, owner: 'o' }, [trigger('motion', 0)]).origin, 'unknown')
})

test('classifyLight : une scène lancée par un interrupteur, une règle, ou sans cause', () => {
  const scene = trigger('scene', 9000, 'Relax')
  const byButton = classifyLight({ at: 10_000, owner: 'o' }, [scene, trigger('button', 8000, 'Dimmer')])
  assert.equal(byButton.origin, 'switch')
  assert.match(byButton.detail, /scène « Relax »/)
  const byRule = classifyLight({ at: 10_000, owner: 'o' }, [scene], rule)
  assert.equal(byRule.origin, 'rule')
  assert.match(byRule.detail, /Eteind tout.*Relax/)
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, [scene]).origin, 'scene')
})

test('classifyLight : une règle à heure fixe, une reconnexion, ou inconnue', () => {
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, [], rule).origin, 'rule')
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, [trigger('connectivity', 5000, 'Lampe', 'o')]).origin, 'power')
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, [trigger('connectivity', 5000, 'Lampe', 'autre')]).origin, 'unknown')
  assert.equal(classifyLight({ at: 10_000, owner: 'o' }, []).origin, 'unknown')
})

test('classifyScene : interrupteur, règle ou source inconnue', () => {
  assert.equal(classifyScene(10_000, 'Relax', [trigger('button', 9000)]).origin, 'switch')
  assert.equal(classifyScene(10_000, 'Relax', [], rule).origin, 'rule')
  const unknown = classifyScene(10_000, 'Relax', [])
  assert.equal(unknown.origin, 'unknown')
  assert.match(unknown.detail, /Relax/)
})

test('deviceVerdict : l\'appareil seul', () => {
  assert.deepEqual(deviceVerdict('appui'), { origin: 'device', detail: 'appui' })
})

test('classifyLight : plusieurs appuis, le plus récent l emporte', () => {
  const verdict = classifyLight({ at: 10_000, owner: 'o' }, [trigger('button', 8000, 'Ancien'), trigger('button', 9500, 'Récent')])
  assert.match(verdict.detail, /Récent/)
})
