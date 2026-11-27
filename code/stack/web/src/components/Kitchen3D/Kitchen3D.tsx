import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Button, Tabs } from '@house/ui'
import { disposeObject, supportsWebGL } from '@/lib/three'
import { useAcUnits } from '@/lib/useAcUnits'
import { useLampPlan } from '@/lib/useLampPlan'
import { usePlan } from '@/lib/usePlan'
import { useShutters } from '@/lib/useShutters'
import { useWeather } from '@/lib/useWeather'
import { HOUSE_LATITUDE, HOUSE_LONGITUDE } from '@/components/Weather/constants'
import {
  ARIA_LABEL,
  ALWAYS_DAY,
  DAYLIGHT,
  BUTTONS_CLASS,
  SHUTTER_ANIMATE_MS,
  CLICK_SLOP,
  HINT,
  HINT_CLASS,
  LAMP_FIXTURES,
  HOST_CLASS,
  INTRO_CLASS,
  LAMPS_ON_TEXT,
  NO_WEBGL_TEXT,
  RESET_LABEL,
  SEASON_LABEL,
  SEASON_OPTIONS,
  SKY_LABEL,
  SKY_OPTIONS,
  START,
  TARGET,
  TITLE,
  TITLE_CLASS,
  TOP,
  TOP_LABEL,
  VIEW_HEIGHT,
  WIND_LABEL,
} from './constants'
import { loadClimate, saveClimate } from './climate'
import type { Climate } from './climate'
import { applySeason, seasonOf } from './garden/seasons'
import { acMeshes, applyAcLed, applyClock, cameraMeshes } from './live'
import { buildScene } from './helpers'
import { createLighting, lampPlace } from './lighting'
import { applyShutters, closedOf, SHUTTER_KEYS, shutterWindows, skyOf, stepShutters } from './shutters'
import type { Kitchen3DProps, SceneHandle, SceneLamp } from './types'
import { createWeather, WEATHER_LOOK } from './weather'

/**
 * La maison et le jardin en 3D (la vue de Home), éclairés par les vraies lampes Hue : chaque lampe
 * placée sur le plan de la maison dans ces pièces allume la scène avec son intensité et sa couleur du moment (relues toutes les 5 s).
 */
const Kitchen3D = ({ apiKey, onOpenCamera }: Kitchen3DProps) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [supported] = useState(supportsWebGL)
  // La saison du jardin et le temps qu'il fait : choisis au-dessus de la vue, gardés sur l'appareil.
  const [climate, setClimate] = useState(loadClimate)
  const choose = (change: Partial<Climate>) => {
    const next = { ...climate, ...change }
    setClimate(next)
    saveClimate(next)
  }
  const plan = usePlan(apiKey)
  const { lamps, toggle } = useLampPlan(apiKey, plan.items, true)
  // La scène est construite une fois : elle appelle le `toggle` du moment par cette référence.
  const toggleRef = useRef(toggle)
  useEffect(() => {
    toggleRef.current = toggle
  }, [toggle])
  // La clim du salon (au-dessus du bureau) : en marche, à l'arrêt, ou inconnue (pas encore lue, injoignable).
  const ac = useAcUnits(apiKey)
  // L'état de chaque clim : en marche, à l'arrêt, ou inconnu (injoignable).
  const acPowers: Record<string, boolean | null> = Object.fromEntries((ac.units ?? []).map((unit) => [unit.id, unit.reachable ? unit.power : null]))
  const acKey = JSON.stringify(acPowers)
  // Un clic sur la clim de la scène l'allume ou l'éteint (rien si son état n'est pas connu).
  const toggleAc = (id: string) => {
    const power = acPowers[id] ?? null
    if (power !== null) ac.change(id, { on: !power })
  }
  const toggleAcRef = useRef(toggleAc)
  useEffect(() => {
    toggleAcRef.current = toggleAc
  })
  // Un clic sur une caméra de la scène ouvre la vraie (rien sans `onOpenCamera`).
  const openCameraRef = useRef(onOpenCamera)
  useEffect(() => {
    openCameraRef.current = onOpenCamera
  })
  // La clarté du ciel du moment (météo de la maison, relue toutes les 15 min).
  const weather = useWeather(HOUSE_LATITUDE, HOUSE_LONGITUDE)
  const sky = skyOf(weather, new Date().getHours())
  // Les lampes du pont qui sont dans l'espace de vie, à leur place dans la scène.
  const sceneLamps: SceneLamp[] = lamps.flatMap((lamp) => {
    // Une lampe dont le luminaire est nommé dans la scène y est toujours, même sans place sur le plan (sa place est celle du luminaire).
    const place = (lamp.waiting ? null : lampPlace(lamp.x, lamp.y)) ?? (LAMP_FIXTURES.includes(lamp.name.trim().toLowerCase()) ? { x: 0, z: 0 } : null)
    return place ? [{ id: lamp.id, name: lamp.name, ...place, on: lamp.on, reachable: lamp.reachable, brightness: lamp.brightness ?? null, color: lamp.color ?? null }] : []
  })
  const lampsKey = JSON.stringify(sceneLamps)
  // Les volets roulants : la part fermée de chacun d'après le dernier ordre de la maison.
  const shutters = useShutters(apiKey)
  // Un clic sur une fenêtre de la scène envoie l'ordre contraire du dernier à son vrai volet : descendu, il monte ; sinon il descend.
  const animateUntil = useRef(0)
  const toggleShutter = (key: string) => {
    const shutter = shutters.state?.shutters.find((candidate) => candidate.name.toLowerCase().includes(key))
    if (!shutter) return
    // Seul un volet cliqué ici bouge à l'écran : pendant un moment, le changement d'état qui suit est animé.
    animateUntil.current = performance.now() + SHUTTER_ANIMATE_MS
    shutters.send(shutter.id, shutter.lastCommand === 'down' ? 'up' : 'down')
  }
  const toggleShutterRef = useRef(toggleShutter)
  useEffect(() => {
    toggleShutterRef.current = toggleShutter
  })
  const closedKey = JSON.stringify(
    Object.fromEntries(SHUTTER_KEYS.map((key) => [key, closedOf(shutters.state?.shutters.find((shutter) => shutter.name.toLowerCase().includes(key))?.lastCommand ?? null)])),
  )

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
    // Une lumière d'ambiance faible, et le soleil : dosés plus bas selon le jour qui entre ; le reste vient des lampes de la maison.
    const ambient = new THREE.HemisphereLight(0xffffff, 0xb59a7a, DAYLIGHT.night)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xfff4e0, 0)
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
    // La pluie, la neige et ce qui se balance dans le vent : préparés une fois, cachés par beau temps.
    const weather = createWeather(scene, parts.root)
    // La pendule de la cuisine donne l'heure, remise à jour quatre fois par minute.
    applyClock(parts.root, new Date())
    const clockTimer = setInterval(() => applyClock(parts.root, new Date()), 15_000)

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 260)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    // La molette zoome vers ce qui est sous la souris, pas vers le point de pivot : sinon son pas dépend de la distance à ce pivot (qui
    // bouge quand on déplace la vue), et le zoom bute dessus sans raison apparente.
    controls.zoomToCursor = true
    controls.minDistance = 0.15
    controls.maxDistance = 70
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    // Le clic molette tourne la vue comme le clic gauche (par défaut il zoomait) ; sans preventDefault, le navigateur lance son défilement automatique.
    controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE
    const noAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    host.addEventListener('mousedown', noAutoscroll)

    // Les ampoules se cliquent : la souris devient une main au-dessus d'une ampoule, un clic sans glisser l'allume ou l'éteint.
    const raycaster = new THREE.Raycaster()
    const canvas = renderer.domElement
    const lampUnder = (e: PointerEvent): string | null => {
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2), camera)
      return lighting.pick(raycaster.ray)
    }
    // La clim se clique aussi : son bloc, visé pour de bon par le rayon.
    const acParts = acMeshes(parts.root)
    const acUnder = (): string | null => acParts.find((part) => raycaster.intersectObject(part.object, false).length > 0)?.id ?? null
    // Les caméras aussi : leur modèle (fût, face, casquette, rotule).
    const cameraParts = cameraMeshes(parts.root)
    const cameraUnder = (): string | null => cameraParts.find((part) => raycaster.intersectObject(part.object, true).length > 0)?.name ?? null
    // Les fenêtres à volet aussi : la plus proche de l'œil sous le rayon.
    const windows = shutterWindows(parts.root)
    const shutterUnder = (): string | null => {
      let best: string | null = null
      let nearest = Infinity
      for (const { key, object } of windows) {
        const hit = raycaster.intersectObject(object, true)[0]
        if (hit && hit.distance < nearest) {
          nearest = hit.distance
          best = key
        }
      }
      return best
    }
    let pressed: { x: number; y: number } | null = null
    const onPointerDown = (e: PointerEvent) => {
      pressed = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) canvas.style.cursor = lampUnder(e) || acUnder() !== null || cameraUnder() !== null || shutterUnder() ? 'pointer' : ''
    }
    const onPointerUp = (e: PointerEvent) => {
      const start = pressed
      pressed = null
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP) return
      const lamp = lampUnder(e)
      if (lamp) toggleRef.current(lamp)
      else {
        const unit = acUnder()
        if (unit) {
          toggleAcRef.current(unit)
          return
        }
        const name = cameraUnder()
        if (name) {
          openCameraRef.current?.(name)
          return
        }
        const shutter = shutterUnder()
        if (shutter) toggleShutterRef.current(shutter)
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)

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
    let last = performance.now()
    const loop = () => {
      frame = requestAnimationFrame(loop)
      const now = performance.now()
      // Les volets en mouvement avancent du temps écoulé (au plus un quart de seconde, après une pause de l'onglet).
      const elapsed = Math.min(0.25, (now - last) / 1000)
      stepShutters(parts.root, elapsed)
      last = now
      if (!visible) return
      weather.step(elapsed)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    sceneRef.current = { root: parts.root, ambient, sun, controls, lighting, weather, resetView: () => lookFrom(START), topView: () => lookFrom(TOP) }

    return () => {
      cancelAnimationFrame(frame)
      clearInterval(clockTimer)
      observer.disconnect()
      host.removeEventListener('mousedown', noAutoscroll)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
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

  // Les lampes du pont éclairent la scène : à chaque changement d'état (allumée, intensité, couleur) ou de place.
  useEffect(() => {
    sceneRef.current?.lighting.apply(JSON.parse(lampsKey) as SceneLamp[])
  }, [lampsKey, supported])

  // Les volets de la scène se règlent, et le jour qui entre avec eux : la part de vitre découverte, fois la clarté du ciel, éclaire toute
  // la pièce d'une manière générale (ambiance et soleil), sans rayon par fenêtre.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    const open = applyShutters(current.root, JSON.parse(closedKey) as Record<string, number>, performance.now() < animateUntil.current)
    const daylight = ALWAYS_DAY ? 1 : open * sky
    // Le temps choisi dose le tout : un ciel de pluie ou de neige laisse moins de jour et presque plus de soleil.
    const look = WEATHER_LOOK[climate.sky]
    current.ambient.intensity = DAYLIGHT.night + DAYLIGHT.day * daylight * look.ambient
    current.sun.intensity = DAYLIGHT.sun * daylight * look.sun
  }, [closedKey, sky, climate.sky, supported])

  // Le jardin se met à la saison choisie (« auto » : celle du jour), sans être reconstruit.
  useEffect(() => {
    if (sceneRef.current) applySeason(sceneRef.current.root, climate.season === 'auto' ? seasonOf(new Date()) : climate.season)
  }, [climate.season, supported])

  // Le temps qu'il fait : la pluie ou la neige, le ciel, le vent.
  useEffect(() => {
    sceneRef.current?.weather.apply(climate.sky, climate.wind)
  }, [climate.sky, climate.wind, supported])

  // Le voyant de la clim suit la vraie.
  useEffect(() => {
    if (sceneRef.current) applyAcLed(sceneRef.current.root, JSON.parse(acKey) as Record<string, boolean | null>)
  }, [acKey, supported])

  const lit = sceneLamps.filter((lamp) => lamp.on && lamp.reachable).length
  return (
    <section>
      <h2 className={TITLE_CLASS}>{TITLE}</h2>
      {!supported ? (
        <p className={INTRO_CLASS}>{NO_WEBGL_TEXT}</p>
      ) : (
        <div>
          <div className={BUTTONS_CLASS}>
            <Button onClick={() => sceneRef.current?.topView()}>{TOP_LABEL}</Button>
            <Button onClick={() => sceneRef.current?.resetView()}>{RESET_LABEL}</Button>
            <span className={HINT_CLASS}>{LAMPS_ON_TEXT(lit, sceneLamps.length)}</span>
          </div>
          <div className={BUTTONS_CLASS}>
            <Tabs compact label={SEASON_LABEL} options={SEASON_OPTIONS} value={climate.season} onChange={(season) => choose({ season })} />
            <Tabs compact label={SKY_LABEL} options={SKY_OPTIONS} value={climate.sky} onChange={(sky) => choose({ sky })} />
            <Button variant={climate.wind ? 'active' : 'default'} aria-pressed={climate.wind} onClick={() => choose({ wind: !climate.wind })}>
              {WIND_LABEL}
            </Button>
          </div>
          <div ref={hostRef} className={HOST_CLASS} style={{ height: VIEW_HEIGHT }} role="img" aria-label={ARIA_LABEL} />
          <p className={HINT_CLASS}>{HINT}</p>
        </div>
      )}
    </section>
  )
}

export default Kitchen3D
