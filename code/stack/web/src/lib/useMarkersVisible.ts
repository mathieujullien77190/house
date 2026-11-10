// Les 📷 des autres caméras sont-ils montrés sur l'image du direct ? Oui au départ. Le choix (le bouton à côté de la prise) est gardé dans le navigateur : un confort de cet appareil,
// rien de plus (si le stockage est refusé, le choix vaut pour la page ouverte).
import { useCallback, useState } from 'react'

export const MARKERS_HIDDEN_KEY = 'house-markers-hidden'

const readHidden = (): boolean => {
  try {
    return localStorage.getItem(MARKERS_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export const useMarkersVisible = (): { visible: boolean; toggle: () => void } => {
  const [hidden, setHidden] = useState(readHidden)
  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current
      try {
        localStorage.setItem(MARKERS_HIDDEN_KEY, next ? '1' : '0')
      } catch {
        /* stockage refusé : le choix vaut pour cette page */
      }
      return next
    })
  }, [])
  return { visible: !hidden, toggle }
}
