import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LightsPlan } from '../../../src'
import type { PlanLamp, PlanRoom, PlanWall } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './LightsPlan.en.md?raw'
import fr from './LightsPlan.fr.md?raw'
import bulbsCode from './Bulbs.source.md?raw'

const ROOMS: PlanRoom[] = [
  { name: 'Chambre', rects: [{ x: 0, y: 0, w: 210, h: 140 }] },
  { name: 'Cuisine', rects: [{ x: 210, y: 0, w: 330, h: 140 }] },
  {
    name: 'Salon',
    rects: [
      { x: 0, y: 140, w: 400, h: 160 },
      { x: 400, y: 190, w: 140, h: 110 },
    ],
    outline: 'M 0 140 H 400 V 190 H 540 V 300 H 0 Z',
  },
]

// Une cloison qui s'arrête avant le mur d'en face : une ouverture.
const WALLS: PlanWall[] = [{ x1: 0, y1: 70, x2: 150, y2: 70 }]

const LAMPS: PlanLamp[] = [
  { id: '1', name: 'Lampe canapé', x: 120, y: 90, on: true, reachable: true },
  { id: '2', name: 'Lampe étagère', x: 260, y: 160, on: false, reachable: true },
  { id: '3', name: 'Lampe coin (coupée à l’interrupteur)', x: 400, y: 220, on: false, reachable: false },
]

/** Démo : le parent tient les positions et l'état ; ici le « pont » est simulé. */
const Bulbs = () => {
  const [lamps, setLamps] = useState(LAMPS)
  return (
    <LightsPlan
      title="Rez-de-chaussée"
      rooms={ROOMS}
      walls={WALLS}
      lamps={lamps}
      onMove={(id, x, y) => setLamps((list) => list.map((lamp) => (lamp.id === id ? { ...lamp, x, y } : lamp)))}
      onToggle={(id) => setLamps((list) => list.map((lamp) => (lamp.id === id && lamp.reachable ? { ...lamp, on: !lamp.on } : lamp)))}
    />
  )
}

const meta: Meta<typeof LightsPlan> = {
  title: 'Caméras/LightsPlan',
  component: LightsPlan,
  parameters: prose({ fr, en }),
}

export default meta

export const BulbsStory: StoryObj<typeof LightsPlan> = {
  name: 'Ampoules',
  parameters: source(bulbsCode),
  render: () => <Bulbs />,
}
