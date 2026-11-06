import { useEffect, useState } from 'react'

/** Le point de rupture bureau de l'app (`lg:` de Tailwind) : en dessous, la mise en page est celle du téléphone. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Vrai tant que l'écran fait moins de 1024 px de large : suit la rotation et le redimensionnement. */
export const useMobile = (): boolean => {
  const [mobile, setMobile] = useState(() => !window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const update = () => setMobile(!query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}
