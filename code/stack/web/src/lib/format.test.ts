import { rememberClipDuration } from './clipDurations'
import { describeEvent, formatDuration, formatTime, ONGOING_TEXT } from './format'
import type { EventRow } from '@/types'

const event = (over: Partial<EventRow>): EventRow =>
  ({ id: 'e', camera: 'c', label: 'person', started_at: 1000, ended_at: 1010, clip_started_at: null, ...over }) as EventRow

describe('format', () => {
  it('formatTime écrit date et heure en français', () => {
    expect(formatTime(0)).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
  it('formatDuration : en cours, inconnue, arrondie, au moins 1 s', () => {
    expect(formatDuration(event({ ended_at: null }))).toBe(ONGOING_TEXT)
    expect(formatDuration(event({ id: 'inconnu' }))).toBe('')
    rememberClipDuration('long', 15.4)
    expect(formatDuration(event({ id: 'long' }))).toBe('15 s')
    rememberClipDuration('court', 0.2)
    expect(formatDuration(event({ id: 'court' }))).toBe('1 s')
  })
  it('describeEvent prend le début du clip s’il existe, sinon celui du mouvement', () => {
    expect(describeEvent(event({ id: 'x1', clip_started_at: 5000 }))).toBe(`person · ${formatTime(5000)}`)
    expect(describeEvent(event({ id: 'x2' }))).toBe(`person · ${formatTime(1000)}`)
    rememberClipDuration('x3', 20)
    expect(describeEvent(event({ id: 'x3' }))).toBe(`person · ${formatTime(1000)} · 20 s`)
  })
})
