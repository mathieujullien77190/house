// Tests de la lecture du processeur par thread : node --test (npm test).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cpuPercent, parseThreadTimes } from './system.ts'

const STAT = ['cpu  400 0 200 1400 0 0 0 0 0 0', 'cpu0 100 0 50 350 0 0 0 0 0 0', 'cpu1 300 0 150 1050 0 0 0 0 0 0', 'intr 1'].join('\n')

test('parseThreadTimes rend un temps par ligne cpuN, dans l’ordre', () => {
  const threads = parseThreadTimes(STAT)
  assert.equal(threads.length, 2)
  assert.deepEqual(threads[0], { busy: 150, total: 500 })
  assert.deepEqual(threads[1], { busy: 450, total: 1500 })
})

test('la part d’un thread se calcule entre deux lectures', () => {
  assert.equal(cpuPercent({ busy: 150, total: 500 }, { busy: 200, total: 600 }), 50)
})
