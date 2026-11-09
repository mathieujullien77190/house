// Les tests du détecteur : node --test (npm test). Pas de dépendance.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedShare, createDetector, DEFAULT_CONFIG, RAIN_MIN_NEIGHBOURS } from './detector.ts'

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

/** Une image de 10 x 10 où le carré (x, y, côté) a changé. */
const withSquare = (x: number, y: number, side: number): Uint8Array => {
  const image = frame(100)
  for (let row = y; row < y + side; row += 1) for (let column = x; column < x + side; column += 1) image[row * 10 + column] = 200
  return image
}

test('filtre pluie : un trait fin ou des gouttes isolées ne comptent pas', () => {
  const still = frame(100)
  const line = frame(100)
  for (let row = 0; row < 10; row += 1) line[row * 10 + 5] = 200
  assert.equal(changedShare(still, line, 25, null, 10), 0)
  assert.equal(changedShare(still, line, 25), 0.1)
  const drops = frame(100)
  for (const at of [12, 35, 58, 81]) drops[at] = 200
  assert.equal(changedShare(still, drops, 25, null, 10), 0)
})

test('filtre pluie : une tache garde son cœur (au moins ' + RAIN_MIN_NEIGHBOURS + ' voisins sur 8), pas ses bords', () => {
  const still = frame(100)
  assert.equal(changedShare(still, withSquare(3, 3, 4), 25, null, 10), 4 / 100)
  // toute l'image change : seul l'intérieur compte, les bords de l'image n'ont pas tous leurs voisins
  assert.equal(changedShare(still, frame(200), 25, null, 10), 64 / 100)
})

test('filtre pluie : le masque limite la zone, et une zone vide ne vaut rien', () => {
  const still = frame(100)
  const mask = new Uint8Array(100)
  for (let i = 0; i < 100; i += 1) mask[i] = i % 10 >= 4 ? 1 : 0
  assert.equal(changedShare(still, withSquare(2, 2, 6), 25, mask, 10), 8 / 60)
  assert.equal(changedShare(still, withSquare(2, 2, 6), 25, new Uint8Array(100), 10), 0)
  assert.equal(changedShare(still, withSquare(2, 2, 6), 25, new Uint8Array(50), 10), 0)
})

test('filtre pluie : une image trop basse pour avoir un cœur, ou de tailles différentes, ne donne rien', () => {
  assert.equal(changedShare(frame(100, 20), frame(200, 20), 25, null, 10), 0)
  assert.equal(changedShare(frame(100, 10), frame(100, 20), 25, null, 10), 0)
})
