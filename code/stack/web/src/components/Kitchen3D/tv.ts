import * as THREE from 'three'
import { SCREEN_OFF } from './constants'
import { cameraMeshes } from './live'

/** La télé du salon dans la scène : ce qu'elle expose au conteneur. */
export interface Tv {
  /** Les écrans (marqués `userData.tv` par le mobilier : la télé du salon, les deux écrans du bureau) : ce qu'on clique. Un seul montre l'image à la fois : celui qu'on a cliqué. */
  screens: THREE.Mesh[]
  /** Passe à la caméra suivante, sur cet écran (les autres sont éteints) ; après la dernière, il s'éteint aussi. */
  next: (screen: THREE.Mesh) => void
  /** Vrai si l'écran montre une caméra : il faut alors le redessiner avant chaque image. */
  active: () => boolean
  /** Dessine dans l'écran ce que voit la caméra du moment (rien si l'écran est éteint). `night` : il fait nuit, la caméra voit en infrarouge (image grise, éclairée par ses propres LED). */
  render: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, night?: boolean) => void
  dispose: () => void
}

/** La taille de l'image de la télé (px) et l'angle de vue vertical d'une caméra (une Reolink voit large : environ 90° à l'horizontale). */
const VIEW = { width: 1920, height: 1080, fov: 58 }

/**
 * Les réglages propres à certaines caméras, pour que la vue de la télé ressemble à la vraie : `fov` (un angle plus serré : zoom), `right` (la caméra tournée
 * vers la droite, en radians), `up` (vers le haut) et `portrait` (la caméra est montée de côté : image en hauteur, au milieu de l'écran, entre deux bandes noires).
 */
const TUNING: Record<string, { fov?: number; right?: number; up?: number; portrait?: boolean }> = {
  'voliere-toit': { fov: 44, right: -0.25 },
  'salon-de-jardin': { fov: 44, right: 0.3 },
  'voliere-exterieur': { portrait: true, up: 0.4, right: 0.25 },
  pommier: { right: 0.3 },
}

/**
 * La télé du salon et les deux écrans du bureau montrent, à la demande, ce que « voit » une caméra de la scène : pas la vraie image, mais la vue 3D prise de la place du modèle de
 * la caméra, dans sa direction. Un clic passe à la caméra suivante (dans l'ordre où la scène les porte) ; après la dernière, l'écran s'éteint.
 * L'image est dessinée dans une texture (`WebGLRenderTarget`) posée sur l'écran.
 */
export const createTv = (root: THREE.Object3D): Tv => {
  const screens: THREE.Mesh[] = []
  root.traverse((object) => {
    if (object.userData.tv === true) screens.push(object as THREE.Mesh)
  })
  const cameras = cameraMeshes(root)
  // Une image nette : pleine définition, et un filtrage qui tient quand on regarde l'écran de biais. (Pas de lissage multi-échantillons : avec lui, l'image restait noire ou gardait des restes de la précédente.)
  const target = new THREE.WebGLRenderTarget(VIEW.width, VIEW.height)
  target.texture.anisotropy = 8
  const eye = new THREE.PerspectiveCamera(VIEW.fov, VIEW.width / VIEW.height, 0.1, 150)
  // Elle voit la maison et le jardin (les deux couches de la scène, voir `layers.ts`) d'un seul coup.
  eye.layers.enableAll()
  const turnBack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
  const forward = new THREE.Vector3()
  let index = -1
  // La nuit : l'image passe en gris sur les écrans (un test ajouté à leur matériau), et une lumière posée sur la caméra fait ses LED infrarouges.
  const infrared = { value: 0 }
  for (const screen of screens) {
    // Chaque écran a son propre matériau : `buildScene` partage les matériaux identiques, et les écrans éteints se ressemblent tous (sans cela, allumer l'un allumait ou éteignait les autres).
    const paint = (screen.material as THREE.MeshBasicMaterial).clone()
    screen.material = paint
    paint.onBeforeCompile = (shader) => {
      shader.uniforms.infrared = infrared
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float infrared;\nvoid main() {')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  if (infrared > 0.5) diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));')
    }
  }
  const leds = new THREE.PointLight(0xffffff, 0, 18, 1)
  leds.layers.enableAll()
  leds.visible = false
  root.add(leds)
  return {
    screens,
    next: (shown) => {
      index = index + 1 >= cameras.length ? -1 : index + 1
      for (const screen of screens) {
        const on = index >= 0 && screen === shown
        const paint = screen.material as THREE.MeshBasicMaterial
        paint.map = on ? target.texture : null
        paint.color.set(on ? 0xffffff : SCREEN_OFF)
        paint.needsUpdate = true
      }
    },
    active: () => index >= 0 && screens.length > 0,
    render: (renderer, scene, night = false) => {
      if (index < 0 || screens.length === 0) return
      const model = cameras[index].object
      model.updateWorldMatrix(true, false)
      // Le modèle regarde vers son +z ; une caméra de three.js vers son −z : même place, demi-tour. L'œil est avancé devant l'objectif, pour ne pas voir le modèle lui-même.
      model.getWorldQuaternion(eye.quaternion)
      forward.set(0, 0, 1).applyQuaternion(eye.quaternion)
      model.getWorldPosition(eye.position).addScaledVector(forward, 0.25)
      eye.quaternion.multiply(turnBack)
      const tuning = TUNING[cameras[index].name] ?? {}
      eye.rotateY(-(tuning.right ?? 0))
      eye.rotateX(tuning.up ?? 0)
      // En portrait, l'image est haute et étroite : elle occupe le milieu de l'écran, le reste est noir.
      const wide = tuning.portrait ? Math.round((VIEW.height * VIEW.height) / VIEW.width) : VIEW.width
      eye.fov = tuning.portrait ? 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(VIEW.fov / 2)) * (VIEW.width / VIEW.height))) : (tuning.fov ?? VIEW.fov)
      eye.aspect = wide / VIEW.height
      eye.updateProjectionMatrix()
      // Tout l'écran est d'abord effacé en noir (sans découpe), puis l'image est dessinée dans sa part de l'écran : rien ne reste de l'image d'avant sur les côtés.
      target.scissorTest = false
      target.viewport.set(0, 0, VIEW.width, VIEW.height)
      renderer.setRenderTarget(target)
      renderer.clear()
      target.viewport.set((VIEW.width - wide) / 2, 0, wide, VIEW.height)
      target.scissor.set((VIEW.width - wide) / 2, 0, wide, VIEW.height)
      target.scissorTest = true
      // La nuit, les LED de la caméra éclairent ce qu'elle regarde, le temps de cette image.
      infrared.value = night ? 1 : 0
      leds.visible = night
      leds.intensity = night ? 14 : 0
      if (night) root.worldToLocal(leds.position.copy(eye.position))
      renderer.setRenderTarget(target)
      renderer.render(scene, eye)
      renderer.setRenderTarget(null)
      leds.visible = false
    },
    dispose: () => target.dispose(),
  }
}
