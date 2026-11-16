// Tests de la lecture de la configuration des servos des volets.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { DEFAULT_SERVO_CONFIG, readServoConfig } from './servoConfig.ts'

const dir = mkdtempSync(join(tmpdir(), 'servos-'))
after(() => rmSync(dir, { recursive: true, force: true }))
const write = (name: string, content: string): string => {
  const file = join(dir, name)
  writeFileSync(file, content)
  return file
}

test("sans fichier, fichier abîmé ou qui n'est pas un objet : les valeurs par défaut", async () => {
  assert.deepEqual(await readServoConfig(join(dir, 'absent.json')), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('abime.json', 'x{')), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('null.json', 'null')), DEFAULT_SERVO_CONFIG)
  assert.deepEqual(await readServoConfig(write('nombre.json', '3')), DEFAULT_SERVO_CONFIG)
})

test("l'adresse : nettoyée si http, sinon par défaut", async () => {
  assert.equal((await readServoConfig(write('a.json', '{"url":"http://esp///"}'))).url, 'http://esp')
  assert.equal((await readServoConfig(write('b.json', '{"url":"ftp://esp"}'))).url, DEFAULT_SERVO_CONFIG.url)
  assert.equal((await readServoConfig(write('c.json', '{"url":5}'))).url, DEFAULT_SERVO_CONFIG.url)
})

test('forme actuelle : les champs justes sont pris, les faux gardent le défaut', async () => {
  const file = write(
    'actuel.json',
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
  const config = await readServoConfig(write('ancien.json', JSON.stringify({ url: 'http://x', up })))
  assert.deepEqual(config.shutters['2'].up, up)
  assert.deepEqual(config.shutters['2'].down, DEFAULT_SERVO_CONFIG.shutters['2'].down)
  // shutters null : pas l'ancienne forme, tout par défaut
  assert.deepEqual((await readServoConfig(write('nul.json', '{"shutters":null,"up":{"channel":7}}'))).shutters, DEFAULT_SERVO_CONFIG.shutters)
})
