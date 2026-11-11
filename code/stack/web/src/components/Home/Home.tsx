import HouseMap from '@/components/HouseMap'
import type { HomeProps } from './types'

/** L'accueil : la carte de la maison (caméras et lampes ; sur téléphone elle remplit l'espace qui reste à l'écran). */
const Home = ({ apiKey, cameras, onOpenCamera, onOpenAc, onOpenShutter, onOpenPlug, events, isRead }: HomeProps) => {
  return (
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
  )
}

export default Home
