import { describe, expect, it } from 'vitest'
import type { Power } from '@/types'
import { buildPowerTotals } from './power'

const power = (patch: Partial<Power> = {}): Power => ({
  cpu: { watts: 12.34, ageSeconds: 1 },
  cameras: [
    { camera: 'a', watts: 5, powered: true },
    { camera: 'b', watts: 4.5, powered: true },
  ],
  camerasError: null,
  ...patch,
})

describe('buildPowerTotals', () => {
  it('additionne ce qui est mesuré', () => {
    const [cpu, cameras, total] = buildPowerTotals(power())
    expect(cpu).toEqual({ id: 'cpu', value: '12.3 W', label: 'processeur du mini PC (compteur RAPL)' })
    expect(cameras?.value).toBe('9.5 W')
    expect(cameras?.label).toBe('caméras (PoE du switch) : a 5.0 W · b 4.5 W')
    expect(total?.value).toBe('21.8 W')
  })

  it('une mesure manquante est dite, sans fausser le total', () => {
    const [cpu, cameras, total] = buildPowerTotals(power({ cpu: null, cameras: null, camerasError: 'API non configurée' }))
    expect(cpu).toMatchObject({ value: '—', label: 'processeur : mesure indisponible' })
    expect(cameras).toMatchObject({ value: '—', label: 'caméras : API non configurée' })
    expect(total?.value).toBe('—')
    expect(buildPowerTotals(power({ cameras: null }))[1]?.label).toBe('caméras : indisponible')
    expect(buildPowerTotals(power({ cpu: null }))[2]?.value).toBe('9.5 W')
  })

  it('aucune caméra branchée : pas de détail', () => {
    const [, cameras] = buildPowerTotals(power({ cameras: [] }))
    expect(cameras).toMatchObject({ value: '0.0 W', label: 'caméras (PoE du switch)' })
  })
})
