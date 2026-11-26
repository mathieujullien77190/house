import * as THREE from 'three'
import { collectImages, fakeContext2d, loadImage, stubCanvasContext } from '@/test/canvas'
import { VIEW_LABEL } from './constants'
import { AC_LED, acMeshes, applyAcLed, applyClock, createScreenFeed, drawContained, SCREEN_BLUE, screenDistance, TV_BLACK } from './live'
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

describe('drawContained', () => {
  const image = (width: number, height: number): HTMLImageElement => {
    const element = document.createElement('img')
    loadImage(element, width, height)
    return element
  }

  it('en paysage : l’image entière, centrée, sur fond noir', () => {
    const context = fakeContext2d()
    const picture = image(1280, 720)
    drawContained(context as unknown as CanvasRenderingContext2D, picture, false)
    expect(context.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 640, 360)
    expect(context.translate).toHaveBeenCalledExactlyOnceWith(320, 180)
    expect(context.rotate).not.toHaveBeenCalled()
    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(picture, -320, -180, 640, 360)
    expect(context.restore).toHaveBeenCalledTimes(1)
  })

  it('en portrait : tournée d’un quart de tour, à la plus grande taille qui tient en hauteur', () => {
    const context = fakeContext2d()
    const picture = image(1280, 720)
    drawContained(context as unknown as CanvasRenderingContext2D, picture, true)
    expect(context.rotate).toHaveBeenCalledExactlyOnceWith(Math.PI / 2)
    // Tournée, elle fait 720 de large sur 1280 de haut : c'est la hauteur de l'écran (360) qui la limite.
    const scale = 360 / 1280
    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(picture, (-1280 * scale) / 2, (-720 * scale) / 2, 1280 * scale, 720 * scale)
  })
})

/** Deux écrans l'un derrière l'autre (la télé devant, tournée vers +z ; un écran du bureau derrière, tourné vers −z) et un meuble sans écran. */
const stage = () => {
  const images = collectImages()
  const root = new THREE.Group()
  const tv = box(1.2, 0.7, 0.005, new THREE.MeshBasicMaterial({ color: TV_BLACK }), 0, 1, 0)
  tv.userData.cameraScreen = 'tv'
  tv.userData.screenOff = TV_BLACK
  tv.userData.screenFacing = 1
  const desk = new THREE.Group()
  desk.position.set(0, 0, -2)
  const left = box(0.55, 0.31, 0.005, new THREE.MeshBasicMaterial({ color: SCREEN_BLUE }), 0, 1, 0)
  left.userData.cameraScreen = 'left'
  left.userData.screenOff = SCREEN_BLUE
  left.userData.screenFacing = -1
  desk.add(left)
  root.add(tv, desk, box(1, 1, 1, new THREE.MeshBasicMaterial(), 5, 0, 0))
  const feed = createScreenFeed(root)
  root.updateMatrixWorld(true)
  const materialOf = (mesh: THREE.Mesh) => mesh.material as THREE.MeshBasicMaterial
  const buttonOf = (mesh: THREE.Mesh) => mesh.children[0] as THREE.Mesh
  /** Un rayon qui part de `from` et vise `target`. */
  const ray = (from: THREE.Vector3, target: THREE.Vector3) => new THREE.Raycaster(from, target.clone().sub(from).normalize())
  return { images, root, tv, left, feed, materialOf, buttonOf, ray }
}

describe('createScreenFeed', () => {
  it('chaque écran reçoit son bouton « Voir », caché, en bas à droite pour qui le regarde', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { tv, left, buttonOf, images } = stage()
    expect(images).toHaveLength(2)
    const tvButton = buttonOf(tv)
    expect(tvButton.visible).toBe(false)
    expect((tvButton.geometry as THREE.PlaneGeometry).parameters).toMatchObject({ width: expect.closeTo(0.24), height: expect.closeTo(0.096) })
    expect(tvButton.position.x).toBeGreaterThan(0)
    expect(tvButton.position.y).toBeLessThan(0)
    expect(tvButton.position.z).toBeCloseTo(0.0035)
    expect(tvButton.rotation.y).toBe(0)
    // L'écran du bureau regarde de l'autre côté : son bouton est retourné, à droite pour qui est assis.
    const leftButton = buttonOf(left)
    expect(leftButton.position.x).toBeLessThan(0)
    expect(leftButton.position.z).toBeCloseTo(-0.0035)
    expect(leftButton.rotation.y).toBeCloseTo(Math.PI)
    // Son étiquette : un cartouche arrondi et le mot.
    expect(context.roundRect).toHaveBeenCalledTimes(2)
    expect(context.fillText).toHaveBeenLastCalledWith(VIEW_LABEL, 100, 42)
    expect(((tvButton.material as THREE.MeshBasicMaterial).map?.image as HTMLCanvasElement).width).toBe(200)
  })

  it('show ouvre le direct sur un écran, update y recopie l’image dix fois par seconde au plus', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { feed, tv, left, materialOf, buttonOf, images } = stage()
    feed.show('tv', '/live/voliere', true)
    expect(images[0].getAttribute('src')).toBe('/live/voliere')
    expect(images[1].getAttribute('src')).toBeNull()
    expect(buttonOf(tv).visible).toBe(true)
    expect(buttonOf(left).visible).toBe(false)
    expect(materialOf(tv).color.getHex()).toBe(0x0a0c10)
    // Tant que l'image n'est pas arrivée, rien n'est dessiné.
    feed.update(1000)
    expect(context.drawImage).not.toHaveBeenCalled()
    expect(materialOf(tv).map).toBeNull()
    loadImage(images[0], 1280, 720)
    feed.update(1000)
    expect(context.drawImage).toHaveBeenCalledTimes(1)
    // Caméra en portrait : tournée.
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2)
    const map = materialOf(tv).map as THREE.Texture
    expect((map.image as HTMLCanvasElement).width).toBe(640)
    expect((map.image as HTMLCanvasElement).height).toBe(360)
    expect(materialOf(tv).color.getHex()).toBe(0xffffff)
    const version = map.version
    feed.update(1050)
    expect(context.drawImage).toHaveBeenCalledTimes(1)
    feed.update(1100)
    expect(context.drawImage).toHaveBeenCalledTimes(2)
    expect(materialOf(tv).map).toBe(map)
    expect(map.version).toBeGreaterThan(version)
    // L'écran éteint n'est jamais redessiné.
    expect(materialOf(left).map).toBeNull()
  })

  it('show(null) referme le direct et rend à l’écran sa couleur d’écran éteint ; un écran inconnu est ignoré', () => {
    stubCanvasContext(fakeContext2d())
    const { feed, left, materialOf, buttonOf, images } = stage()
    feed.show('left', '/live/a')
    loadImage(images[1], 640, 360)
    feed.update(500)
    expect(materialOf(left).map).not.toBeNull()
    feed.show('left', '/live/b')
    expect(images[1].getAttribute('src')).toBe('/live/b')
    expect(materialOf(left).map).toBeNull()
    feed.show('left', null)
    expect(images[1].getAttribute('src')).toBeNull()
    expect(buttonOf(left).visible).toBe(false)
    expect(materialOf(left).color.getHex()).toBe(SCREEN_BLUE)
    feed.update(5000)
    expect(materialOf(left).map).toBeNull()
    feed.show('cave', '/live/a')
    expect(images.map((image) => image.getAttribute('src'))).toEqual([null, null])
  })

  it('sans contexte 2D : le direct reste ouvert mais rien n’est dessiné', () => {
    stubCanvasContext(null)
    const { feed, tv, materialOf, images } = stage()
    feed.show('tv', '/live/a')
    loadImage(images[0], 640, 360)
    feed.update(500)
    expect(materialOf(tv).map).toBeNull()
  })

  it('hit : l’écran touché par le rayon, le plus proche de l’œil', () => {
    stubCanvasContext(null)
    const { feed, ray } = stage()
    const center = new THREE.Vector3(0, 1, 0)
    // De devant, la télé cache l'écran du bureau ; de derrière, c'est lui le plus proche.
    expect(feed.hit(ray(new THREE.Vector3(0, 1, 5), center))).toBe('tv')
    expect(feed.hit(ray(new THREE.Vector3(0, 1, -5), center))).toBe('left')
    // Au bord de la télé, plus large : elle seule.
    expect(feed.hit(ray(new THREE.Vector3(0.5, 1, -5), new THREE.Vector3(0.5, 1, 0)))).toBe('tv')
    expect(feed.hit(ray(new THREE.Vector3(0, 3, 5), new THREE.Vector3(0, 3, 0)))).toBeNull()
  })

  it('button : le bouton « Voir » touché, seulement sur un écran qui montre un direct', () => {
    stubCanvasContext(null)
    const { feed, tv, buttonOf, ray } = stage()
    const at = buttonOf(tv).getWorldPosition(new THREE.Vector3())
    const aimed = ray(at.clone().add(new THREE.Vector3(0, 0, 3)), at)
    expect(feed.button(aimed)).toBeNull()
    feed.show('tv', '/live/a')
    expect(feed.button(aimed)).toBe('tv')
    expect(feed.button(ray(new THREE.Vector3(0, 1, 5), new THREE.Vector3(0, 1, 0)))).toBeNull()
  })

  it('frame : où est l’écran, sa taille et vers où il regarde', () => {
    stubCanvasContext(null)
    const { feed, root } = stage()
    const tv = feed.frame('tv')
    expect(tv?.center.distanceTo(new THREE.Vector3(0, 1, 0))).toBeCloseTo(0)
    expect(tv?.normal.distanceTo(new THREE.Vector3(0, 0, 1))).toBeCloseTo(0)
    expect(tv?.width).toBeCloseTo(1.2)
    expect(tv?.height).toBeCloseTo(0.7)
    const left = feed.frame('left')
    expect(left?.center.distanceTo(new THREE.Vector3(0, 1, -2))).toBeCloseTo(0)
    expect(left?.normal.distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0)
    expect(feed.frame('cave')).toBeNull()
    // Dans une scène tournée d'un quart de tour, l'écran regarde le long de x.
    root.rotation.y = Math.PI / 2
    root.updateMatrixWorld(true)
    const turned = feed.frame('tv')
    expect(turned?.normal.x).toBeCloseTo(1)
    expect(turned?.normal.z).toBeCloseTo(0)
    expect(turned?.width).toBeCloseTo(1.2)
  })

  it('dispose ferme les directs et libère les images des écrans', () => {
    stubCanvasContext(fakeContext2d())
    const { feed, tv, materialOf, images } = stage()
    feed.show('tv', '/live/a')
    loadImage(images[0], 640, 360)
    feed.update(500)
    const dispose = vi.spyOn(materialOf(tv).map as THREE.Texture, 'dispose')
    feed.dispose()
    expect(images[0].getAttribute('src')).toBeNull()
    expect(materialOf(tv).map).toBeNull()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

describe('screenDistance', () => {
  it('la distance où l’écran occupe la part voulue, limité par sa largeur ou par sa hauteur', () => {
    // Angle de 90° : la vue fait deux fois la distance en hauteur.
    expect(screenDistance(2, 1, 90, 1, 1)).toBeCloseTo(1)
    expect(screenDistance(2, 1, 90, 4, 1)).toBeCloseTo(0.5)
    expect(screenDistance(2, 1, 90, 1, 0.5)).toBeCloseTo(2)
  })
})
