// Le thème de la WebApp : clair par défaut, le bouton de la barre bascule en sombre (et inversement). Le choix est gardé sur l'appareil ; le réglage du système n'est pas suivi.
import { useCallback, useEffect, useState } from 'react'
import { readTvMode } from './tvMode'

const STORAGE_KEY = 'house-theme'

export type Theme = 'light' | 'dark'

const readTheme = (): Theme => {
  // Sur la télé (`?tv=1`) : toujours sombre.
  if (readTvMode()) return 'dark'
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const useTheme = (): { theme: Theme; toggle: () => void } => {
  const [theme, setTheme] = useState<Theme>(readTheme)
  // L'attribut posé sur la page fait basculer les jetons de couleur (`@house/ui/tokens.css`) et le variant `dark:`.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // pas de stockage : le choix ne survit pas au rechargement
      }
      return next
    })
  }, [])
  return { theme, toggle }
}
