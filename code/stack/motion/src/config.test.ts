import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadConfig, parseLinks } from './config.ts'

test('parseLinks : un groupe donne chaque paire ordonnée, les groupes trop petits et les doublons sont ignorés', () => {
  assert.deepEqual(parseLinks(undefined), [])
  assert.deepEqual(parseLinks(''), [])
  assert.deepEqual(parseLinks('seule, a + a'), [])
  assert.deepEqual(parseLinks('a+b'), [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'a' },
  ])
  assert.equal(parseLinks('a+b+c,d+e').length, 8)
})

test('loadConfig lit LINKS', () => {
  assert.deepEqual(loadConfig({ LINKS: 'x+y' }).links, [
    { source: 'x', target: 'y' },
    { source: 'y', target: 'x' },
  ])
})
