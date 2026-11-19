// L'allumage des lampes au coucher du soleil : le pont Hue n'a pas de position (il ne connaît pas l'heure du coucher), donc c'est House Sync qui la calcule (`sun.ts`, pour la maison)
// et qui, chaque jour, fait allumer à pleine puissance les lampes de `SUNSET_LIGHTS` (le salon, la cuisine et l'entrée de la WebApp) par House API (`PUT /hue/lights/:id`).
// Une fois par jour : le jour de la dernière exécution est gardé dans la base (`app_settings`), donc un redémarrage ne la répète pas. Si House Sync était arrêté à l'heure, l'allumage rattrape jusqu'à
// 60 minutes après, jamais plus tard. Un tour par minute ; l'interrupteur (`sunset_lights_enabled`, réglé depuis la page) est relu à chaque tour. Une lampe qui échoue ne gêne pas les autres.
import { messageOf, type Context } from './context.ts'
import { sendApi, type ApiTarget } from './power.ts'
import { sunTimes, type Position } from './sun.ts'

const DAY_SECONDS = 86400
/** Passé ce délai après l'heure prévue, l'allumage du jour est perdu (House Sync était arrêté ou l'API muette). */
export const CATCH_UP_SECONDS = 3600
/** La luminosité d'allumage (pleine puissance, comme partout dans la WebApp). */
export const FULL_BRI = 254

/** Le jour (UTC, « 2026-11-18 ») qui contient `at` (secondes) : la clé de « déjà fait aujourd'hui ». */
export const dayOf = (at: number): string => new Date(at * 1000).toISOString().slice(0, 10)

/**
 * La prochaine heure d'allumage (secondes) : celle d'aujourd'hui si elle n'est pas faite et pas perdue (déjà passée, elle vaut « maintenant »), sinon celle de demain ou d'après-demain ;
 * null là où le soleil ne se couche pas.
 */
export const nextSunsetRun = (nowSeconds: number, position: Position, offsetSeconds: number, lastDay: string | null): number | null => {
  const today = Math.floor(nowSeconds / DAY_SECONDS)
  for (let ahead = 0; ahead <= 2; ahead++) {
    const times = sunTimes((today + ahead) * DAY_SECONDS, position)
    if (!times) continue
    const due = times.set + offsetSeconds
    if (ahead === 0 && (lastDay === dayOf(due) || nowSeconds > due + CATCH_UP_SECONDS)) continue
    return due
  }
  return null
}

export const createSunsetLights = (ctx: Context, targetOf: () => ApiTarget | null, send: typeof sendApi = sendApi) => {
  const { config, settings } = ctx
  const offsetSeconds = config.sunsetOffsetMinutes * 60

  /** Allume les lampes ; rend le nombre de lampes qui ont répondu. */
  const lightAll = async (target: ApiTarget): Promise<number> => {
    let done = 0
    for (const id of config.sunsetLights) {
      try {
        await send(target, 'PUT', `/hue/lights/${encodeURIComponent(id)}`, { on: true, bri: FULL_BRI })
        done += 1
      } catch (error) {
        ctx.log(`Coucher du soleil : la lampe ${id} n'a pas été allumée (${messageOf(error)})`)
      }
    }
    return done
  }

  /** Un tour : allume si c'est l'heure et pas encore fait aujourd'hui. Le jour n'est marqué fait que si au moins une lampe a répondu (sinon on retente au tour suivant, dans la limite du rattrapage). */
  const tick = async (): Promise<boolean> => {
    if (!settings.sunsetLightsEnabled() || config.sunsetLights.length === 0) return false
    const now = Math.floor(ctx.now() / 1000)
    const due = nextSunsetRun(now, config.housePosition, offsetSeconds, settings.sunsetLightsLastDay())
    if (due === null || due > now) return false
    const target = targetOf()
    if (!target) return false
    const done = await lightAll(target)
    if (done === 0) return false
    settings.saveSunsetLightsLastDay(dayOf(due))
    ctx.log(`Coucher du soleil : ${done} lampe(s) sur ${config.sunsetLights.length} allumée(s)`)
    return true
  }

  /** La prochaine heure d'allumage (secondes), pour la page ; null si l'automatisation est coupée ou sans coucher de soleil. */
  const next = (): number | null => (settings.sunsetLightsEnabled() ? nextSunsetRun(Math.floor(ctx.now() / 1000), config.housePosition, offsetSeconds, settings.sunsetLightsLastDay()) : null)

  return { tick, next }
}
