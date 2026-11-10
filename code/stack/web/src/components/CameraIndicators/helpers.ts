import type { HueLight, PlugState } from '@/types'
import { PLUG_NAME, LAMP_NAME, LAMP_OFF_TEXT, LAMP_ON_TEXT, LAMP_UNREACHABLE_TEXT } from './constants'

/** L'infobulle du rond : « Lampe Perruche : allumée ». */
export const lampLabel = (lamp: HueLight): string =>
  `Lampe ${LAMP_NAME} : ${!lamp.reachable ? LAMP_UNREACHABLE_TEXT : lamp.on ? LAMP_ON_TEXT : LAMP_OFF_TEXT}`

/** L'infobulle du carré : « Prise : allumée ». */
export const plugLabel = (plug: PlugState): string => `${PLUG_NAME} : ${plug.on ? LAMP_ON_TEXT : LAMP_OFF_TEXT}`

/** Le texte de l'infobulle du rond (un clic) : « Lampe Perruche éteinte », « Lampe Perruche allumée à 60 % », « Lampe Perruche injoignable ». */
export const lampHint = (lamp: HueLight): string => {
  if (!lamp.reachable) return `Lampe ${LAMP_NAME} ${LAMP_UNREACHABLE_TEXT}`
  if (!lamp.on) return `Lampe ${LAMP_NAME} ${LAMP_OFF_TEXT}`
  return `Lampe ${LAMP_NAME} ${LAMP_ON_TEXT} à ${Math.round((Math.min(Math.max(lamp.bri ?? 0, 0), 254) / 254) * 100)} %`
}

/** Le texte de l'infobulle du carré (un clic) : la prise commande le chauffage : « Chauffage allumé » ou « Chauffage éteint ». */
export const plugHint = (plug: PlugState): string => `Chauffage ${plug.on ? 'allumé' : 'éteint'}`

/** Le texte de l'infobulle des températures (un clic) : « Température 9,5 °C ». */
export const temperatureHint = (temperatures: string[]): string => `Température ${temperatures.join(' · ')}`

/** La couleur de l'ampoule dans son rond, comme sur la carte : rouge injoignable, grise éteinte, orange (ou la couleur du pont) allumée, **plus pâle quand la luminosité baisse**. */
export const lampColor = (lamp: HueLight): string => {
  if (!lamp.reachable) return 'var(--color-danger)'
  if (!lamp.on) return 'var(--color-muted)'
  const share = lamp.bri === null ? 100 : 25 + 75 * (Math.min(Math.max(lamp.bri, 0), 254) / 254)
  return `color-mix(in srgb, ${lamp.color ?? 'var(--color-orange)'} ${share}%, white)`
}
