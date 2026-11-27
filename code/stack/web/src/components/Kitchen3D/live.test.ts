import * as THREE from 'three'
import { AC_LED, acMeshes, applyAcLed, applyClock, cameraMeshes } from './live'
import { box } from './primitives'

describe('applyClock', () => {
  const clock = () => {
    const root = new THREE.Group()
    const hour = new THREE.Group()
    hour.userData.clockHand = 'hour'
    const minute = new THREE.Group()
    minute.userData.clockHand = 'minute'
    const other = new THREE.Group()
    root.add(hour, minute, other)
    return { root, hour, minute, other }
  }

  it('met les deux aiguilles à l’heure, sans toucher au reste', () => {
    const { root, hour, minute, other } = clock()
    applyClock(root, new Date(2026, 10, 26, 3, 30, 0))
    expect(minute.rotation.z).toBeCloseTo(Math.PI)
    expect(hour.rotation.z).toBeCloseTo((3.5 / 12) * Math.PI * 2)
    expect(other.rotation.z).toBe(0)
  })

  it('l’après-midi, la petite aiguille repart de midi ; les secondes font avancer la grande', () => {
    const { root, hour, minute } = clock()
    applyClock(root, new Date(2026, 10, 26, 15, 0, 30))
    expect(minute.rotation.z).toBeCloseTo((0.5 / 60) * Math.PI * 2)
    expect(hour.rotation.z).toBeCloseTo(((3 + 0.5 / 60) / 12) * Math.PI * 2)
  })
})

describe('les clims', () => {
  const stage = () => {
    const root = new THREE.Group()
    const body = box(1, 0.3, 0.2, new THREE.MeshStandardMaterial(), 0, 2, 0)
    body.userData.acUnit = 'salon'
    const led = (id: string) => {
      const mesh = box(0.03, 0.015, 0.006, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0, 0)
      mesh.userData.acLed = id
      return mesh
    }
    const leds = [led('salon'), led('chambre-invite'), led('matou'), led('absente')]
    const plain = box(1, 1, 1, new THREE.MeshBasicMaterial({ color: 0x123456 }), 0, 0, 0)
    root.add(body, ...leds, plain)
    return { root, body, leds, plain }
  }
  const hexOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshBasicMaterial).color.getHex()

  it('acMeshes : les blocs à cliquer, avec l’identifiant de leur clim', () => {
    const { root, body } = stage()
    expect(acMeshes(root)).toEqual([{ id: 'salon', object: body }])
  })

  it('applyAcLed : vert en marche, rouge à l’arrêt, gris si on ne sait pas', () => {
    const { root, leds, plain } = stage()
    applyAcLed(root, { salon: true, 'chambre-invite': false, matou: null })
    expect(leds.map(hexOf)).toEqual([AC_LED.on, AC_LED.off, AC_LED.unknown, AC_LED.unknown])
    expect(hexOf(plain)).toBe(0x123456)
  })
})

describe('les caméras', () => {
  it('cameraMeshes : les modèles à cliquer, avec le nom de leur vraie caméra', () => {
    const root = new THREE.Group()
    const model = new THREE.Group()
    model.userData.camera = 'voliere-toit'
    root.add(model, new THREE.Group())
    expect(cameraMeshes(root)).toEqual([{ name: 'voliere-toit', object: model }])
  })
})
