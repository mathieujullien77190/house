import * as THREE from 'three'
import { KITCHEN, LAYOUT, ROOM } from '@/components/Kitchen3D/constants'
import { oldBrass } from '@/components/Kitchen3D/materials'
import type { FurnitureMaterials } from '@/components/Kitchen3D/materials'
import { box, bulbBall, cylinder, fixtureBulb } from '@/components/Kitchen3D/primitives'

/**
 * Un plafonnier à pétales, posé sous le plafond (son origine) : une rosace noire, huit grands pétales cerclés de noir qui partent du centre
 * et retombent vers l'extérieur en se chevauchant (un sur deux un peu plus bas), l'ampoule au milieu. Les pétales sont pleins, en cannage
 * (salon), ou `wire` : vides, tendus de rayons d'acier qui partent de leur pointe (bureau).
 */
export const petalLamp = (m: FurnitureMaterials, wire: boolean, name: string, size = 1): THREE.Group => {
  const group = new THREE.Group()
  const flower = new THREE.Group()
  flower.position.y = -0.14
  flower.scale.setScalar(size)
  for (let petal = 0; petal < 8; petal += 1) {
    const holder = new THREE.Group()
    holder.rotation.y = (petal / 8) * Math.PI * 2
    const leaf = new THREE.Group()
    leaf.scale.set(1, 1.6, 1)
    leaf.rotation.x = Math.PI / 2 + 0.22
    leaf.position.set(0, -(petal % 2) * 0.04, 0.42)
    leaf.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 28), m.black))
    if (wire) {
      // Les rayons : de la pointe du pétale (côté centre) vers son pourtour.
      for (let spoke = -5; spoke <= 5; spoke += 1) {
        const angle = (spoke / 5) * 2.4
        const acrossX = 0.3 * Math.sin(angle)
        const acrossY = 0.3 * Math.cos(angle) + 0.3
        const rod = box(0.004, Math.hypot(acrossX, acrossY), 0.004, m.black, acrossX / 2, acrossY / 2 - 0.3, 0)
        rod.rotation.z = Math.atan2(-acrossX, acrossY)
        leaf.add(rod)
      }
    } else {
      leaf.add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), m.wicker))
    }
    holder.add(leaf)
    flower.add(holder)
  }
  flower.add(fixtureBulb(bulbBall(0.055, 0, -0.12, 0), name))
  group.add(flower, cylinder(0.07, 0.07, 0.025, m.black, 0, -0.012, 0), box(0.012, 0.12, 0.012, m.black, 0, -0.08, 0))
  return group
}

/** Le grand luminaire en pétales de rotin au-dessus du salon, et le luminaire en verre strié du coin repas. */
export const lamps = (m: FurnitureMaterials): THREE.Group => {
  const group = new THREE.Group()
  // Le plafonnier du salon, à pétales de cannage.
  const flower = petalLamp(m, false, 'salon', 0.65)
  flower.position.set(-3.7, ROOM.height, 0.9)
  group.add(flower)
  // La suspension en verre du coin repas, avec son capuchon en bois.
  const { x: nookX, z: nookZ } = LAYOUT.nookLamp
  const glass = cylinder(0.1, 0.1, 0.28, m.glass, nookX - 0.3, 1.9, nookZ)
  group.add(fixtureBulb(bulbBall(0.05, nookX - 0.3, 1.9, nookZ), 'cuisine 2'))
  group.add(glass, cylinder(0.05, 0.05, 0.08, m.woodLight, nookX - 0.3, 2.1, nookZ), box(0.01, ROOM.height - 2.14, 0.01, m.black, nookX - 0.3, 2.14 + (ROOM.height - 2.14) / 2, nookZ))
  // Les deux ampoules suspendues au-dessus de la cloison de bar.
  for (const [index, [z, y]] of [[0.4, 1.74], [1, 1.74]].entries()) {
    // Rien qu'une ampoule ronde au bout de son fil, sous une douille de laiton.
    const barX = KITCHEN.xMin - 0.09
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m.bulb)
    globe.position.set(barX, y, z)
    group.add(box(0.006, ROOM.height - y - 0.1, 0.006, m.black, barX, (ROOM.height + y + 0.1) / 2, z), cylinder(0.02, 0.022, 0.05, oldBrass(), barX, y + 0.075, z), fixtureBulb(globe, `bar ${2 - index}`))
  }
  return group
}
