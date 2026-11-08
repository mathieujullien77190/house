// Le coût prévu d'une activation du chauffage, calculé quand elle commence et écrit dans la ligne du journal (le tarif peut changer ensuite).
import type { Activation } from './heatingLog.ts'
import type { HeatingSettings } from './heatingSettings.ts'

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
 * Le coût en euros d'une activation : puissance (kW) × heures × prix du kWh. Les minutes se découpent entre heures creuses et pleines
 * selon l'heure de Paris quand les deux bornes sont connues ; sinon tout est compté au tarif creux (la règle chauffe la nuit).
 * Arrondi à quatre décimales (0,0265 €) ; null si la puissance est inconnue.
 */
export const activationCost = (entry: Pick<Activation, 'at' | 'minutes'>, settings: HeatingSettings): number | null => {
  if (settings.heaterWatts === null) return null
  let cheap = entry.minutes
  if (settings.offPeakStart !== null && settings.offPeakEnd !== null) {
    cheap = 0
    for (let minute = 0; minute < entry.minutes; minute += 1) {
      if (isOffPeak(parisMinuteOfDay(entry.at + minute * 60), settings.offPeakStart, settings.offPeakEnd)) cheap += 1
    }
  }
  const kilowattHours = (settings.heaterWatts / 1000) * (1 / 60)
  const euros = kilowattHours * (cheap * settings.priceKwh + (entry.minutes - cheap) * settings.peakPriceKwh)
  return Math.round(euros * 10000) / 10000
}
