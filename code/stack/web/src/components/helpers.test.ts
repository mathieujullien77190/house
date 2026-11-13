// Les fonctions pures des petits composants : App, CameraCard, CameraIndicators, CameraMosaic, Home, PlugPanel.
import { describe, expect, it } from 'vitest'
import { formatTime } from '@/lib/format'
import type { Camera, EventRow, HueLight, HueSensor, PlugState } from '@/types'
import { eventsOf } from './App/helpers'
import { clipLead, clipPathOf, orientationShown, temperatureItems } from './CameraCard/helpers'
import { lampLabel, plugLabel } from './CameraIndicators/helpers'
import { orderedCameras } from './CameraMosaic/helpers'
import { captionOf as homeCaption, playablePath } from './SavedClips/helpers'
import { countdownText, elapsedText } from './PlugPanel/helpers'

const event = (over: Partial<EventRow> = {}): EventRow =>
  ({
    id: 'e',
    camera: 'cam',
    label: 'person',
    started_at: 1000,
    ended_at: 1010,
    clip: '/clips/e',
    clip_h264: '/clips/e/h264',
    clip_audio: null,
    clip_started_at: null,
    saved: false,
    orientation: 'landscape',
    ...over,
  }) as EventRow

describe('App/helpers', () => {
  it('eventsOf garde les événements de la caméra', () => {
    expect(eventsOf([event({ id: 'a' }), event({ id: 'b', camera: 'autre' })], 'cam').map((e) => e.id)).toEqual(['a'])
  })
})

describe('CameraCard/helpers', () => {
  const sensor = (over: Partial<HueSensor>): HueSensor => ({ id: '57', name: 'motion exterieur', temperature: 9.5, ...over }) as HueSensor

  it('temperatureItems : une ligne par capteur connu, « inconnue » sans mesure', () => {
    expect(temperatureItems([sensor({})], ['57'])).toEqual([{ id: '57', label: 'Température · motion exterieur', value: '9,5 °C' }])
    expect(temperatureItems([sensor({ temperature: null })], ['57'])[0].value).toBe('inconnue')
    expect(temperatureItems([sensor({})], ['99'])).toEqual([])
  })

  it('clipLead : le début réel du clip, sinon déduit de la durée de la vidéo', () => {
    expect(clipLead(event({ clip_started_at: 995 }), null)).toBe(5)
    expect(clipLead(event(), null)).toBe(0)
    expect(clipLead(event(), Infinity)).toBe(0)
    expect(clipLead(event(), 20)).toBe(5)
    expect(clipLead(event(), 14)).toBe(2)
    expect(clipLead(event(), 5)).toBe(0)
    expect(clipLead(event({ ended_at: null }), 4)).toBe(2)
  })

  it('clipPathOf : H.264 si demandé et présent, sinon l’original', () => {
    expect(clipPathOf(event(), 'h264')).toBe('/clips/e/h264')
    expect(clipPathOf(event({ clip_h264: null }), 'h264')).toBe('/clips/e')
    expect(clipPathOf(event(), 'original')).toBe('/clips/e')
  })

  it('orientationShown : clip, image gardée, direct', () => {
    const camera: Camera = { name: 'cam', orientation: 'landscape' }
    expect(orientationShown(camera, event({ orientation: 'portrait' }), null, [])).toBe('portrait')
    const events = [
      event({ id: '1', started_at: 100, orientation: 'portrait' }),
      event({ id: '2', started_at: 200, orientation: 'landscape' }),
      event({ id: '3', started_at: 300, camera: 'autre', orientation: 'portrait' }),
    ]
    expect(orientationShown(camera, null, 250, events)).toBe('landscape')
    expect(orientationShown(camera, null, 150, events)).toBe('portrait')
    expect(orientationShown(camera, null, 50, events)).toBe('landscape')
    expect(orientationShown({ ...camera, orientation: 'portrait' }, null, null, events)).toBe('portrait')
  })
})

describe('CameraIndicators/helpers', () => {
  const lamp = (over: Partial<HueLight>): HueLight => ({ id: '26', name: 'P', on: true, bri: 1, reachable: true, ...over })
  it('lampLabel', () => {
    expect(lampLabel(lamp({}))).toBe('Lampe Perruche : allumée')
    expect(lampLabel(lamp({ on: false }))).toBe('Lampe Perruche : éteinte')
    expect(lampLabel(lamp({ reachable: false }))).toBe('Lampe Perruche : injoignable')
  })
  it('plugLabel', () => {
    expect(plugLabel({ on: true } as PlugState)).toBe('Prise : allumée')
    expect(plugLabel({ on: false } as PlugState)).toBe('Prise : éteinte')
  })
})

describe('CameraMosaic/helpers', () => {
  it('orderedCameras : l’ordre de la mosaïque, les inconnues à la suite', () => {
    const names = ['zeta', 'voliere-exterieur', 'alpha', 'voliere-interieur']
    const cameras = names.map((name): Camera => ({ name, orientation: 'landscape' }))
    expect(orderedCameras(cameras).map((c) => c.name)).toEqual(['voliere-interieur', 'voliere-exterieur', 'zeta', 'alpha'])
    expect(cameras.map((c) => c.name)).toEqual(names)
  })
})

describe('SavedClips/helpers', () => {
  it('playablePath : H.264 d’abord', () => {
    expect(playablePath(event())).toBe('/clips/e/h264')
    expect(playablePath(event({ clip_h264: null }))).toBe('/clips/e')
    expect(playablePath(event({ clip_h264: null, clip: null }))).toBeNull()
  })
  it('captionOf : jour et heure, durée si connue', () => {
    expect(homeCaption(event())).toBe(formatTime(1000))
    expect(homeCaption(event({ clip_started_at: 900 }), 14.6)).toBe(`${formatTime(900)} · 15 s`)
  })
})

describe('PlugPanel/helpers', () => {
  it('elapsedText', () => {
    expect(elapsedText(-5)).toBe('0 s')
    expect(elapsedText(45)).toBe('45 s')
    expect(elapsedText(205)).toBe('3 min 25 s')
    expect(elapsedText(3600 + 14 * 60 + 5)).toBe('1 h 14 min 5 s')
    expect(elapsedText(86400 * 2 + 3 * 3600)).toBe('2 j 3 h')
  })
  it('countdownText', () => {
    expect(countdownText(-1)).toBe('0 s')
    expect(countdownText(59)).toBe('59 s')
    expect(countdownText(754)).toBe('12 min 34 s')
  })
})
