// Tests des caméras liées : node --test (npm test).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mirrorsOf, wantsEvent } from './linked.ts'

const linked = ['perruche-fond', 'perruche-porte']

test('mirrorsOf rend les autres du groupe, rien pour une caméra hors groupe', () => {
  assert.deepEqual(mirrorsOf('perruche-fond', linked), ['perruche-porte'])
  assert.deepEqual(mirrorsOf('garage', linked), [])
  assert.deepEqual(mirrorsOf('perruche-fond', []), [])
})

test('un mouvement sur une caméra ouvre aussi la caméra liée', () => {
  const active = new Set(['perruche-fond'])
  assert.equal(wantsEvent('perruche-fond', active, linked, new Map()), true)
  assert.equal(wantsEvent('perruche-porte', active, linked, new Map()), true)
  assert.equal(wantsEvent('garage', active, linked, new Map()), false)
})

test('plus aucun mouvement : plus d’événement', () => {
  assert.equal(wantsEvent('perruche-porte', new Set(), linked, new Map()), false)
})

test('une caméra dont la détection est éteinte ne reçoit pas d’événement lié, mais garde le sien', () => {
  const detecting = new Map([['perruche-porte', false]])
  assert.equal(wantsEvent('perruche-porte', new Set(['perruche-fond']), linked, detecting), false)
  assert.equal(wantsEvent('perruche-porte', new Set(['perruche-porte']), linked, detecting), true)
})

test('sans groupe lié, chaque caméra reste seule', () => {
  assert.equal(wantsEvent('perruche-porte', new Set(['perruche-fond']), [], new Map()), false)
})

test('mouvement sur les deux : chacune reste ouverte tant que l’une des deux voit du mouvement', () => {
  const both = new Set(['perruche-fond', 'perruche-porte'])
  assert.equal(wantsEvent('perruche-fond', both, linked, new Map()), true)
  assert.equal(wantsEvent('perruche-porte', both, linked, new Map()), true)
  // La première finit : la seconde garde les deux ouvertes (le clip de la première couvre aussi la fin de la seconde).
  const onlyPorte = new Set(['perruche-porte'])
  assert.equal(wantsEvent('perruche-fond', onlyPorte, linked, new Map()), true)
  assert.equal(wantsEvent('perruche-porte', onlyPorte, linked, new Map()), true)
})
