import * as THREE from 'three'
import { SCREEN_OFF } from './constants'
import { createTv } from './tv'

/** Le modèle d'une caméra de la scène : un groupe marqué du nom de la vraie, qui regarde vers son +z. */
const cameraAt = (root: THREE.Object3D, name: string, x: number, turn: number): THREE.Group => {
  const model = new THREE.Group()
  model.position.set(x, 2, 1)
  model.rotation.y = turn
  model.userData.camera = name
  root.add(model)
  return model
}

/** Une scène de deux écrans (qui partagent leur matériau, comme après `buildScene`) et de trois caméras : une en portrait, une zoomée, une sans réglage. */
const stage = () => {
  const scene = new THREE.Scene()
  const root = new THREE.Group()
  scene.add(root)
  const off = new THREE.MeshBasicMaterial({ color: SCREEN_OFF })
  const [tvScreen, monitor] = [new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.005), off), new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.31, 0.005), off)]
  tvScreen.userData.tv = true
  monitor.userData.tv = true
  root.add(tvScreen, monitor, new THREE.Mesh(new THREE.BoxGeometry(), off))
  const models = [cameraAt(root, 'voliere-exterieur', 0, 0), cameraAt(root, 'voliere-toit', 3, Math.PI / 2), cameraAt(root, 'ailleurs', 6, Math.PI)]
  const tv = createTv(root)
  const leds = root.children.at(-1) as THREE.PointLight
  // Un faux rendu : il retient la cible du moment et, à chaque image, ce qu'il voit (l'œil, la part de l'écran dessinée, les LED).
  let target: THREE.WebGLRenderTarget | null = null
  const shots: { eye: THREE.PerspectiveCamera; viewport: number[]; scissor: number[]; scissorTest: boolean; leds: { visible: boolean; intensity: number; position: number[] } }[] = []
  const clears: { viewport: number[]; scissorTest: boolean }[] = []
  const renderer = {
    setRenderTarget: vi.fn((next: THREE.WebGLRenderTarget | null) => {
      target = next
    }),
    clear: vi.fn(() => {
      const current = target as THREE.WebGLRenderTarget
      clears.push({ viewport: current.viewport.toArray(), scissorTest: current.scissorTest })
    }),
    render: vi.fn((_scene: THREE.Scene, eye: THREE.PerspectiveCamera) => {
      const current = target as THREE.WebGLRenderTarget
      shots.push({ eye, viewport: current.viewport.toArray(), scissor: current.scissor.toArray(), scissorTest: current.scissorTest, leds: { visible: leds.visible, intensity: leds.intensity, position: leds.position.toArray() } })
    }),
  }
  const paintOf = (screen: THREE.Mesh) => screen.material as THREE.MeshBasicMaterial
  return { scene, root, tv, tvScreen, monitor, models, leds, renderer, shots, clears, paintOf, draw: (night?: boolean) => tv.render(renderer as unknown as THREE.WebGLRenderer, scene, night), currentTarget: () => target }
}

describe('createTv', () => {
  it('les écrans marqués `tv` se cliquent, chacun avec son propre matériau, éteints ; les LED infrarouges attendent, cachées', () => {
    const { tv, tvScreen, monitor, leds, paintOf, root } = stage()
    expect(tv.screens).toEqual([tvScreen, monitor])
    // Sans cela, allumer un écran allumerait les autres (les écrans éteints partagent un matériau).
    expect(paintOf(tvScreen)).not.toBe(paintOf(monitor))
    expect(paintOf(tvScreen)).not.toBe((root.children[2] as THREE.Mesh).material)
    for (const screen of tv.screens) {
      expect(paintOf(screen).color.getHex()).toBe(SCREEN_OFF)
      expect(paintOf(screen).map).toBeNull()
    }
    expect(tv.active()).toBe(false)
    expect(leds.isPointLight).toBe(true)
    expect(leds.visible).toBe(false)
    expect(leds.intensity).toBe(0)
    const all = new THREE.Layers()
    all.enableAll()
    expect(leds.layers.mask).toBe(all.mask)
  })

  it('un clic montre la caméra suivante sur l’écran cliqué, les autres restent éteints ; après la dernière, tout s’éteint', () => {
    const { tv, tvScreen, monitor, paintOf } = stage()
    tv.next(tvScreen)
    expect(tv.active()).toBe(true)
    const image = paintOf(tvScreen).map as THREE.Texture
    expect(image.isTexture).toBe(true)
    expect(image.anisotropy).toBe(8)
    const size = image.image as { width: number; height: number }
    expect([size.width, size.height]).toEqual([1920, 1080])
    expect(paintOf(tvScreen).color.getHex()).toBe(0xffffff)
    expect(paintOf(monitor).map).toBeNull()
    expect(paintOf(monitor).color.getHex()).toBe(SCREEN_OFF)
    // On change d'écran en cours de route : la caméra suivante s'y montre, le premier s'éteint.
    tv.next(monitor)
    expect(paintOf(monitor).map).toBe(image)
    expect(paintOf(monitor).color.getHex()).toBe(0xffffff)
    expect(paintOf(tvScreen).map).toBeNull()
    expect(paintOf(tvScreen).color.getHex()).toBe(SCREEN_OFF)
    tv.next(monitor)
    expect(tv.active()).toBe(true)
    // Trois caméras : le quatrième clic éteint.
    tv.next(monitor)
    expect(tv.active()).toBe(false)
    for (const screen of tv.screens) {
      expect(paintOf(screen).map).toBeNull()
      expect(paintOf(screen).color.getHex()).toBe(SCREEN_OFF)
    }
    // Et le tour recommence.
    tv.next(tvScreen)
    expect(paintOf(tvScreen).map).toBe(image)
  })

  it('éteinte : rien n’est dessiné', () => {
    const { renderer, draw } = stage()
    draw()
    expect(renderer.setRenderTarget).not.toHaveBeenCalled()
    expect(renderer.render).not.toHaveBeenCalled()
  })

  it('allumée : la vue est prise de la place de la caméra, 25 cm devant son objectif, dans sa direction, puis le rendu revient à l’écran', () => {
    const { tv, tvScreen, models, scene, renderer, shots, clears, draw, currentTarget } = stage()
    // La troisième caméra, sans réglage : plein écran, angle de 58°.
    tv.next(tvScreen)
    tv.next(tvScreen)
    tv.next(tvScreen)
    draw()
    expect(renderer.render).toHaveBeenCalledTimes(1)
    expect(renderer.render.mock.calls[0][0]).toBe(scene)
    const [{ eye, viewport, scissor, scissorTest }] = shots
    expect(eye.isPerspectiveCamera).toBe(true)
    expect(eye.fov).toBe(58)
    expect(eye.aspect).toBeCloseTo(1920 / 1080)
    // Le modèle (tourné d'un demi-tour) regarde vers −z : l'œil est 25 cm devant lui, et regarde du même côté.
    const place = models[2].getWorldPosition(new THREE.Vector3())
    expect(eye.position.toArray()).toEqual([expect.closeTo(place.x), expect.closeTo(place.y), expect.closeTo(place.z - 0.25)])
    const gaze = eye.getWorldDirection(new THREE.Vector3())
    expect(gaze.toArray()).toEqual([expect.closeTo(0), expect.closeTo(0), expect.closeTo(-1)])
    // Elle voit la maison et le jardin.
    const all = new THREE.Layers()
    all.enableAll()
    expect(eye.layers.mask).toBe(all.mask)
    // Tout l'écran est d'abord effacé, sans découpe ; puis l'image est dessinée dans tout l'écran.
    expect(clears).toEqual([{ viewport: [0, 0, 1920, 1080], scissorTest: false }])
    expect(viewport).toEqual([0, 0, 1920, 1080])
    expect(scissor).toEqual([0, 0, 1920, 1080])
    expect(scissorTest).toBe(true)
    // À la fin, le rendu repart vers l'écran.
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(null)
    expect(currentTarget()).toBeNull()
  })

  it('les réglages d’une caméra : zoomée et tournée vers la gauche (toit de la volière), en portrait entre deux bandes noires (volière extérieur)', () => {
    const { tv, tvScreen, models, shots, clears, draw } = stage()
    // La première : montée de côté. Son image, haute et étroite, occupe le milieu de l'écran.
    tv.next(tvScreen)
    draw()
    const wide = Math.round((1080 * 1080) / 1920)
    expect(shots[0].viewport).toEqual([(1920 - wide) / 2, 0, wide, 1080])
    expect(shots[0].scissor).toEqual([(1920 - wide) / 2, 0, wide, 1080])
    expect(shots[0].eye.aspect).toBeCloseTo(wide / 1080)
    // Son grand angle (58° dans le sens de la largeur du capteur) est maintenant vertical.
    expect(shots[0].eye.fov).toBeCloseTo(2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(29)) * (16 / 9))))
    expect(clears[0]).toEqual({ viewport: [0, 0, 1920, 1080], scissorTest: false })
    // Tournée de 0,25 rad vers la droite et de 0,4 rad vers le haut.
    const up = shots[0].eye.getWorldDirection(new THREE.Vector3())
    expect(up.y).toBeCloseTo(Math.sin(0.4))
    expect(Math.atan2(-up.x, up.z)).toBeCloseTo(0.25)
    // La deuxième : un angle plus serré (44°), tournée de 0,25 rad vers la gauche ; plein écran.
    tv.next(tvScreen)
    draw()
    expect(shots[1].eye.fov).toBe(44)
    expect(shots[1].eye.aspect).toBeCloseTo(1920 / 1080)
    expect(shots[1].viewport).toEqual([0, 0, 1920, 1080])
    const place = models[1].getWorldPosition(new THREE.Vector3())
    expect(shots[1].eye.position.toArray()).toEqual([expect.closeTo(place.x + 0.25), expect.closeTo(place.y), expect.closeTo(place.z)])
    const gaze = shots[1].eye.getWorldDirection(new THREE.Vector3())
    expect(gaze.y).toBeCloseTo(0)
    expect(Math.atan2(gaze.z, gaze.x)).toBeCloseTo(-0.25)
  })

  it('la nuit : l’image passe en gris et les LED de la caméra éclairent ce qu’elle regarde, le temps de l’image', () => {
    const { tv, tvScreen, leds, shots, paintOf, draw, root } = stage()
    root.position.set(1, 0, 0)
    root.updateMatrixWorld(true)
    // Le test de gris est ajouté au programme de chaque écran, avec une variable commune.
    const shader = { uniforms: {} as Record<string, { value: number }>, fragmentShader: 'void main() {\n  #include <map_fragment>\n}' }
    paintOf(tvScreen).onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.fragmentShader).toContain('uniform float infrared;\nvoid main() {')
    expect(shader.fragmentShader).toContain('#include <map_fragment>\n  if (infrared > 0.5) diffuseColor.rgb = vec3(dot(')
    expect(shader.uniforms.infrared.value).toBe(0)
    tv.next(tvScreen)
    draw(true)
    expect(shader.uniforms.infrared.value).toBe(1)
    expect(shots[0].leds.visible).toBe(true)
    expect(shots[0].leds.intensity).toBe(14)
    // Posées sur l'œil, dans le repère de la scène (ici décalée d'un mètre).
    const eye = shots[0].eye.position
    expect(shots[0].leds.position).toEqual([expect.closeTo(eye.x - 1), expect.closeTo(eye.y), expect.closeTo(eye.z)])
    // L'image faite, elles s'éteignent : elles n'éclairent pas la scène que voit l'utilisateur.
    expect(leds.visible).toBe(false)
    // Le jour revenu : en couleurs, sans LED.
    draw(false)
    expect(shader.uniforms.infrared.value).toBe(0)
    expect(shots[1].leds).toEqual({ visible: false, intensity: 0, position: shots[0].leds.position })
  })

  it('sans écran ni caméra dans la scène : jamais allumée, rien à dessiner', () => {
    const renderer = { setRenderTarget: vi.fn(), clear: vi.fn(), render: vi.fn() }
    // Des caméras, mais aucun écran.
    const blind = new THREE.Group()
    cameraAt(blind, 'ailleurs', 0, 0)
    const noScreen = createTv(blind)
    expect(noScreen.screens).toEqual([])
    noScreen.next(new THREE.Mesh())
    expect(noScreen.active()).toBe(false)
    noScreen.render(renderer as unknown as THREE.WebGLRenderer, new THREE.Scene())
    // Un écran, mais aucune caméra : le clic le laisse éteint.
    const empty = new THREE.Group()
    const screen = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: SCREEN_OFF }))
    screen.userData.tv = true
    empty.add(screen)
    const noCamera = createTv(empty)
    noCamera.next(screen)
    expect(noCamera.active()).toBe(false)
    expect((screen.material as THREE.MeshBasicMaterial).map).toBeNull()
    noCamera.render(renderer as unknown as THREE.WebGLRenderer, new THREE.Scene())
    expect(renderer.render).not.toHaveBeenCalled()
  })

  it('au démontage, la texture de l’écran est libérée', () => {
    const dispose = vi.spyOn(THREE.WebGLRenderTarget.prototype, 'dispose')
    const { tv } = stage()
    tv.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
