import type { EventRow } from '@/types'

export const eventsOf = (events: EventRow[], camera: string): EventRow[] => events.filter((event) => event.camera === camera)
