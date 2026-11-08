// Le coût prévu d'une activation du chauffage, calculé quand elle commence et écrit dans la ligne du journal (le tarif peut changer ensuite).
import type { Activation } from './heatingLog.ts'
import { HEATER_WATTS, OFF_PEAK_END, OFF_PEAK_PRICE_KWH, OFF_PEAK_START, PEAK_PRICE_KWH } from './heatingSettings.ts'

const parisClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** « HH:MM » en minutes depuis minuit. */
const toMinutes = (clock: string): number => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5))

/** Les minutes depuis minuit, heure de Paris, à cet instant (secondes depuis 1970). */
const parisMinuteOfDay = (seconds: number): number => toMinutes(parisClock.format(new Date(seconds * 1000)))

/** Cette minute du jour est-elle dans les heures creuses ? (une plage peut passer minuit : 22:30 → 06:30) */
export const isOffPeak = (minuteOfDay: number, start: string, end: string): boolean => {
  const from = toMinutes(start)
  const to = toMinutes(end)
  return from <= to ? minuteOfDay >= from && minuteOfDay < to : minuteOfDay >= from || minuteOfDay < to
}

/**
 * Le coût en euros d'une activation : puissance constante (kW) × heures × prix du kWh. Les minutes se découpent entre heures creuses et pleines
 * selon l'heure de Paris (heures creuses constantes).
 * Arrondi à quatre décimales (0,0265 €).
 */
export const activationCost = (entry: Pick<Activation, 'at' | 'minutes'>): number => {
  let cheap = 0
  for (let minute = 0; minute < entry.minutes; minute += 1) {
    if (isOffPeak(parisMinuteOfDay(entry.at + minute * 60), OFF_PEAK_START, OFF_PEAK_END)) cheap += 1
  }
  const kilowattHours = (HEATER_WATTS / 1000) * (1 / 60)
  const euros = kilowattHours * (cheap * OFF_PEAK_PRICE_KWH + (entry.minutes - cheap) * PEAK_PRICE_KWH)
  return Math.round(euros * 10000) / 10000
}
