import type { Total } from '@house/ui'
import type { CameraEnergy } from '@/types'

const kwhText = (kwh: number): string => `${kwh.toFixed(3).replace('.', ',')} kWh`
const euroText = (euros: number): string => `${euros.toFixed(2).replace('.', ',')} €`

/** Une carte par caméra puis le total : l'énergie depuis le début, et le coût en euros (au centime) dans le nom. */
export const buildCameraEnergyTotals = (energy: CameraEnergy): Total[] => [
  ...energy.cameras.map((camera) => ({ id: camera.camera, value: kwhText(camera.kwh), label: `${camera.camera} · ${euroText(camera.cost)}` })),
  { id: 'total', value: kwhText(energy.total.kwh), label: `total · ${euroText(energy.total.cost)}` },
]

/** « depuis le 8 nov. 2026 à 20:15 » (heure du navigateur) ; le suivi démarre au premier relevé. */
export const sinceText = (since: string): string => {
  const date = new Date(since)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `depuis le ${day} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

const ESTIMATE = 'Estimation : puissance PoE relevée chaque minute, tarif heures creuses / pleines.'

export const cameraEnergyNote = (energy: CameraEnergy): string => {
  if (!energy.since) return `Le suivi démarre au premier relevé. ${ESTIMATE}`
  const since = sinceText(energy.since)
  return `${since[0].toUpperCase()}${since.slice(1)}. ${ESTIMATE}`
}
