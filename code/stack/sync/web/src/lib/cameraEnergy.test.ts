import { describe, expect, it } from 'vitest'
import type { CameraEnergy } from '@/types'
import { buildCameraEnergyTotals, cameraEnergyNote, sinceText } from './cameraEnergy'

const energy = (patch: Partial<CameraEnergy> = {}): CameraEnergy => ({
  since: '2026-11-08T12:00:00.000Z',
  cameras: [
    { camera: 'a', kwh: 0.1234, cost: 0.0196 },
    { camera: 'b', kwh: 0.05, cost: 0.0079 },
  ],
  total: { kwh: 0.1734, cost: 0.0275 },
  ...patch,
})

describe('cameraEnergy', () => {
  it('une carte par caméra puis le total, kWh à trois décimales et euros au centime', () => {
    expect(buildCameraEnergyTotals(energy())).toEqual([
      { id: 'a', value: '0,123 kWh', label: 'a · 0,02 €' },
      { id: 'b', value: '0,050 kWh', label: 'b · 0,01 €' },
      { id: 'total', value: '0,173 kWh', label: 'total · 0,03 €' },
    ])
  })

  it('sinceText : la date de départ et l’heure', () => {
    expect(sinceText('2026-11-08T12:00:00.000Z')).toMatch(/^depuis le 8 nov\. 2026 à \d{2}:\d{2}$/)
  })

  it('la note dit depuis quand et que c’est une estimation ; sans date, que le suivi attend son premier relevé', () => {
    expect(cameraEnergyNote(energy())).toMatch(/^Depuis le 8 nov\. 2026 à \d{2}:\d{2}\. Estimation : puissance PoE relevée chaque minute, tarif heures creuses \/ pleines\.$/)
    expect(cameraEnergyNote(energy({ since: null }))).toBe('Le suivi démarre au premier relevé. Estimation : puissance PoE relevée chaque minute, tarif heures creuses / pleines.')
  })
})
