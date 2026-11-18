import type { HueLight, HueRoom } from '@/types'
import { lanAcUnits, lanRooms, lanShutters, problemOf } from './helpers'

const light = (id: string, over: Partial<HueLight> = {}): HueLight => ({ id, name: `L${id}`, on: true, bri: 100, reachable: true, ...over })
const room = (lights: HueLight[]): HueRoom => ({ id: 'r', name: 'R', on: true, bri: null, lights })

describe('lanRooms', () => {
  it('range par zone, sans luminosité ni détecteur', () => {
    const rooms = lanRooms([room([light('9'), light('15', { bri: 50 })])])
    expect(rooms.length).toBeGreaterThan(0)
    for (const zone of rooms) {
      expect(zone.bri).toBeNull()
      expect(zone.sensors).toBeUndefined()
      for (const lamp of zone.lights) expect(lamp.bri).toBeNull()
    }
  })
})

describe('lanShutters', () => {
  it('garde les ordres permis, le reste devient null', () => {
    const [up, half, none] = lanShutters([
      { id: 'a', name: 'A', lastCommand: 'up' },
      { id: 'b', name: 'B', lastCommand: 'half' },
      { id: 'c', name: 'C', lastCommand: null },
    ])
    expect(up).toMatchObject({ id: 'a', lastCommand: 'up', auto: null, halfRunning: false })
    expect(half.lastCommand).toBeNull()
    expect(none.lastCommand).toBeNull()
  })
})

describe('lanAcUnits', () => {
  it('sans ailettes', () => {
    const [unit] = lanAcUnits([{ id: 's', name: 'S', reachable: true, power: true, mode: 'heat', targetTemp: 21, roomTemp: 19, fan: 'auto' }])
    expect(unit).toMatchObject({ id: 's', vane: null, wideVane: null })
  })
})

describe('problemOf', () => {
  it('un problème par réponse', () => {
    expect(problemOf(401, '')).toBe('locked')
    expect(problemOf(429, '')).toBe('locked')
    expect(problemOf(403, 'désactivé')).toBe('disabled')
    expect(problemOf(403, 'autre')).toBe('outside')
    expect(problemOf(503, '')).toBe('unconfigured')
    expect(problemOf(500, '')).toBe('unreachable')
  })
})
