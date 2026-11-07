// Tests du son des clips : node --test (npm test).
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { audioClipPath, audioStart, buildAudioClip, encodeArgs, listAudioStarts, pruneAudio, selectAudio } from './audio.ts'

test('audioStart lit l’heure de début dans le nom d’un fichier son, et refuse le reste', () => {
  assert.equal(audioStart('1794071400.aac'), 1794071400)
  assert.equal(audioStart('1794071400.ts'), null)
  assert.equal(audioStart('1794071400.aac.part'), null)
  assert.equal(audioStart('x.aac'), null)
  assert.equal(audioStart('../1794071400.aac'), null)
})

test('listAudioStarts et pruneAudio : les fichiers son, du plus ancien au plus récent, et la purge des vieux', () => {
  const dir = mkdtempSync(join(tmpdir(), 'motion-audio-'))
  try {
    for (const name of ['1000.aac', '3000.aac', '2000.aac', 'notes.txt', '4000.ts']) writeFileSync(join(dir, name), 'x')
    assert.deepEqual(listAudioStarts(dir), [1000, 2000, 3000])
    assert.equal(pruneAudio(dir, 2500), 2)
    assert.deepEqual(listAudioStarts(dir), [3000])
    // Les autres fichiers du dossier ne sont jamais touchés.
    assert.deepEqual(readdirSync(dir).sort(), ['3000.aac', '4000.ts', 'notes.txt'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('un dossier absent ne fait rien', async () => {
  const missing = join(tmpdir(), 'motion-audio-dossier-absent')
  assert.deepEqual(listAudioStarts(missing), [])
  assert.equal(pruneAudio(missing, 1), 0)
  assert.equal(await buildAudioClip({ dir: missing, output: join(tmpdir(), 'jamais.aac'), from: 0, to: 10, segmentSeconds: 10 }), false)
})

test('selectAudio garde les fichiers qui recouvrent la plage, avec une marge', () => {
  const starts = [100, 110, 120, 130, 140]
  assert.deepEqual(selectAudio(starts, 122, 133, 10), [110, 120, 130])
  assert.deepEqual(selectAudio(starts, 500, 510, 10), [])
})

test('le son d’un clip porte le nom du clip', () => {
  assert.equal(audioClipPath('/data/clips/1794071400.5-voliere-interieur.mp4'), '/data/clips/1794071400.5-voliere-interieur.aac')
})

test('sans aucun fichier son sur la plage, aucun son n’est écrit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'motion-audio-'))
  const output = join(dir, 'clip.aac')
  try {
    writeFileSync(join(dir, '100.aac'), 'x')
    assert.equal(await buildAudioClip({ dir, output, from: 500, to: 520, segmentSeconds: 10 }), false)
    // Un fichier vide (flux interrompu) est sauté.
    writeFileSync(join(dir, '500.aac'), '')
    assert.equal(await buildAudioClip({ dir, output, from: 500, to: 520, segmentSeconds: 10 }), false)
    assert.equal(existsSync(output), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('encodeArgs : sans gain le son est copié, avec un gain il est amplifié (limiteur) et recodé', () => {
  assert.deepEqual(encodeArgs(0), ['-c:a', 'copy'])
  const args = encodeArgs(24)
  assert.ok(args.includes('volume=24dB,alimiter=limit=0.95'))
  assert.ok(args.includes('aac'))
})
