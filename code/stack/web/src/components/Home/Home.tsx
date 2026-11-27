import { lazy, Suspense } from 'react'
import { Notice } from '@house/ui'
import { LOADING_3D_TEXT } from './constants'
import type { HomeProps } from './types'

// Three.js est lourd : la vue 3D est un morceau à part, chargé au premier affichage de la Home.
const Kitchen3D = lazy(() => import('@/components/Kitchen3D'))

/** L'accueil : la maison et le jardin en 3D (un clic sur une caméra de la scène ouvre sa page). */
const Home = ({ apiKey, onOpenCamera }: HomeProps) => {
  return (
    <Suspense fallback={<Notice text={LOADING_3D_TEXT} />}>
      <Kitchen3D apiKey={apiKey} onOpenCamera={onOpenCamera} />
    </Suspense>
  )
}

export default Home
