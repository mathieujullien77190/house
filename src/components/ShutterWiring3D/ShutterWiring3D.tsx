import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { disposeObject, supportsWebGL } from '@/lib/three'
import ShutterWiring3DUI from './UI'
import { POWER_STEPS, START, TARGET, TOP, VIEW_HEIGHT } from './constants'
import { buildScene, legendOf } from './helpers'
import type { SceneHandle } from './types'

const legend = legendOf()

/** Le montage de l'ESP32 et du CC1101 en 3D : les 8 fils, leurs couleurs et les broches. */
const ShutterWiring3D = () => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [supported] = useState(supportsWebGL)
  const [showNames, setShowNames] = useState(true)
  const [showWires, setShowWires] = useState(true)
  const [showPower, setShowPower] = useState(true)

  // Crée la scène à l'ouverture et la détruit ensuite.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !supported) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const parts = buildScene()
    scene.add(parts.root)
    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(40, 90, 70)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xffffff, 0.8)
    fill.position.set(-60, 40, -50)
    scene.add(fill)

    const camera = new THREE.PerspectiveCamera(35, 1, 1, 1500)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.minDistance = 15
    controls.maxDistance = 320
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

    // La molette zoome la vue (OrbitControls empêche la page de défiler au-dessus).

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

    sceneRef.current = { controls, power: parts.power, wires: parts.wires, pinNames: parts.pinNames, resetView: () => lookFrom(START), topView: () => lookFrom(TOP) }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('mousedown', noAutoscroll)
      visibility.disconnect()
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      // Libère le contexte WebGL tout de suite au lieu d'attendre le ramasse-miettes.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [supported])

  // Applique les réglages des boutons à la scène existante.
  useEffect(() => {
    if (!sceneRef.current) return
    sceneRef.current.pinNames.visible = showNames
    sceneRef.current.wires.visible = showWires
    sceneRef.current.power.visible = showPower
  }, [showNames, showWires, showPower, supported])

  return (
    <ShutterWiring3DUI
      hostRef={hostRef}
      supported={supported}
      showNames={showNames}
      showWires={showWires}
      showPower={showPower}
      legend={legend}
      powerSteps={POWER_STEPS}
      onToggleNames={() => setShowNames((v) => !v)}
      onToggleWires={() => setShowWires((v) => !v)}
      onTogglePower={() => setShowPower((v) => !v)}
      onResetView={() => sceneRef.current?.resetView()}
      onTopView={() => sceneRef.current?.topView()}
    />
  )
}

export default ShutterWiring3D
