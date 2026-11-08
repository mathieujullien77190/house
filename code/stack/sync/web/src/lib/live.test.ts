import { describe, expect, it } from 'vitest'
import type { System } from '@/types'
import { EMPTY_HISTORY, addSystemSample, memoryPercent, pushSample } from './live'

const system = (patch: Partial<System> = {}): System => ({
  memory: { total: 1000, available: 250 },
  cpu: { percent: 40, threads: 2, load1: 0.5, perThread: [10, 70] },
  ...patch,
})

describe('pushSample', () => {
  it('ajoute à la fin et garde les plus récentes', () => {
    expect(pushSample([1, 2], 3, 5)).toEqual([1, 2, 3])
    expect(pushSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4])
  })
})

describe('memoryPercent', () => {
  it('rend la part utilisée, ou null', () => {
    expect(memoryPercent(system())).toBe(75)
    expect(memoryPercent(system({ memory: null }))).toBeNull()
    expect(memoryPercent(system({ memory: { total: 0, available: 0 } }))).toBeNull()
  })
})

describe('addSystemSample', () => {
  it('ajoute la mesure du tour à chaque courbe', () => {
    const first = addSystemSample(EMPTY_HISTORY, system(), 3)
    expect(first).toEqual({ cpu: [40], memory: [75], threads: [[10], [70]] })
    const second = addSystemSample(first, system({ cpu: { percent: 50, threads: 2, load1: 1, perThread: [20, 80] } }), 3)
    expect(second.cpu).toEqual([40, 50])
    expect(second.threads).toEqual([
      [10, 20],
      [70, 80],
    ])
  })

  it('une mesure manquante ne change pas la courbe', () => {
    const history = { cpu: [1], memory: [2], threads: [[3]] }
    expect(addSystemSample(history, system({ cpu: null, memory: null }), 3)).toEqual(history)
  })
})
