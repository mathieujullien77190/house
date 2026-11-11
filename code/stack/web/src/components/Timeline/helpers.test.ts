import type { EventRow } from '@/types'
import { MAX_REFRESH_MS, MAX_TICKS, MAX_WINDOW, MIN_REFRESH_MS, MIN_WINDOW, TICK_STEPS } from './constants'
import {
  alongOf,
  axisLength,
  buildCoverage,
  buildMarkers,
  buildTicks,
  clampWindow,
  fetchBucket,
  focusOn,
  fractionAlong,
  liveEnd,
  maxTicksFor,
  mergeEvents,
  nearestTime,
  positionOf,
  presetOf,
  refreshEvery,
  secondsOf,
  shiftSeconds,
  tickStep,
  timeAt,
} from './helpers'

const event = (id: string, started_at: number, ended_at: number | null = started_at + 10): EventRow =>
  ({ id, camera: 'c', label: 'person', started_at, ended_at, clip_started_at: null }) as EventRow

describe('fenêtre et raccourcis', () => {
  it('secondsOf / presetOf', () => {
    expect(secondsOf('1h')).toBe(3600)
    expect(secondsOf('zzz' as never)).toBe(600)
    expect(presetOf(3600)).toBe('1h')
    expect(presetOf(1234)).toBe('')
  })
  it('clampWindow borne et arrondit', () => {
    expect(clampWindow(1)).toBe(MIN_WINDOW)
    expect(clampWindow(1e12)).toBe(MAX_WINDOW)
    expect(clampWindow(100.4)).toBe(100)
  })
  it('refreshEvery est borné', () => {
    expect(refreshEvery(60)).toBe(MIN_REFRESH_MS)
    expect(refreshEvery(1e9)).toBe(MAX_REFRESH_MS)
    expect(refreshEvery(24000)).toBe(200_000 > MAX_REFRESH_MS ? MAX_REFRESH_MS : 200_000)
    expect(refreshEvery(1200)).toBe(10_000)
  })
  it('liveEnd, positionOf, timeAt', () => {
    expect(liveEnd(1000, 100)).toBe(1050)
    expect(positionOf(950, 1000, 100)).toBe(50)
    expect(timeAt(0.5, 1000, 100)).toBe(950)
  })
  it('fetchBucket change quand la fenêtre a assez avancé', () => {
    expect(fetchBucket(1000, 60)).toBe(fetchBucket(1005, 60))
    expect(fetchBucket(1000, 60)).not.toBe(fetchBucket(1010, 60))
    expect(fetchBucket(1000, 6000)).toBe(Math.floor(1000 / 600))
  })
  it('nearestTime', () => {
    expect(nearestTime([], 5)).toBeNull()
    expect(nearestTime([1, 10, 20], 12)).toBe(10)
    expect(nearestTime([1, 10, 20], 19)).toBe(20)
  })
})

describe('graduations', () => {
  it('maxTicksFor : selon la largeur, inconnue = max', () => {
    expect(maxTicksFor(0)).toBe(MAX_TICKS)
    expect(maxTicksFor(10)).toBe(2)
    expect(maxTicksFor(700)).toBe(10)
    expect(maxTicksFor(100000)).toBe(MAX_TICKS)
    expect(maxTicksFor(480, true)).toBe(10)
  })
  it('tickStep : le plus petit pas qui convient, le dernier sinon', () => {
    expect(tickStep(60)).toBe(5)
    expect(tickStep(600)).toBe(60)
    expect(tickStep(1e9)).toBe(TICK_STEPS[TICK_STEPS.length - 1])
    expect(tickStep(600, 2)).toBe(300)
  })
  it.each([
    [60, 5],
    [600, 60],
    [86400, 7200],
    [14 * 86400, 86400],
  ])('buildTicks pour %i s a des graduations espacées d’au moins %i s', (seconds) => {
    const end = Math.floor(Date.UTC(2026, 10, 8, 12, 0, 0) / 1000)
    const ticks = buildTicks(seconds, end)
    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.length).toBeLessThanOrEqual(MAX_TICKS)
    for (const tick of ticks) {
      expect(tick.x).toBeGreaterThan(1)
      expect(tick.x).toBeLessThan(99)
      expect(tick.label.length).toBeGreaterThan(0)
    }
  })
  it('libellés : secondes sous la minute, jour au-delà', () => {
    const end = Math.floor(Date.UTC(2026, 10, 8, 12, 0, 0) / 1000)
    expect(buildTicks(60, end)[0].label).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(buildTicks(600, end)[0].label).toMatch(/^\d{2}:\d{2}$/)
    expect(buildTicks(14 * 86400, end)[0].label).not.toMatch(/:/)
  })
})

describe('événements', () => {
  it('mergeEvents : les récents l’emportent, plus récents d’abord', () => {
    const merged = mergeEvents([event('a', 100, null)], [event('a', 100, 110), event('b', 200)])
    expect(merged.map((e) => e.id)).toEqual(['b', 'a'])
    expect(merged[1].ended_at).toBeNull()
  })

  it('buildMarkers : place, borne, marque sélectionné et en cours', () => {
    const events = [event('new', 960, null), event('old', 920, 930), event('hors', 10, 20), event('futur', 5000, 5010)]
    const { markers } = buildMarkers(events, 100, 1000, 'old', 980)
    expect(markers.map((m) => m.event.id)).toEqual(['old', 'new'])
    const old = markers[0]
    expect(old.selected).toBe(true)
    expect(old.ongoing).toBe(false)
    expect(old.x).toBeCloseTo(15)
    expect(markers[1].ongoing).toBe(true)
    // en cours : s'arrête à maintenant (980), jamais dans le futur
    expect(markers[1].x + markers[1].width).toBeCloseTo(80, 0)
  })
  it('buildMarkers : un événement déjà commencé avant la fenêtre commence à 0 ; un très court garde une largeur minimale ; au bord droit il reste dedans', () => {
    const { markers } = buildMarkers([event('before', 800, 950), event('court', 960, 960), event('bord', 1000, 1000)], 100, 1000, '', 1000)
    const byId = Object.fromEntries(markers.map((m) => [m.event.id, m]))
    expect(byId.before.x).toBe(0)
    expect(byId.court.width).toBeGreaterThan(1)
    expect(byId.bord.x + byId.bord.width).toBeLessThanOrEqual(100)
  })

  it('buildMarkers : le bloc couvre tout le clip, du début réel de la vidéo à un peu après la fin', () => {
    const withClip = { ...event('clip', 950, 960), clip_started_at: 940 } as EventRow
    const { markers } = buildMarkers([withClip], 100, 1000, '', 1000)
    expect(markers[0].x).toBeCloseTo(40, 0)
    expect(markers[0].x + markers[0].width).toBeCloseTo(70, 0)
  })

  it('buildCoverage : des plages d’images rapprochées', () => {
    const segments = buildCoverage([900, 960, 1500, 1560], 1000, 2000)
    expect(segments).toHaveLength(2)
    expect(buildCoverage([], 100, 1000)).toEqual([])
    // hors de la fenêtre à droite : rien
    expect(buildCoverage([5000], 100, 1000)).toEqual([])
    // une seule image : une plage
    expect(buildCoverage([990], 100, 1000)).toHaveLength(1)
  })

  it('focusOn : centre l’événement, durée = part de l’axe', () => {
    expect(focusOn(event('e', 1000, 1100), 0.5, 5000)).toEqual({ seconds: 200, end: 1150 })
    expect(focusOn(event('e', 1000, null), 0.5, 1060)).toEqual({ seconds: 120, end: 1090 })
    // durée nulle : 1 s au moins, fenêtre au minimum
    expect(focusOn(event('e', 1000, 1000), 0.5, 5000).seconds).toBe(MIN_WINDOW)
  })
})

describe('gestes', () => {
  it('alongOf / axisLength', () => {
    expect(alongOf({ clientX: 1, clientY: 2 }, false)).toBe(1)
    expect(alongOf({ clientX: 1, clientY: 2 }, true)).toBe(2)
    expect(axisLength({ clientWidth: 10, clientHeight: 20 }, false)).toBe(10)
    expect(axisLength({ clientWidth: 10, clientHeight: 20 }, true)).toBe(20)
  })
  it('fractionAlong : horizontal ancien à gauche, vertical récent en haut, borné, rect nul toléré', () => {
    const rect = { left: 100, top: 50, width: 200, height: 400 } as DOMRect
    expect(fractionAlong(200, rect, false)).toBe(0.5)
    expect(fractionAlong(0, rect, false)).toBe(0)
    expect(fractionAlong(1000, rect, false)).toBe(1)
    expect(fractionAlong(50, rect, true)).toBe(1)
    expect(fractionAlong(450, rect, true)).toBe(0)
    expect(fractionAlong(0, { left: 0, top: 0, width: 0, height: 0 } as DOMRect, false)).toBe(0)
    expect(fractionAlong(0, { left: 0, top: 0, width: 0, height: 0 } as DOMRect, true)).toBe(1)
  })
  it('shiftSeconds : le contenu suit le doigt', () => {
    expect(shiftSeconds(50, 100, 600, false)).toBe(-300)
    expect(shiftSeconds(50, 100, 600, true)).toBe(300)
    expect(shiftSeconds(50, 0, 600, false)).toBe(-30000)
  })
})
