import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Button } from '@house/ui'
import { disposeObject, supportsWebGL } from '@/lib/three'
import { useLampPlan } from '@/lib/useLampPlan'
import { usePlan } from '@/lib/usePlan'
import {
  ARIA_LABEL,
  BUTTONS_CLASS,
  HINT,
  HINT_CLASS,
  HOOD_LABEL,
  HOST_CLASS,
  INTRO,
  INTRO_CLASS,
  LAMPS_ON_TEXT,
  NO_WEBGL_TEXT,
  RESET_LABEL,
  START,
  TARGET,
  TITLE,
  TITLE_CLASS,
  TOP,
  TOP_LABEL,
  VIEW_HEIGHT,
} from './constants'
import { buildScene } from './helpers'
import { createLighting, lampPlace } from './lighting'
import type { Kitchen3DProps, SceneHandle, SceneLamp } from './types'

/**
 * L'espace de vie de la maison en 3D (cuisine, coin repas, entrée, salon, bureau), éclairé par les vraies lampes Hue : chaque lampe
 * placée sur le plan de Home dans ces pièces allume la scène avec son intensité et sa couleur du moment (relues toutes les 5 s).
 */
const Kitchen3D = ({ apiKey }: Kitchen3DProps) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [supported] = useState(supportsWebGL)
  const [showHood, setShowHood] = useState(true)
  const plan = usePlan(apiKey)
  const { lamps } = useLampPlan(apiKey, plan.items, true)
  // Les lampes du pont qui sont dans l'espace de vie, à leur place dans la scène.
  const sceneLamps: SceneLamp[] = lamps.flatMap((lamp) => {
    const place = lamp.waiting ? null : lampPlace(lamp.x, lamp.y)
    return place ? [{ id: lamp.id, ...place, on: lamp.on, reachable: lamp.reachable, brightness: lamp.brightness ?? null, color: lamp.color ?? null }] : []
  })
  const lampsKey = JSON.stringify(sceneLamps)

  // Crée la scène à l'ouverture et la détruit ensuite.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !supported) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const parts = buildScene()
    scene.add(parts.root)
    // Une lumière d'ambiance faible : ce sont les lampes de la maison qui éclairent la pièce.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a7a, 0.45))
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.5)
    sun.position.set(3, 9, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(4096, 4096)
    sun.shadow.camera.left = -8
    sun.shadow.camera.right = 8
    sun.shadow.camera.top = 8
    sun.shadow.camera.bottom = -8
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 30
    sun.shadow.bias = -0.0005
    scene.add(sun)
    const lighting = createLighting(parts.root)

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.minDistance = 1
    controls.maxDistance = 25
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    // Le clic molette tourne la vue comme le clic gauche (par défaut il zoomait) ; sans preventDefault, le navigateur lance son défilement automatique.
    controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE
    const noAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    host.addEventListener('mousedown', noAutoscroll)

    const lookFrom = (from: { x: number; y: number; z: number }) => {
      camera.position.set(from.x, from.y, from.z)
      controls.target.set(TARGET.x, TARGET.y, TARGET.z)
      controls.update()
    }
    lookFrom(START)

    const resize = () => {
      const width = host.clientWidth
      if (width === 0) return
      renderer.setSize(width, VIEW_HEIGHT)
      camera.aspect = width / VIEW_HEIGHT
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    // Pas de rendu quand la vue est hors de l'écran.
    let visible = true
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    visibility.observe(host)

    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      if (!visible) return
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    sceneRef.current = { controls, hood: parts.hood, lighting, resetView: () => lookFrom(START), topView: () => lookFrom(TOP) }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('mousedown', noAutoscroll)
      visibility.disconnect()
      controls.dispose()
      disposeObject(scene)
      sun.shadow.map?.dispose()
      renderer.dispose()
      // Libère le contexte WebGL tout de suite au lieu d'attendre le ramasse-miettes.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [supported])

  // Applique le réglage du bouton à la scène existante.
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.hood.visible = showHood
  }, [showHood, supported])

  // Les lampes du pont éclairent la scène : à chaque changement d'état (allumée, intensité, couleur) ou de place.
  useEffect(() => {
    sceneRef.current?.lighting.apply(JSON.parse(lampsKey) as SceneLamp[])
  }, [lampsKey, supported])

  const lit = sceneLamps.filter((lamp) => lamp.on && lamp.reachable).length
  return (
    <section>
      <h2 className={TITLE_CLASS}>{TITLE}</h2>
      <p className={INTRO_CLASS}>{INTRO}</p>
      {!supported ? (
        <p className={INTRO_CLASS}>{NO_WEBGL_TEXT}</p>
      ) : (
        <div>
          <div className={BUTTONS_CLASS}>
            <Button variant={showHood ? 'active' : undefined} aria-pressed={showHood} onClick={() => setShowHood((value) => !value)}>
              {HOOD_LABEL}
            </Button>
            <Button onClick={() => sceneRef.current?.topView()}>{TOP_LABEL}</Button>
            <Button onClick={() => sceneRef.current?.resetView()}>{RESET_LABEL}</Button>
            <span className={HINT_CLASS}>{LAMPS_ON_TEXT(lit, sceneLamps.length)}</span>
          </div>
          <div ref={hostRef} className={HOST_CLASS} style={{ height: VIEW_HEIGHT }} role="img" aria-label={ARIA_LABEL} />
          <p className={HINT_CLASS}>{HINT}</p>
        </div>
      )}
    </section>
  )
}

export default Kitchen3D
