// Les tests du détecteur : node --test (npm test). Pas de dépendance.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedShare, createDetector, DEFAULT_CONFIG, isMotionSeconds } from './detector.ts'

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

test('un événement s’ouvre quand le mouvement a duré minSeconds, depuis son début, et se ferme après endSeconds de calme', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, minSeconds: 2, endSeconds: 5 })
  assert.equal(detector.push(0.1, 10), null)
  assert.equal(detector.push(0.1, 11), null)
  assert.equal(detector.isOpen(), false)
  // 2 s de mouvement : l'événement s'ouvre, daté du début du mouvement
  assert.deepEqual(detector.push(0.1, 12), { type: 'start', at: 10, score: 0.1 })
  assert.equal(detector.isOpen(), true)
  assert.equal(detector.push(0.2, 13), null)
  assert.equal(detector.push(0, 15), null)
  assert.deepEqual(detector.push(0, 19), { type: 'end', at: 19, startedAt: 10, durationSeconds: 3, peak: 0.2 })
  assert.equal(detector.isOpen(), false)
})

test('un mouvement plus court que minSeconds n’ouvre rien', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, minSeconds: 3 })
  assert.equal(detector.push(0.1, 0), null)
  assert.equal(detector.push(0.1, 1), null)
  // le calme dure plus que GAP_SECONDS : le mouvement est oublié
  assert.equal(detector.push(0, 3), null)
  assert.equal(detector.push(0.1, 4), null)
  assert.equal(detector.push(0.1, 6), null)
  assert.equal(detector.isOpen(), false)
  // un nouveau mouvement repart de zéro : il lui faut ses propres 3 s
  assert.deepEqual(detector.push(0.1, 7), { type: 'start', at: 4, score: 0.1 })
})

test('un calme très court au milieu d’un mouvement ne le casse pas', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, minSeconds: 2 })
  assert.equal(detector.push(0.1, 0), null)
  assert.equal(detector.push(0, 0.6), null)
  assert.deepEqual(detector.push(0.1, 2), { type: 'start', at: 0, score: 0.1 })
})

test('minSeconds à 0 : le premier mouvement ouvre l’événement', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, minSeconds: 0 })
  assert.deepEqual(detector.push(0.1, 5), { type: 'start', at: 5, score: 0.1 })
})

test('isMotionSeconds n’accepte que les entiers de 0 à 30', () => {
  assert.equal(isMotionSeconds(0), true)
  assert.equal(isMotionSeconds(30), true)
  assert.equal(isMotionSeconds(31), false)
  assert.equal(isMotionSeconds(-1), false)
  assert.equal(isMotionSeconds(1.5), false)
})

test('un changement de lumière global n’est pas un mouvement', () => {
  const detector = createDetector({ ...DEFAULT_CONFIG, minSeconds: 0, lightChangeThreshold: 0.6 })
  assert.equal(detector.push(0.9, 0), null)
  assert.equal(detector.isOpen(), false)
})

test('changedShare : le masque limite la zone, et une zone vide ou de mauvaise taille ne vaut rien', () => {
  const still = frame(100)
  const moved = frame(100)
  for (let i = 0; i < 100; i += 1) if (i % 10 < 5) moved[i] = 200
  const mask = new Uint8Array(100)
  for (let i = 0; i < 100; i += 1) mask[i] = i % 10 >= 4 ? 1 : 0
  assert.equal(changedShare(still, moved, 25, mask), 1 / 6)
  assert.equal(changedShare(still, moved, 25, new Uint8Array(100)), 0)
  assert.equal(changedShare(still, moved, 25, new Uint8Array(50)), 0)
})
