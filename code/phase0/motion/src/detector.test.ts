// Les tests du détecteur : node --test (npm test). Pas de dépendance.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedShare, createDetector, DEFAULT_CONFIG } from './detector.ts'

const frame = (value: number, size = 100): Uint8Array => new Uint8Array(size).fill(value)

test('changedShare compte les pixels qui changent de plus que le seuil', () => {
  const a = frame(100)
  const b = frame(100)
  for (let i = 0; i < 10; i += 1) b[i] = 200
  assert.equal(changedShare(a, b, 25), 0.1)
  assert.equal(changedShare(a, a, 25), 0)
})

test('changedShare ignore un écart sous le seuil et des tailles différentes', () => {
  assert.equal(changedShare(frame(100), frame(110), 25), 0)
  assert.equal(changedShare(frame(100, 10), frame(100, 20), 25), 0)
})

test('un événement s’ouvre après startFrames images en mouvement et se ferme après endSeconds de calme', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, startFrames: 2, endSeconds: 5 })
  assert.equal(detector.push(0.1, 0), null)
  assert.deepEqual(detector.push(0.1, 1), { type: 'start', at: 1, score: 0.1 })
  assert.equal(detector.isOpen(), true)
  assert.equal(detector.push(0.2, 2), null)
  assert.equal(detector.push(0, 4), null)
  const end = detector.push(0, 8)
  assert.deepEqual(end, { type: 'end', at: 8, startedAt: 1, durationSeconds: 1, peak: 0.2 })
  assert.equal(detector.isOpen(), false)
})

test('un parasite isolé n’ouvre rien', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, startFrames: 2 })
  assert.equal(detector.push(0.1, 0), null)
  assert.equal(detector.push(0, 1), null)
  assert.equal(detector.push(0.1, 2), null)
  assert.equal(detector.isOpen(), false)
})

test('un changement de lumière global n’est pas un mouvement', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, startFrames: 1, lightChangeThreshold: 0.6 })
  assert.equal(detector.push(0.9, 0), null)
  assert.equal(detector.isOpen(), false)
})
