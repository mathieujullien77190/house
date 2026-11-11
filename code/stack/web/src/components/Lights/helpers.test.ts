import type { HueAutomation, HueLight, HueRoom, HueSensor } from '@/types'
import { fromHousePlan } from '@/components/MapPlan/helpers'
import { LAMP_POSITIONS, LEGACY_STORAGE_KEY, PLAN_LAMP_POSITION, SIDE_ZONE } from './constants'
import { allLights, buildAutomationItems, buildZones, placedLampCount, planLamps, readLegacyPositions } from './helpers'

const light = (id: string, over: Partial<HueLight> = {}): HueLight => ({ id, name: `L${id}`, on: true, bri: 100, reachable: true, ...over })
const room = (lights: HueLight[]): HueRoom => ({ id: 'r', name: 'R', on: true, bri: null, lights })

describe('allLights', () => {
  it('réunit les pièces sans doublon, triées par identifiant, injoignable = éteinte', () => {
    const lights = allLights([room([light('10'), light('2', { reachable: false })]), room([light('10'), light('3')])])
    expect(lights.map((l) => l.id)).toEqual(['2', '3', '10'])
    expect(lights[0].on).toBe(false)
    expect(lights[1].on).toBe(true)
  })
})

describe('buildZones', () => {
  const sensor = (over: Partial<HueSensor>): HueSensor => ({
    id: '54',
    name: 'motion interieur',
    presence: true,
    presenceSince: null,
    temperature: 12.34,
    lux: 5,
    dark: true,
    battery: 90,
    reachable: true,
    ...over,
  })

  it('range les lampes par zone ; une lampe d’aucune zone n’est pas dans l’application', () => {
    const zones = buildZones([light('15', { bri: null, on: false }), light('9'), light('999', { bri: null, on: false })])
    // Dans l'ordre des zones (Chambre 1 avant SdB), sans groupe « À placer ».
    expect(zones.map((z) => z.id)).toEqual(['chambre-1', 'sdb'])
    expect(zones.flatMap((z) => z.lights.map((l) => l.id))).not.toContain('999')
    expect(zones[0]).toMatchObject({ on: false, bri: null })
    expect(zones[0]).not.toHaveProperty('sensors')
  })

  it('luminosité d’une zone : la première lampe allumée qui en a une, sinon la première qui en a une', () => {
    const zones = buildZones([light('9', { on: false, bri: 10 }), light('10', { on: true, bri: null }), light('19', { on: true, bri: 77 })])
    expect(zones[0].bri).toBe(77)
    const off = buildZones([light('9', { on: false, bri: 10 }), light('10', { on: false, bri: 20 })])
    expect(off[0].bri).toBe(10)
  })

  it('la volière porte ses détecteurs, états de mouvement et mesures écrits', () => {
    const [zone] = buildZones(
      [light('26')],
      [
        sensor({}),
        sensor({ id: '57', presence: false, presenceSince: '2026-11-02T14:44:00Z', temperature: null, lux: null, battery: null }),
      ],
    )
    expect(zone.sensors).toHaveLength(2)
    const [first, second] = zone.sensors ?? []
    expect(first).toMatchObject({
      motion: true,
      motionText: 'Mouvement',
      readings: ['12,3 °C', '5 lx · sombre', 'Pile 90 %'],
      reachable: true,
    })
    expect(second.motionText).toMatch(/^Calme depuis \d{2}\/\d{2}/)
    expect(second.readings).toEqual([])
  })

  it('états de mouvement : inconnu, calme sans date, lumière sans « sombre »', () => {
    const sensors = [sensor({ id: '54', presence: null }), sensor({ id: '57', presence: false, presenceSince: null, dark: false })]
    const [zone] = buildZones([light('26')], sensors)
    expect(zone.sensors?.[0].motionText).toBe('Mouvement inconnu')
    expect(zone.sensors?.[1].motionText).toBe('Calme')
    expect(zone.sensors?.[1].readings[1]).toBe('5 lx')
  })

  it('un détecteur absent du pont est ignoré', () => {
    const [zone] = buildZones([light('26')], [])
    expect(zone).not.toHaveProperty('sensors')
  })
})

describe('placedLampCount', () => {
  it('ne compte que les lampes d’une zone', () => {
    expect(placedLampCount([room([light('15'), light('9'), light('999')])])).toBe(2)
  })
})

describe('buildAutomationItems', () => {
  it('écrit le nom, « désactivée » et les lignes', () => {
    const items = buildAutomationItems([
      { id: '1', name: 'Soir', enabled: true, kind: 'horaire', lines: ['a', 'b'] },
      { id: '2', name: 'Nuit', enabled: false, kind: 'capteur', lines: ['c'] },
    ] as HueAutomation[])
    expect(items).toEqual([
      { id: '1', label: 'Soir', value: 'a · b' },
      { id: '2', label: 'Nuit (désactivée)', value: 'c' },
    ])
  })
})

describe('planLamps', () => {
  it('place gardée dans le plan : telle quelle, d’intérieur (sauf la lampe de la cage)', () => {
    const lamps = planLamps([light('1'), light('26')], { '1': { x: 1, y: 1 }, '26': { x: 5, y: 6 } }, {})
    expect(lamps[0]).toMatchObject({ id: '1', name: 'L1', on: true, reachable: true, brightness: 100, x: 1, y: 1, indoor: true })
    expect(lamps[1]).toMatchObject({ x: 5, y: 6, indoor: false })
  })

  it('la lampe de la cage a sa place de départ sur la carte', () => {
    const [lamp] = planLamps([light('26')], {}, { '26': { x: 1, y: 1 } })
    expect(lamp).toMatchObject({ ...PLAN_LAMP_POSITION })
  })

  it('ancienne position (héritée, puis LAMP_POSITIONS) convertie à la lecture', () => {
    const lamps = planLamps([light('1'), light('3')], {}, { '1': { x: 100, y: 150 } })
    expect(lamps[0]).toMatchObject({ ...fromHousePlan(100, 150), indoor: true })
    expect(lamps[1]).toMatchObject({ ...fromHousePlan(LAMP_POSITIONS['3'].x, LAMP_POSITIONS['3'].y), indoor: true })
  })

  it('l’héritée passe avant LAMP_POSITIONS', () => {
    const [lamp] = planLamps([light('3')], {}, { '3': { x: 10, y: 10 } })
    expect(lamp).toMatchObject(fromHousePlan(10, 10))
  })

  it('une ancienne position dans la zone « À placer » ou absente : la lampe n’est pas sur la carte', () => {
    const lamps = planLamps([light('1'), light('2'), light('3')], {}, { '1': { x: SIDE_ZONE.x, y: 5 } })
    expect(lamps.map((lamp) => lamp.id)).toEqual(['3'])
    expect(lamps[0]).toMatchObject({ ...fromHousePlan(LAMP_POSITIONS['3'].x, LAMP_POSITIONS['3'].y) })
  })
})

describe('positions héritées du navigateur', () => {
  beforeEach(() => localStorage.clear())
  it('lit, ignore le vide, le non-objet et le JSON cassé', () => {
    expect(readLegacyPositions()).toEqual({})
    localStorage.setItem(LEGACY_STORAGE_KEY, '{"1":{"x":1,"y":2}}')
    expect(readLegacyPositions()).toEqual({ '1': { x: 1, y: 2 } })
    localStorage.setItem(LEGACY_STORAGE_KEY, 'null')
    expect(readLegacyPositions()).toEqual({})
    localStorage.setItem(LEGACY_STORAGE_KEY, '[')
    expect(readLegacyPositions()).toEqual({})
  })
})
