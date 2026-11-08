import { describe, expect, it } from 'vitest'
import { buildDiskChart } from './disk'
import { overview } from './fixtures'

describe('buildDiskChart', () => {
  it('répartit le disque : clips, images, base, autres, réservé, libre', () => {
    const chart = buildDiskChart(overview())
    expect(chart?.slices.map((slice) => slice.id)).toEqual(['clips', 'snapshots', 'db', 'other', 'reserved', 'free'])
    expect(chart?.centerValue).toBe('512.0 Go')
    expect(chart?.centerLabel).toBe('libres sur 1024.0 Go')
    const other = chart?.slices.find((slice) => slice.id === 'other')
    expect(other?.value).toBe(1024 ** 4 - 512 * 1024 ** 3 - 50 * 1024 ** 3 - 100 * 1024 ** 2 - 10 * 1024 ** 2 - 5 * 1024 ** 2)
  })

  it('« autres » ne devient jamais négatif', () => {
    const chart = buildDiskChart(overview({ total: 1024, free: 1000, reserved: 0 }))
    expect(chart?.slices.find((slice) => slice.id === 'other')?.value).toBe(0)
  })

  it('rend null quand la taille du disque est inconnue', () => {
    expect(buildDiskChart(overview({ total: 0, free: 0, reserved: 0 }))).toBeNull()
  })
})
