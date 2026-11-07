// Tests de la sensibilité de la détection : node --test (npm test).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_CONFIG } from './detector.ts'
import { detectorForLevel, isSensitivity } from './sensitivity.ts'

test('le niveau 3 ne change rien', () => {
  assert.deepEqual(detectorForLevel(DEFAULT_CONFIG, 3), DEFAULT_CONFIG)
})

test('plus le niveau monte, plus les seuils baissent', () => {
  const levels = [1, 2, 3, 4, 5].map((level) => detectorForLevel(DEFAULT_CONFIG, level))
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(levels[i].pixelThreshold < levels[i - 1].pixelThreshold)
    assert.ok(levels[i].areaThreshold < levels[i - 1].areaThreshold)
  }
})

test('seuls les seuils changent, et l’écart de gris reste au moins 1', () => {
  const sensitive = detectorForLevel({ ...DEFAULT_CONFIG, pixelThreshold: 1 }, 5)
  assert.equal(sensitive.pixelThreshold, 1)
  assert.equal(sensitive.startFrames, DEFAULT_CONFIG.startFrames)
  assert.equal(sensitive.endSeconds, DEFAULT_CONFIG.endSeconds)
})

test('isSensitivity n’accepte que les entiers de 1 à 5', () => {
  assert.equal(isSensitivity(1), true)
  assert.equal(isSensitivity(5), true)
  assert.equal(isSensitivity(0), false)
  assert.equal(isSensitivity(6), false)
  assert.equal(isSensitivity(2.5), false)
})
