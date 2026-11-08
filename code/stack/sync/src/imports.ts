// Les imports périodiques de fichiers écrits par les autres services (lecture seule ici) dans la base :
// le plan de la maison (toutes les 30 s, écrit par House API) et les visites de la page invité (toutes les 15 s).
import { messageOf, type Context } from './context.ts'
import { importGuestVisits, purgeGuestVisits } from './guestVisits.ts'
import { importPlan, readPlan } from './plan.ts'

export const createImports = (ctx: Context) => {
  const { db, config } = ctx

  const syncPlan = async (): Promise<void> => {
    try {
      const written = importPlan(db, await readPlan(config.planFile), Math.floor(ctx.now() / 1000))
      if (written > 0) ctx.log(`Plan de la maison : ${written} élément(s) enregistré(s)`)
    } catch (error) {
      ctx.log(`Plan de la maison : ${messageOf(error)}`)
    }
  }

  let lastVisitsPurgeAt = 0
  const syncGuestVisits = async (): Promise<void> => {
    try {
      const imported = await importGuestVisits(db, config.guestVisitsFile)
      if (imported > 0) ctx.log(`Page invité : ${imported} visite(s) notée(s)`)
      if (ctx.now() - lastVisitsPurgeAt > 86_400_000) {
        lastVisitsPurgeAt = ctx.now()
        const removed = purgeGuestVisits(db, config.guestVisitsDays, Math.floor(ctx.now() / 1000))
        if (removed > 0) ctx.log(`Page invité : ${removed} visite(s) de plus de ${config.guestVisitsDays} jours supprimée(s)`)
      }
    } catch (error) {
      ctx.log(`Visites de la page invité : ${messageOf(error)}`)
    }
  }

  return { syncPlan, syncGuestVisits }
}
