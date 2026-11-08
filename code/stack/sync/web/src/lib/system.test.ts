import { describe, expect, it } from 'vitest'
import type { System } from '@/types'
import { buildCpuChart, buildMemoryChart } from './system'

const system = (patch: Partial<System> = {}): System => ({
  memory: { total: 2048, available: 512 },
  cpu: { percent: 12.34, threads: 12, load1: 0.5, perThread: [] },
  ...patch,
})

describe('buildMemoryChart', () => {
  it('sépare l’utilisée de la disponible', () => {
    const chart = buildMemoryChart(system())
    expect(chart?.slices.map((slice) => [slice.id, slice.value])).toEqual([
      ['used', 1536],
      ['available', 512],
    ])
    expect(chart?.centerValue).toBe('512 o')
    expect(chart?.centerLabel).toBe('disponibles sur 2.0 Ko')
  })

  it('rend null sans mémoire lue, et ne descend pas sous zéro', () => {
    expect(buildMemoryChart(system({ memory: null }))).toBeNull()
    expect(buildMemoryChart(system({ memory: { total: 100, available: 200 } }))?.slices[0]?.value).toBe(0)
  })
})

describe('buildCpuChart', () => {
  it('la part utilisée et la part libre', () => {
    const chart = buildCpuChart(system())
    expect(chart?.slices.map((slice) => slice.display)).toEqual(['12.3 %', '87.7 %'])
    expect(chart?.centerValue).toBe('12 %')
    expect(chart?.centerLabel).toBe('utilisé · 12 threads · charge 0.50')
  })

  it('rend null sans processeur lu', () => {
    expect(buildCpuChart(system({ cpu: null }))).toBeNull()
  })
})
