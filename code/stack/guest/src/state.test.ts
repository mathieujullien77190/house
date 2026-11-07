import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { readEnabled } from './state.ts'

const withFile = async (content: string | null, check: (file: string) => Promise<void>) => {
  const dir = mkdtempSync(join(tmpdir(), 'guest-state-'))
  const file = join(dir, 'state.json')
  if (content !== null) writeFileSync(file, content)
  try {
    await check(file)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('sans fichier configuré ou sans fichier : joignable', async () => {
  assert.equal(await readEnabled(''), true)
  await withFile(null, async (file) => assert.equal(await readEnabled(file), true))
})

test('enabled true : joignable ; enabled false : coupée', async () => {
  await withFile('{"enabled":true}', async (file) => assert.equal(await readEnabled(file), true))
  await withFile('{"enabled":false}', async (file) => assert.equal(await readEnabled(file), false))
})

test('un fichier abîmé ou sans réponse claire coupe la page', async () => {
  await withFile('{"enabled":', async (file) => assert.equal(await readEnabled(file), false))
  await withFile('{}', async (file) => assert.equal(await readEnabled(file), false))
  await withFile('{"enabled":"yes"}', async (file) => assert.equal(await readEnabled(file), false))
})

test('un fichier illisible (c’est un dossier) coupe la page', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'guest-state-'))
  try {
    assert.equal(await readEnabled(dir), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
