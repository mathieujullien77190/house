import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LightsPanel } from '../../../src'
import type { LightsChange, LightsRoom } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './LightsPanel.en.md?raw'
import fr from './LightsPanel.fr.md?raw'
import roomsCode from './Rooms.source.md?raw'

const ROOMS: LightsRoom[] = [
  {
    id: '1',
    name: 'Salon',
    on: true,
    bri: 180,
    lights: [
      { id: '1', name: 'Lampe canapé', on: true, bri: 180, reachable: true },
      { id: '2', name: 'Lampe étagère', on: false, bri: 127, reachable: true },
      { id: '3', name: 'Lampe coin', on: false, bri: 127, reachable: false },
    ],
  },
  { id: '2', name: 'WC', on: false, bri: 254, lights: [{ id: '4', name: 'Plafonnier WC', on: false, bri: 254, reachable: true }] },
]

/** Démo : le parent tient la liste et le brouillon du curseur ; ici le « pont » est simulé. */
const Rooms = () => {
  const [rooms, setRooms] = useState(ROOMS)
  const [drafts, setDrafts] = useState<Record<string, number>>({})
  const apply = (lamps: (id: string) => boolean, change: LightsChange) =>
    setRooms((list) =>
      list.map((room) => {
        const lights = room.lights.map((light) => (lamps(light.id) ? { ...light, ...(change.on === undefined ? {} : { on: change.on }), ...(change.bri === undefined ? {} : { bri: change.bri }) } : light))
        return { ...room, lights, on: lights.some((light) => light.on) }
      }),
    )
  return (
    <LightsPanel
      rooms={rooms}
      busy=""
      drafts={drafts}
      onAll={(on) => apply(() => true, { on })}
      onRoom={(id, change) => apply((lampId) => rooms.find((room) => room.id === id)?.lights.some((light) => light.id === lampId) ?? false, change)}
      onLight={(id, change) => apply((lampId) => lampId === id, change)}
      onDraft={(key, percent) => setDrafts((current) => ({ ...current, [key]: percent }))}
    />
  )
}

const meta: Meta<typeof LightsPanel> = {
  title: 'Caméras/LightsPanel',
  component: LightsPanel,
  parameters: prose({ fr, en }),
}

export default meta

export const RoomsStory: StoryObj<typeof LightsPanel> = {
  name: 'Pièces',
  parameters: source(roomsCode),
  render: () => <Rooms />,
}
