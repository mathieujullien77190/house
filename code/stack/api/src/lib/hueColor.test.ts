import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hueColor } from './hueColor.ts'

test('une lampe sans mode de couleur : null', () => {
  assert.equal(hueColor({}), null)
  assert.equal(hueColor({ colormode: 'xy' }), null)
  assert.equal(hueColor({ colormode: 'ct' }), null)
  assert.equal(hueColor({ colormode: 'hs', hue: 1 }), null)
  assert.equal(hueColor({ colormode: 'autre', xy: [0.3, 0.3] }), null)
})

test('xy : le rouge, le vert et le bleu du pont, et un point invalide', () => {
  assert.match(hueColor({ colormode: 'xy', xy: [0.7, 0.3] }) ?? '', /^#ff[0-9a-f]{4}$/)
  assert.match(hueColor({ colormode: 'xy', xy: [0.17, 0.7] }) ?? '', /^#[0-9a-f]{6}$/)
  assert.match(hueColor({ colormode: 'xy', xy: [0.15, 0.06] }) ?? '', /^#[0-9a-f]{6}$/)
  assert.equal(hueColor({ colormode: 'xy', xy: [0.3, 0] }), null)
})

test('ct : du chaud au froid, bornes comprises', () => {
  const colors = [600, 400, 153, 100].map((ct) => hueColor({ colormode: 'ct', ct }))
  for (const color of colors) assert.match(color ?? '', /^#[0-9a-f]{6}$/)
  assert.equal(new Set(colors).size, 4)
  assert.equal(hueColor({ colormode: 'ct', ct: 0 }), null)
  assert.equal(hueColor({ colormode: 'ct', ct: 1 }), hueColor({ colormode: 'ct', ct: 25 }))
})

test('hs : les six secteurs de la teinte, saturation bornée', () => {
  const sectors = [0, 1, 2, 3, 4, 5].map((index) => hueColor({ colormode: 'hs', hue: Math.round((index * 65535) / 6) + 100, sat: 254 }))
  assert.equal(new Set(sectors).size, 6)
  assert.equal(hueColor({ colormode: 'hs', hue: 0, sat: 254 }), '#ff0000')
  assert.equal(hueColor({ colormode: 'hs', hue: 65535, sat: 0 }), '#ffffff')
  assert.equal(hueColor({ colormode: 'hs', hue: 0, sat: 999 }), '#ff0000')
})
