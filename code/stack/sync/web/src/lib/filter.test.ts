import { describe, expect, it } from 'vitest'
import { NO_FILTER, dayRange, filterQuery } from './filter'

describe('dayRange', () => {
  it('donne le jour local [minuit, minuit suivant[ en secondes', () => {
    const range = dayRange('2026-11-07')
    expect(range).toEqual({ from: new Date(2026, 10, 7).getTime() / 1000, to: new Date(2026, 10, 8).getTime() / 1000 })
  })

  it('rend null pour un jour vide ou invalide', () => {
    expect(dayRange('')).toBeNull()
    expect(dayRange('7/11/2026')).toBeNull()
  })
})

describe('filterQuery', () => {
  it('est vide sans filtre', () => {
    expect(filterQuery(NO_FILTER)).toBe('')
  })

  it('ajoute la valeur choisie (nom du paramètre au choix) et la période', () => {
    expect(filterQuery({ match: 'voliere interieur', day: '' })).toBe('&match=voliere%20interieur')
    expect(filterQuery({ match: 'cam', day: '' }, 'camera')).toBe('&camera=cam')
    const range = dayRange('2026-11-07')
    expect(filterQuery({ match: '', day: '2026-11-07' })).toBe(`&from=${range?.from}&to=${range?.to}`)
    expect(filterQuery({ match: 'a', day: '2026-11-07' })).toBe(`&match=a&from=${range?.from}&to=${range?.to}`)
  })
})
