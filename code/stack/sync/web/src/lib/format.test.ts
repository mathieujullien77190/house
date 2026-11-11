import { describe, expect, it } from 'vitest'
import { formatDateMs, formatSize, splitMs, splitSeconds } from './format'

describe('formatSize', () => {
  it('choisit la plus grande unité lisible', () => {
    expect(formatSize(0)).toBe('0 o')
    expect(formatSize(1023)).toBe('1023 o')
    expect(formatSize(1024)).toBe('1.0 Ko')
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1.5 Mo')
    expect(formatSize(3 * 1024 ** 3)).toBe('3.0 Go')
    expect(formatSize(5000 * 1024 ** 3)).toBe('5000.0 Go')
  })
})

describe('dates', () => {
  const ms = new Date(2026, 10, 7, 14, 5, 9).getTime()

  it('formatDateMs donne la date et l’heure', () => {
    expect(formatDateMs(ms)).toContain('07/11/2026')
    expect(formatDateMs(ms)).toContain('14:05:09')
  })

  it('splitMs et splitSeconds séparent le jour et l’heure', () => {
    expect(splitMs(ms)).toEqual({ date: '07/11/2026', time: '14:05:09' })
    expect(splitSeconds(ms / 1000)).toEqual(splitMs(ms))
  })
})
