import GuestLink from '@/components/GuestLink'
import HouseMap from '@/components/HouseMap'
import type { HomeProps } from './types'

/** L'accueil : la carte de la maison (caméras et lampes ; sur téléphone elle remplit l'espace qui reste à l'écran) puis le lien de la page invité. */
const Home = ({ apiKey, cameras, onOpenCamera, onOpenAc, onOpenShutter, onOpenPlug, events, isRead }: HomeProps) => {
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
      <GuestLink apiKey={apiKey} />
    </>
  )
}

export default Home
