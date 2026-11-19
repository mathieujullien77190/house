// Les tests de la recherche des yeux : la partie pure (findEyes), sans ffmpeg ni réseau.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_EYES, findEyes } from './eyes.ts'

const W = 40
const H = 30
const image = (value = 20): Uint8Array => new Uint8Array(W * H).fill(value)
/** Allume un carré de `size` pixels de côté dont le coin haut gauche est (x, y). */
const light = (frame: Uint8Array, x: number, y: number, size = 2, value = 255): Uint8Array => {
  for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) frame[(y + dy) * W + x + dx] = value
  return frame
}

test('un reflet apparu en une image : un cadre normalisé, avec sa marge', () => {
  const boxes = findEyes(light(image(), 10, 10), image(), W)
  assert.equal(boxes.length, 1)
  const margin = DEFAULT_EYES.margin
  assert.deepEqual(boxes[0], [
    [(10 - margin) / W, (10 - margin) / H],
    [(12 + margin) / W, (10 - margin) / H],
    [(12 + margin) / W, (12 + margin) / H],
    [(10 - margin) / W, (12 + margin) / H],
  ])
})

test('le cadre ne sort pas de l’image', () => {
  const [box] = findEyes(light(image(), 0, 0), image(), W)
  assert.deepEqual([box[0], box[2]], [[0, 0], [(2 + DEFAULT_EYES.margin) / W, (2 + DEFAULT_EYES.margin) / H]])
  const [corner] = findEyes(light(image(), W - 2, H - 2), image(), W)
  assert.deepEqual(corner[2], [1, 1])
})

test('rien si le reflet était déjà là (même un peu décalé), s’il n’est pas assez clair ou s’il n’y a pas d’écart', () => {
  const before = light(image(), 10, 10)
  assert.deepEqual(findEyes(light(image(), 11, 11), before, W), [])
  assert.deepEqual(findEyes(light(image(), 10, 10, 2, 200), image(), W), [])
  assert.deepEqual(findEyes(image(), image(), W), [])
  // un reflet bien plus loin que le voisinage comparé compte comme nouveau
  assert.equal(findEyes(light(image(), 20, 10), before, W).length, 1)
})

test('deux reflets séparés font deux cadres, deux pixels proches un seul', () => {
  assert.equal(findEyes(light(light(image(), 5, 5), 25, 20), image(), W).length, 2)
  const close = image()
  close[10 * W + 10] = 255
  close[10 * W + 12] = 255
  assert.equal(findEyes(close, image(), W).length, 1)
})

test('une tache trop petite (un pixel) ou trop grande (le corps du chat) est ignorée', () => {
  const single = image()
  single[5 * W + 5] = 255
  assert.deepEqual(findEyes(single, image(), W), [])
  assert.deepEqual(findEyes(light(image(), 5, 5, 14), image(), W), [])
})

test('la zone surveillée : un reflet hors zone est ignoré', () => {
  const mask = new Uint8Array(W * H)
  for (let y = 0; y < H; y += 1) for (let x = 0; x < 20; x += 1) mask[y * W + x] = 1
  assert.equal(findEyes(light(image(), 5, 5), image(), W, mask).length, 1)
  assert.deepEqual(findEyes(light(image(), 30, 5), image(), W, mask), [])
})

test('des entrées incohérentes ne donnent rien', () => {
  assert.deepEqual(findEyes(new Uint8Array(0), new Uint8Array(0), W), [])
  assert.deepEqual(findEyes(image(), new Uint8Array(10), W), [])
  assert.deepEqual(findEyes(image(), image(), 0), [])
  assert.deepEqual(findEyes(light(image(), 5, 5), image(), W, new Uint8Array(10)), [])
})
