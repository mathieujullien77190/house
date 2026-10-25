import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Timeline, type TimelineMarker } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Timeline.en.md?raw'
import fr from './Timeline.fr.md?raw'
import dayCode from './Day.source.md?raw'

type RangeId = '10m' | '1h' | '6h' | '24h'

const RANGES: { id: RangeId; label: string }[] = [
  { id: '10m', label: '10 min' },
  { id: '1h', label: '1 h' },
  { id: '6h', label: '6 h' },
  { id: '24h', label: '24 h' },
]

const TICKS = ['18:00', '21:00', '00:00', '03:00', '06:00', '09:00', '12:00', '15:00'].map((label, i) => ({ x: 6 + i * 12.5, label }))

const MARKERS: TimelineMarker[] = [
  { id: 'a', x: 22, width: 1.2, text: 'person · 25/10/2026 22:10 · 15 s', selected: false, ongoing: false },
  { id: 'b', x: 61, width: 2.4, text: 'person · 25/10/2026 07:30 · 21 s', selected: true, ongoing: false },
  { id: 'c', x: 84.5, width: 2.5, text: 'person · 25/10/2026 15:58 · en cours', selected: false, ongoing: true },
]

const COVERAGE = [
  { x: 0, width: 40 },
  { x: 55, width: 45 },
]

/** La story tient la fenêtre et la sélection ; dans l'app, un hook calcule positions et graduations. */
const Day = () => {
  const [range, setRange] = useState<RangeId | ''>('24h')
  const [selected, setSelected] = useState('b')
  const [cursorX, setCursorX] = useState<number | null>(61)
  return (
    <Timeline
      ranges={RANGES}
      range={range}
      live
      windowText="24/10/2026 16:00 → 25/10/2026 16:00 · 24 h"
      ticks={TICKS}
      markers={MARKERS.map((marker) => ({ ...marker, selected: marker.id === selected }))}
      coverage={COVERAGE}
      nowX={87}
      cursorX={cursorX}
      older={4}
      onRange={setRange}
      onNow={() => {
        setSelected('')
        setCursorX(null)
      }}
      onSelect={(id) => {
        const marker = MARKERS.find((m) => m.id === id)
        setSelected(id)
        if (marker) setCursorX(marker.x)
      }}
    />
  )
}

const meta: Meta<typeof Timeline> = {
  title: 'Caméras/Timeline',
  component: Timeline,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const DayStory: StoryObj<typeof Timeline> = {
  name: 'Day',
  parameters: source(dayCode),
  render: () => <Day />,
}
