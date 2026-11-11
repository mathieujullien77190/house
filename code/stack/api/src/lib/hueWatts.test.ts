import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimateWatts, STANDBY_WATTS } from './hueWatts.ts'

test('un modèle inconnu ou absent : null', () => {
  assert.equal(estimateWatts('XXX', true, 254, true), null)
  assert.equal(estimateWatts(undefined, true, 254, true), null)
})

test('injoignable : 0 W, même allumée', () => {
  assert.equal(estimateWatts('LTW010', true, 254, false), 0)
})

test('éteinte et joignable : la veille', () => {
  assert.equal(estimateWatts('LTW010', false, null, true), STANDBY_WATTS)
})

test('allumée : la puissance maximale à pleine luminosité, luminosité absente comprise', () => {
  assert.equal(estimateWatts('LTG002', true, 254, true), 5)
  assert.equal(estimateWatts('LTW010', true, null, true), 9)
  assert.equal(estimateWatts('LST002', true, 254, true), 20)
  assert.equal(estimateWatts('LCT015', true, 254, true), 9)
  assert.equal(estimateWatts('LTW012', true, 254, true), 4)
})

test('allumée à mi-luminosité : courbe au carré, arrondie au dixième', () => {
  assert.equal(estimateWatts('LTW010', true, 127, true), 2.6)
  assert.equal(estimateWatts('LTG002', true, 100, true), 1.1)
})
