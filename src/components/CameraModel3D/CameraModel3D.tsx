import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import CameraModel3DUI from './UI'
import { MODEL, VIEW_HEIGHT } from './constants'
import { buildScene, disposeObject, supportsWebGL } from './helpers'
import type { SceneHandle } from './types'

const CameraModel3D = () => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [supported] = useState(supportsWebGL)
  const [showLabels, setShowLabels] = useState(true)

  // Crée la scène à l'ouverture et la détruit ensuite.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !supported) return
    const { position, target } = MODEL

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    // Calque HTML des noms de pièces, par-dessus le rendu 3D et sans capter la souris.
    const labels = new CSS2DRenderer()
    labels.domElement.style.position = 'absolute'
    labels.domElement.style.top = '0'
    labels.domElement.style.left = '0'
    labels.domElement.style.pointerEvents = 'none'
    host.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    scene.add(buildScene())
    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(60, 100, 80)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xffffff, 0.8)
    fill.position.set(-80, 40, -60)
    scene.add(fill)

    const camera = new THREE.PerspectiveCamera(35, 1, 1, 1500)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const resetView = () => {
      camera.position.set(position.x, position.y, position.z)
      controls.target.set(target.x, target.y, target.z)
      controls.update()
    }
    resetView()

    const resize = () => {
      const width = host.clientWidth
      if (width === 0) return
      renderer.setSize(width, VIEW_HEIGHT)
      labels.setSize(width, VIEW_HEIGHT)
      camera.aspect = width / VIEW_HEIGHT
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    // La molette seule fait défiler la page ; Ctrl + molette (ou pincement) zoome la vue.
    const wheelGuard = (e: WheelEvent) => {
      controls.enableZoom = e.ctrlKey || e.metaKey
    }
    const wheelRestore = () => {
      controls.enableZoom = true
    }
    host.addEventListener('wheel', wheelGuard, { capture: true })
    host.addEventListener('wheel', wheelRestore)

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
      labels.render(scene, camera)
    }
    loop()

    sceneRef.current = { controls, labels, resetView }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibility.disconnect()
      host.removeEventListener('wheel', wheelGuard, { capture: true })
      host.removeEventListener('wheel', wheelRestore)
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      // Libère le contexte WebGL tout de suite au lieu d'attendre le ramasse-miettes.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      labels.domElement.remove()
      sceneRef.current = null
    }
  }, [supported])

  // Applique les réglages des boutons à la scène existante.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.labels.domElement.style.display = showLabels ? '' : 'none'
  }, [showLabels, supported])

  return (
    <CameraModel3DUI
      hostRef={hostRef}
      supported={supported}
      showLabels={showLabels}
      legend={MODEL.legend}
      ariaLabel={MODEL.ariaLabel}
      onToggleLabels={() => setShowLabels((v) => !v)}
      onResetView={() => sceneRef.current?.resetView()}
    />
  )
}

export default CameraModel3D
