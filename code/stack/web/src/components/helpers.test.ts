// Les fonctions pures des petits composants : App, ApiExplorer, CameraCard, CameraIndicators, CameraMosaic, GuestLink, Home, PlugPanel, PowerButton.
import { describe, expect, it } from 'vitest'
import { rememberClipDuration } from '@/lib/clipDurations'
import { describeEvent, formatTime } from '@/lib/format'
import type { Camera, CameraPower, EventRow, GuestInfo, HueLight, HueSensor, PlugState } from '@/types'
import { prettify } from './ApiExplorer/helpers'
import { eventsOf } from './App/helpers'
import { captionOf, clipLead, clipPathOf, liveCaption, orientationShown, temperatureItems } from './CameraCard/helpers'
import { lampLabel, plugLabel } from './CameraIndicators/helpers'
import { orderedCameras } from './CameraMosaic/helpers'
import { guestLink } from './GuestLink/helpers'
import { captionOf as homeCaption, playablePath } from './Home/helpers'
import { countdownText, elapsedText, signalText } from './PlugPanel/helpers'
import { statusText } from './PowerButton/helpers'

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

describe('ApiExplorer/helpers', () => {
  it('prettify met le JSON en forme, rend le reste tel quel', () => {
    expect(prettify('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(prettify('pas du json')).toBe('pas du json')
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

  it('liveCaption : avec ou sans taille', () => {
    expect(liveCaption(null)).toBe('Direct · MJPEG')
    expect(liveCaption({ width: 640, height: 360 })).toBe('Direct · MJPEG · 640×360')
  })

  it('captionOf : événement en cours, terminé, instant, direct', () => {
    rememberClipDuration('legende', 7)
    const done = event({ id: 'legende' })
    expect(captionOf(null, done, 'Direct')).toBe(`Clip · ${describeEvent(done)}`)
    expect(captionOf(null, event({ ended_at: null }), 'Direct')).toBe(describeEvent(event({ ended_at: null })))
    expect(captionOf(500, null, 'Direct')).toBe(`Image à ${formatTime(500)}`)
    expect(captionOf(null, null, 'Direct')).toBe('Direct')
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

describe('GuestLink/helpers', () => {
  const info = (over: Partial<GuestInfo>): GuestInfo => ({ key: 'sec ret', port: 8090, url: '', ...over })
  it('guestLink : adresse publique ou hôte de la WebApp, avec la clé', () => {
    expect(guestLink(info({}), 'mini')).toBe('https://mini:8090/?k=sec+ret')
    expect(guestLink(info({ url: 'https://pub.example/' }), 'mini')).toBe('https://pub.example/?k=sec+ret')
  })
})

describe('Home/helpers', () => {
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
  it('signalText', () => {
    expect(signalText(-50)).toBe('bon (-50 dBm)')
    expect(signalText(-65)).toBe('moyen (-65 dBm)')
    expect(signalText(-80)).toBe('faible (-80 dBm)')
  })
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

describe('PowerButton/helpers', () => {
  const power = (over: Partial<CameraPower>): CameraPower => ({
    camera: 'c',
    port: 1,
    on: true,
    powered: true,
    watts: 5,
    streaming: true,
    ...over,
  })
  it('statusText', () => {
    expect(statusText(power({ on: false, powered: true }))).toMatch(/.+/)
    expect(statusText(power({ on: false, powered: false }))).toMatch(/.+/)
    expect(statusText(power({ on: false, powered: true }))).not.toBe(statusText(power({ on: false, powered: false })))
    expect(statusText(power({ powered: false }))).toMatch(/.+/)
    expect(statusText(power({ streaming: false }))).toMatch(/.+/)
    expect(statusText(power({}))).toBe('')
  })
})
