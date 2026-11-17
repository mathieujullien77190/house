// Tests de la lecture de la configuration des servos des volets.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { DEFAULT_SERVO_CONFIG, readServoConfig } from './servoConfig.ts'

const write = (content: string) => memoryDoc(content)

test("sans fichier, fichier abîmé ou qui n'est pas un objet : les valeurs par défaut", async () => {
  assert.deepEqual(await readServoConfig(memoryDoc()), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('x{')), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('null')), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('3')), DEFAULT_SERVO_CONFIG)
})

test("l'adresse : nettoyée si http, sinon par défaut", async () => {
  assert.equal((await readServoConfig(write('{"url":"http://esp///"}'))).url, 'http://esp')
  assert.equal((await readServoConfig(write('{"url":"ftp://esp"}'))).url, DEFAULT_SERVO_CONFIG.url)
  assert.equal((await readServoConfig(write('{"url":5}'))).url, DEFAULT_SERVO_CONFIG.url)
})

test('forme actuelle : les champs justes sont pris, les faux gardent le défaut', async () => {
  const file = write(
    JSON.stringify({
      shutters: {
        '2': { up: { channel: 9, start: 10, end: 20, speed: 0, hold: 2 }, down: { channel: 1.5, start: 200, end: 'x', speed: -1, hold: null }, stop: 'non' },
        '5': 'non',
      },
    }),
  )
  const config = await readServoConfig(file)
  assert.deepEqual(config.shutters['2'].up, { channel: 9, start: 10, end: 20, speed: 0, hold: 2 })
  assert.deepEqual(config.shutters['2'].down, DEFAULT_SERVO_CONFIG.shutters['2'].down)
  assert.deepEqual(config.shutters['2'].stop, DEFAULT_SERVO_CONFIG.shutters['2'].stop)
  assert.deepEqual(config.shutters['5'], DEFAULT_SERVO_CONFIG.shutters['5'])
  assert.deepEqual(config.shutters['6'], DEFAULT_SERVO_CONFIG.shutters['6'])
})

test('ancienne forme : les trois ordres à la racine sont ceux du salon', async () => {
  const up = { channel: 7, start: 1, end: 2, speed: 3, hold: 4 }
  const config = await readServoConfig(write(JSON.stringify({ url: 'http://x', up })))
  assert.deepEqual(config.shutters['2'].up, up)
  assert.deepEqual(config.shutters['2'].down, DEFAULT_SERVO_CONFIG.shutters['2'].down)
  // shutters null : pas l'ancienne forme, tout par défaut
  assert.deepEqual((await readServoConfig(write('{"shutters":null,"up":{"channel":7}}'))).shutters, DEFAULT_SERVO_CONFIG.shutters)
})
