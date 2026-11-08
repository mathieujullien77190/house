// Tests de l'interrupteur de la page invité.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { readGuestEnabled, writeGuestEnabled } from './guestState.ts'
import { tempDir } from './testing.ts'

const dir = tempDir()

test('sans fichier : en ligne', async () => {
  assert.equal(await readGuestEnabled(`${dir}/absent.json`), true)
})

test('écrit puis relu, dans un dossier créé au besoin', async () => {
  const file = `${dir}/sous/dossier/state.json`
  await writeGuestEnabled(file, false)
  assert.equal(readFileSync(file, 'utf8'), '{"enabled":false}')
  assert.equal(await readGuestEnabled(file), false)
  await writeGuestEnabled(file, true)
  assert.equal(await readGuestEnabled(file), true)
})

test('fichier illisible ou abîmé : coupée', async () => {
  mkdirSync(`${dir}/dossier.json`)
  assert.equal(await readGuestEnabled(`${dir}/dossier.json`), false)
  writeFileSync(`${dir}/abime.json`, 'x{')
  assert.equal(await readGuestEnabled(`${dir}/abime.json`), false)
})
