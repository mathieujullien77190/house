import { useEffect, useState } from 'react'
import TimelineUI from './UI'
import { DEFAULT_RANGE, RANGES } from './constants'
import { buildMarkers, buildTicks } from './helpers'
import type { RangeId, TimelineProps } from './types'

const NOW_REFRESH_MS = 60_000

/** La frise des événements d'une caméra : une fenêtre de temps, un bloc par événement, le clip de celui qu'on choisit. */
const Timeline = ({ apiKey, events }: TimelineProps) => {
  const [range, setRange] = useState<RangeId>(DEFAULT_RANGE)
  const [selectedId, setSelectedId] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  // L'axe avance d'une minute à la fois : assez pour que « maintenant » reste juste.
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), NOW_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  const { markers, older } = buildMarkers(events, range, now, selectedId)
  const selected = events.find((event) => event.id === selectedId) ?? null

  return (
    <TimelineUI
      apiKey={apiKey}
      ranges={RANGES}
      range={range}
      ticks={buildTicks(range, now)}
      markers={markers}
      older={older}
      selected={selected}
      onRange={setRange}
      onSelect={setSelectedId}
      onClose={() => setSelectedId('')}
    />
  )
}

export default Timeline
