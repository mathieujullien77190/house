import * as THREE from 'three'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT, MAP_UNITS_PER_METER } from '@/components/MapPlan/constants'
import { KITCHEN, LAMP_LIGHT, PLAN_HOUSE, ROOM } from './constants'
import { BULB_OFF, box, cylinder } from './primitives'
import type { Lighting, SceneLamp } from './types'

/**
 * La place d'une lampe dans la scène, d'après sa place sur le plan de Home (unités de la carte). `null` hors de l'espace de vie
 * (chambres, salle de bain, escalier, jardin). D'ouest en est, le plan est à l'échelle (43,5 unités par mètre) ; du nord au sud, la
 * cuisine (2,8 m dans la scène) et le salon n'ont pas la même échelle que le plan : chacun est étiré sur sa propre profondeur.
 */
export const lampPlace = (planX: number, planY: number): { x: number; z: number } | null => {
  const houseX = planX - HOUSE_SHIFT
  const houseY = (planY * PLAN_HOUSE.height) / MAP_HOUSE_HEIGHT
  const { livingWest, east, kitchenSouth, height, stairsWest } = PLAN_HOUSE
  if (houseX < livingWest || houseX > east || houseY < 0 || houseY > height) return null
  if (houseY < kitchenSouth && houseX > stairsWest) return null
  const z = ROOM.zMin + (houseX - livingWest) / MAP_UNITS_PER_METER
  const x =
    houseY <= kitchenSouth
      ? KITCHEN.xMax - (houseY / kitchenSouth) * (KITCHEN.xMax - KITCHEN.xMin)
      : KITCHEN.xMin - ((houseY - kitchenSouth) / (height - kitchenSouth)) * (KITCHEN.xMin - ROOM.xMin)
  return { x, z }
}

interface Fixture {
  bulb: THREE.Mesh
  position: THREE.Vector3
}

interface Rig {
  light: THREE.PointLight
  /** L'ampoule dessinée pour une lampe qui n'a pas de luminaire dans la scène. */
  own: THREE.Group
  ownBulb: THREE.MeshBasicMaterial
}

const colorOf = (bulb: THREE.Mesh): THREE.Color => (bulb.material as THREE.MeshBasicMaterial).color

/**
 * L'éclairage de la scène par les vraies lampes Hue. Chaque lampe placée dans l'espace de vie a une source de lumière ; elle part du
 * luminaire dessiné le plus proche (à moins de `matchDistance`, un luminaire par lampe, les plus proches d'abord), sinon d'une ampoule
 * nue pendue au plafond à sa place. Allumée, sa lumière prend la couleur et l'intensité de la lampe ; éteinte ou injoignable, elle
 * n'éclaire pas et son ampoule est grise. `apply` se rappelle à chaque relecture du pont.
 */
export const createLighting = (root: THREE.Group): Lighting => {
  root.updateMatrixWorld(true)
  const fixtures: Fixture[] = []
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && mesh.userData.fixture === true) fixtures.push({ bulb: mesh, position: mesh.getWorldPosition(new THREE.Vector3()) })
  })
  const group = new THREE.Group()
  root.add(group)
  const rigs = new Map<string, Rig>()
  const cordMaterial = new THREE.MeshStandardMaterial({ color: 0x15171a })

  const rigOf = (id: string): Rig => {
    const existing = rigs.get(id)
    if (existing) return existing
    const light = new THREE.PointLight(LAMP_LIGHT.color, 0, 0, 2)
    const ownBulb = new THREE.MeshBasicMaterial({ color: BULB_OFF })
    const own = new THREE.Group()
    const cord = ROOM.height - LAMP_LIGHT.height
    own.add(cylinder(0.05, 0.05, 0.1, ownBulb, 0, 0, 0), box(0.01, cord, 0.01, cordMaterial, 0, cord / 2 + 0.05, 0))
    group.add(light, own)
    const rig = { light, own, ownBulb }
    rigs.set(id, rig)
    return rig
  }

  const apply = (lamps: SceneLamp[]) => {
    // Les paires lampe–luminaire possibles, des plus proches aux plus lointaines : chacun ne sert qu'une fois.
    const pairs = lamps
      .flatMap((lamp) => fixtures.map((fixture) => ({ lamp, fixture, distance: Math.hypot(fixture.position.x - lamp.x, fixture.position.z - lamp.z) })))
      .filter((pair) => pair.distance <= LAMP_LIGHT.matchDistance)
      .sort((a, b) => a.distance - b.distance)
    const fixtureOf = new Map<string, Fixture>()
    const taken = new Set<Fixture>()
    for (const { lamp, fixture } of pairs) {
      if (fixtureOf.has(lamp.id) || taken.has(fixture)) continue
      fixtureOf.set(lamp.id, fixture)
      taken.add(fixture)
    }
    for (const fixture of fixtures) if (!taken.has(fixture)) colorOf(fixture.bulb).set(BULB_OFF)

    const seen = new Set<string>()
    for (const lamp of lamps) {
      seen.add(lamp.id)
      const rig = rigOf(lamp.id)
      const fixture = fixtureOf.get(lamp.id)
      const lit = lamp.on && lamp.reachable
      const level = lit ? Math.max(LAMP_LIGHT.floor, (lamp.brightness ?? 254) / 254) : 0
      const color = new THREE.Color(lamp.color ?? LAMP_LIGHT.color)
      rig.light.color.copy(color)
      rig.light.intensity = level * LAMP_LIGHT.intensity
      const bulbColor = lit ? color.clone().lerp(new THREE.Color(0xffffff), 0.35) : new THREE.Color(BULB_OFF)
      if (fixture) {
        // Un peu sous l'ampoule dessinée : une lumière collée à son abat-jour l'éclairerait à blanc.
        rig.light.position.set(fixture.position.x, fixture.position.y - 0.12, fixture.position.z)
        colorOf(fixture.bulb).copy(bulbColor)
        rig.own.visible = false
      } else {
        rig.light.position.set(lamp.x, LAMP_LIGHT.height - 0.12, lamp.z)
        rig.own.position.set(lamp.x, LAMP_LIGHT.height, lamp.z)
        rig.ownBulb.color.copy(bulbColor)
        rig.own.visible = true
      }
    }
    for (const [id, rig] of rigs) {
      if (seen.has(id)) continue
      group.remove(rig.light, rig.own)
      rig.light.dispose()
      rigs.delete(id)
    }
  }

  return { apply }
}
