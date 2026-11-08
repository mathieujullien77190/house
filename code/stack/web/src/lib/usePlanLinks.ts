// Le lien de chaque caméra du plan avec une vraie caméra (son nom) : gardé dans le navigateur de l'appareil (localStorage) et envoyé à House API avec le reste du plan.
// Au départ, les deux caméras de la cage sont liées à voliere-interieur et voliere-exterieur.
import { useCallback, useState } from 'react'
import { PLAN_CAMERA_LINKS } from '@/components/Lights/constants'

const STORAGE_KEY = 'house-plan-links-v1'

export type Links = Record<string, string>

/** Les liens de départ : l'identifiant de l'icône du plan pour chaque vraie caméra (PLAN_CAMERA_LINKS dit l'inverse). */
export const defaultLinks = (): Links => Object.fromEntries(Object.entries(PLAN_CAMERA_LINKS).map(([name, planId]) => [planId, name]))

const load = (): Links => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaultLinks()
    // Une entrée vide veut dire « aucune caméra liée » : elle prend le pas sur le lien de départ.
    return { ...defaultLinks(), ...Object.fromEntries(Object.entries(parsed).filter(([, name]) => typeof name === 'string')) }
  } catch {
    return defaultLinks()
  }
}

export const usePlanLinks = (): { links: Links; link: (planId: string, camera: string) => void } => {
  const [links, setLinks] = useState<Links>(load)
  const link = useCallback((planId: string, camera: string) => {
    setLinks((current) => {
      // Une vraie caméra n'est liée qu'à une icône du plan : on retire son ancien lien.
      const next: Links = Object.fromEntries(
        Object.entries(current).map(([id, name]) => [id, name === camera && camera !== '' ? '' : name]),
      )
      next[planId] = camera
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // pas de stockage : le lien ne survit pas au rechargement
      }
      return next
    })
  }, [])
  return { links, link }
}
