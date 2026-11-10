import GuestLink from '@/components/GuestLink'
import HouseMap from '@/components/HouseMap'
import { useMobile } from '@/lib/useMobile'
import type { HomeProps } from './types'

/** L'accueil : la carte de la maison (caméras et lampes ; sur téléphone elle remplit l'espace qui reste à l'écran) puis le lien de la page invité. */
const Home = ({ apiKey, cameras, onOpenCamera, onOpenAc, onOpenShutter, onOpenPlug, events, isRead }: HomeProps) => {
  // Sur téléphone, le lien de la page invité est dans le menu du haut.
  const mobile = useMobile()
  return (
    <>
      <HouseMap
        apiKey={apiKey}
        cameras={cameras}
        onOpenCamera={onOpenCamera}
        onOpenAc={onOpenAc}
        onOpenShutter={onOpenShutter}
        onOpenPlug={onOpenPlug}
        events={events}
        isRead={isRead}
      />
      {mobile ? null : <GuestLink apiKey={apiKey} />}
    </>
  )
}

export default Home
