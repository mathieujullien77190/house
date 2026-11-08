import { describe, expect, it } from 'vitest'
import { buildSpecItems, formatUptime } from './specs'
import { specs } from './fixtures'

describe('formatUptime', () => {
  it('jours, heures et minutes, sans les unités à zéro en tête', () => {
    expect(formatUptime(2 * 86_400 + 3 * 3_600 + 12 * 60)).toBe('2 j 3 h 12 min')
    expect(formatUptime(3 * 3_600 + 5 * 60)).toBe('3 h 5 min')
    expect(formatUptime(86_400)).toBe('1 j 0 h 0 min')
    expect(formatUptime(125)).toBe('2 min')
  })
})

describe('buildSpecItems', () => {
  it('une ligne par mesure', () => {
    const items = buildSpecItems(specs())
    expect(items.map((item) => item.id)).toEqual(['machine', 'os', 'cpu', 'memory', 'disk', 'uptime'])
    expect(items[0]?.value).toBe('mini · BIOS 1.2.3')
    expect(items[2]?.value).toBe('Ryzen 5 7530U · 6 cœurs, 12 threads · jusqu’à 4.5 GHz')
    expect(items[3]?.value).toBe('16.0 Go vus par le système')
    expect(items[4]?.value).toBe('Samsung · 1024.0 Go · SSD')
  })

  it('une ligne manque quand la mesure manque', () => {
    const items = buildSpecItems(specs({ bios: null, cpu: { model: 'X', cores: 1, threads: 1, maxMhz: null }, memory: null, disk: { model: 'HDD', size: 2048, rotational: true } }))
    expect(items.map((item) => item.id)).toEqual(['machine', 'os', 'cpu', 'disk', 'uptime'])
    expect(items[0]?.value).toBe('mini')
    expect(items[2]?.value).toBe('X · 1 cœurs, 1 threads')
    expect(items[3]?.value).toBe('HDD · 2.0 Ko · disque dur')
    expect(buildSpecItems(specs({ cpu: null, disk: null })).map((item) => item.id)).toEqual(['machine', 'os', 'memory', 'uptime'])
  })

  it('une ligne vide est retirée', () => {
    const items = buildSpecItems(specs({ hostname: '', bios: null, os: '', kernel: '', architecture: '' }))
    expect(items.some((item) => item.id === 'machine')).toBe(false)
    expect(items.find((item) => item.id === 'os')?.value).toBe('noyau ')
  })
})
