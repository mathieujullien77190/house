import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NOT_FOUND_HTML } from './notFound.ts'

test('la page 404 ne dit rien de la page invité', () => {
  assert.match(NOT_FOUND_HTML, /404 Not Found/)
  assert.doesNotMatch(NOT_FOUND_HTML, /Perruche|invité|caméra|Cliquer/i)
})
