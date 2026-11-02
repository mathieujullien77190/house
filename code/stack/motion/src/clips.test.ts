import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webClipPath } from './clips.ts'

test('webClipPath met .h264 avant l’extension et laisse le reste du chemin', () => {
  assert.equal(webClipPath('/data/clips/1793.904-portail.mp4'), '/data/clips/1793.904-portail.h264.mp4')
})
