import { createAcLabels, createMatrix } from './matrix'
import type { CameraState } from './matrix'
import { createTv } from './tv'
import { createSpill } from './spill'
import { OUTDOOR, renderLayers, splitLayers } from './layers'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Button, Tabs } from '@house/ui'
import { disposeObject, supportsWebGL } from '@/lib/three'
import { fetchPower, setPlug } from '@/lib/api'
import { useAcUnits } from '@/lib/useAcUnits'
import { usePlug } from '@/lib/usePlug'
import { useSensors } from '@/lib/useSensors'
import { useMobile } from '@/lib/useMobile'
import { useLampPlan } from '@/lib/useLampPlan'
import { usePlan } from '@/lib/usePlan'
import { useShutters } from '@/lib/useShutters'
import { useWeather } from '@/lib/useWeather'
import { HOUSE_LATITUDE, HOUSE_LONGITUDE } from '@/components/Weather/constants'
import {
  ARIA_LABEL,
  BASE,
  DAYLIGHT,
  BUTTONS_CLASS,
  SHUTTER_ANIMATE_MS,
  CLICK_SLOP,
  WHEEL_STEP,
  HINT,
  HINT_CLASS,
  LAMP_FIXTURES,
  HOST_CLASS,
  INTRO_CLASS,
  LAMPS_ON_TEXT,
  LIGHT_LABEL,
  LIGHT_OPTIONS,
  MATRIX_LABEL,
  NO_WEBGL_TEXT,
  QUALITY,
  REST,
  RESET_LABEL,
  ROOM,
  START,
  TARGET,
  TITLE,
  TITLE_CLASS,
  TOP,
  TOP_LABEL,
  VIEW_HEIGHT,
} from './constants'
import { SITE } from './garden/layout'
import { loadLight, saveLight } from './light'
import { acMeshes, applyAcLed, applyClock, cameraMeshes } from './live'
import { buildScene } from './helpers'
import { createLighting, lampPlace } from './lighting'
import { applyShutters, closedOf, SHUTTER_KEYS, shutterSlats, shutterWindows, skyOf, stepShutters } from './shutters'
import { onPhotoLoad } from './textures'
import type { Kitchen3DProps, LightMode, SceneHandle, SceneLamp } from './types'

/**
 * La maison et le jardin en 3D (la vue de Home), éclairés par les vraies lampes Hue : chaque lampe
 * placée sur le plan de la maison dans ces pièces allume la scène avec son intensité et sa couleur du moment (relues toutes les 5 s).
 */
const Kitchen3D = ({ apiKey, onOpenCamera }: Kitchen3DProps) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [supported] = useState(supportsWebGL)
  // La qualité du rendu est choisie une fois, à l'ouverture, selon l'appareil : un téléphone qu'on tourne (ou une fenêtre qu'on
  // rétrécit) garde celle du départ, la scène n'est pas reconstruite.
  const mobile = useMobile()
  const [quality] = useState(() => (mobile ? QUALITY.phone : QUALITY.desktop))
  // La lumière : plein jour forcé, ou le jour qu'il fait vraiment ; choisie au-dessus de la vue, gardée sur l'appareil.
  const [light, setLight] = useState(loadLight)
  // La vue « Matrix » : éteinte à chaque ouverture (rien n'est gardé).
  // Sur téléphone, la scène ne se montre qu'en vue Matrix (pas de bouton pour en sortir).
  const [matrixOn, setMatrixOn] = useState(mobile)
  const toggleMatrix = () => {
    sceneRef.current?.matrix(!matrixOn)
    setMatrixOn(!matrixOn)
  }
  const chooseLight = (next: LightMode) => {
    setLight(next)
    saveLight(next)
  }
  // L'heure du moment, remise à jour avec la pendule : sans météo, c'est elle qui dit s'il fait jour.
  const [hour, setHour] = useState(() => new Date().getHours())
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
  // La prise connectée (le chauffage de la cage) : son état, relu toutes les 5 s ; un clic sur le radiateur de la scène l'allume ou l'éteint.
  const plug = usePlug(apiKey, true)
  const plugOn = plug ? plug.on : null
  const togglePlug = () => {
    if (plugOn !== null) void setPlug(apiKey, !plugOn).catch(() => undefined)
  }
  const togglePlugRef = useRef(togglePlug)
  useEffect(() => {
    togglePlugRef.current = togglePlug
  })
  // La température de chaque pièce, lue par sa clim (inconnue si elle est injoignable).
  // Avec celles des détecteurs Hue : la salle de bain (détecteur 60), et la cage à perruches (détecteurs 54 et 57 : celui du dedans, celui du dehors, d'après leur nom).
  const sensors = useSensors(apiKey, true)
  const sensorTemp = (pick: (sensor: (typeof sensors)[number]) => boolean): number | null => sensors.find((sensor) => pick(sensor) && sensor.reachable)?.temperature ?? null
  const cage = (sensor: (typeof sensors)[number]): boolean => sensor.id === '54' || sensor.id === '57'
  const acTempsKey = JSON.stringify({
    ...Object.fromEntries((ac.units ?? []).map((unit) => [unit.id, unit.reachable ? unit.roomTemp : null])),
    sdb: sensorTemp((sensor) => sensor.id === '60'),
    'cage-in': sensorTemp((sensor) => cage(sensor) && !sensor.name.toLowerCase().includes('ext')),
    'cage-out': sensorTemp((sensor) => cage(sensor) && sensor.name.toLowerCase().includes('ext')),
  })
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
  const sky = skyOf(weather, hour)
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

    const renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // L'ombre du soleil n'est refaite que sur demande (`invalidate(true)`) : la scène n'est pas dessinée deux fois par image.
    renderer.shadowMap.autoUpdate = false
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const parts = buildScene(quality)
    scene.add(parts.root)
    // Une lumière d'ambiance faible, et le soleil : dosés plus bas selon le jour qui entre ; le reste vient des lampes de la maison.
    const ambient = new THREE.HemisphereLight(0xffffff, 0xb59a7a, DAYLIGHT.night)
    // L'ambiance et le soleil éclairent la maison et le jardin (les deux couches).
    ambient.layers.enable(OUTDOOR)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xfff4e0, 0)
    sun.position.set(3, 9, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap)
    sun.shadow.camera.left = -8
    sun.shadow.camera.right = 8
    sun.shadow.camera.top = 8
    sun.shadow.camera.bottom = -8
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 30
    sun.shadow.bias = -0.0005
    sun.layers.enable(OUTDOOR)
    scene.add(sun)
    splitLayers(parts.root)
    const lighting = createLighting(parts.root)
    applyClock(parts.root, new Date())

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 260)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    // La molette zoome vers ce qui est sous la souris, pas vers le point de pivot : sinon son pas dépend de la distance à ce pivot (qui
    // bouge quand on déplace la vue), et le zoom bute dessus sans raison apparente.
    controls.zoomToCursor = true
    // Pas de limite de zoom (la molette avance d'un pas fixe : `onWheel`).
    controls.minDistance = 0
    controls.maxDistance = Infinity
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    // Le clic molette tourne la vue comme le clic gauche (par défaut il zoomait) ; sans preventDefault, le navigateur lance son défilement automatique.
    controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE

    // Rendu à la demande : une image n'est dessinée que si quelque chose a changé (`invalidate`), ou tant que quelque chose bouge
    // (un volet, la caméra qui finit sa course). Au repos, rien ne tourne : ni boucle, ni rendu.
    let visible = true
    let frame = 0
    let last = 0
    let dirty = false
    // L'ombre du soleil est à refaire (à la première image, puis quand ce qui la porte change).
    let stale = true
    const shutters = shutterSlats(parts.root)
    // Une lame de volet apparaît ou disparaît : il faut une image, et son ombre change aussi.
    const onSlat = () => {
      dirty = true
      stale = true
    }
    const tick = () => {
      frame = 0
      const now = performance.now()
      // Les volets en mouvement avancent du temps écoulé (au plus un quart de seconde, après une pause de l'onglet), même hors de l'écran.
      const elapsed = Math.min(0.25, (now - last) / 1000)
      last = now
      const moving = stepShutters(shutters, elapsed, onSlat)
      // Hors de l'écran, rien n'est dessiné.
      if (visible) {
        // La caméra finit sa course (amortissement) : tant qu'elle bouge, son `change` redemande une image.
        controls.update()
        if (dirty) {
          dirty = false
          const shadows = stale
          stale = false
          // La télé allumée est redessinée d'abord : elle montre la vue d'une caméra de la scène.
          if (tv.active()) tv.render(renderer, scene, !sun.visible)
          // Le jardin puis la maison, chacun avec ses lampes (elles ne traversent pas les murs).
          renderLayers(renderer, scene, camera, shadows)
        }
      }
      if (moving && frame === 0) frame = requestAnimationFrame(tick)
    }
    const invalidate = (shadows = false) => {
      dirty = true
      if (shadows) stale = true
      if (frame !== 0) return
      // Après un repos, le temps repart de maintenant : le premier pas ne compte pas la pause.
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    // La caméra a bougé (à la souris, au doigt, ou en finissant sa course) : une image.
    const onMove = () => invalidate()
    controls.addEventListener('change', onMove)
    // Une photo accrochée au mur finit de se charger : une image pour la montrer.
    const unwatch = onPhotoLoad(invalidate)
    // La pendule de la cuisine donne l'heure, remise à jour quatre fois par minute (ses aiguilles portent une ombre).
    const clockTimer = setInterval(() => {
      const now = new Date()
      applyClock(parts.root, now)
      setHour(now.getHours())
      invalidate(true)
    }, 15_000)
    // Les voyants du switch (marqués `userData.blink`, leur rang) clignotent comme ceux de prises RJ45, chacun à son rythme : les pairs sont des voyants de lien (verts, presque
    // toujours allumés, un bref clin de temps en temps), les impairs des voyants d'activité (jaunes, qui papillotent sans arrêt). Une image n'est redemandée que si l'un d'eux change.
    const blinkers: { light: THREE.MeshBasicMaterial; link: boolean; on: boolean; next: number }[] = []
    parts.root.traverse((object) => {
      if (object.userData.blink !== undefined) blinkers.push({ light: (object as THREE.Mesh).material as THREE.MeshBasicMaterial, link: (object.userData.blink as number) % 2 === 0, on: true, next: 0 })
    })
    const blinkTimer = setInterval(() => {
      if (!visible || blinkers.length === 0) return
      const now = performance.now()
      let changed = false
      for (const blinker of blinkers) {
        if (now < blinker.next) continue
        blinker.on = !blinker.on
        // Lien : allumé 2 à 7 s, éteint 0,1 s. Activité : allumé ou éteint 60 à 400 ms.
        blinker.next = now + (blinker.link ? (blinker.on ? 2000 + Math.random() * 5000 : 100) : 60 + Math.random() * 340)
        blinker.light.color.set(blinker.on ? (blinker.link ? 0x35d06a : 0xf2c531) : 0x1c2a1e)
        changed = true
      }
      if (changed) invalidate()
    }, 60)
    const noAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    host.addEventListener('mousedown', noAutoscroll)

    // Les ampoules se cliquent : la souris devient une main au-dessus d'une ampoule, un clic sans glisser l'allume ou l'éteint.
    const raycaster = new THREE.Raycaster()
    // Les clics visent la maison comme le jardin.
    raycaster.layers.enableAll()
    const aim = new THREE.Vector2()
    const canvas = renderer.domElement
    // La molette avance ou recule la caméra d'un pas fixe vers ce qui est sous la souris, sans limite : le pas ne dépend pas de la distance
    // (le zoom de OrbitControls est un facteur : plus on s'approche, moins il avance). Le pivot suit la caméra, la distance au pivot ne change pas.
    const heading = new THREE.Vector3()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(aim.set(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2), camera)
      heading.copy(raycaster.ray.direction).multiplyScalar((-Math.sign(e.deltaY) * WHEEL_STEP * Math.min(3, Math.abs(e.deltaY) / 100)) || 0)
      camera.position.add(heading)
      controls.target.add(heading)
      controls.update()
      invalidate()
    }
    canvas.addEventListener('wheel', onWheel, { capture: true, passive: false })
    const lampUnder = (e: PointerEvent): string | null => {
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(aim.set(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2), camera)
      return lighting.pick(raycaster.ray)
    }
    // La clim se clique aussi : son bloc, visé pour de bon par le rayon.
    const acParts = acMeshes(parts.root)
    const acUnder = (): string | null => acParts.find((part) => raycaster.intersectObject(part.object, false).length > 0)?.id ?? null
    // Les caméras aussi : leur modèle (fût, face, casquette, rotule).
    const cameraParts = cameraMeshes(parts.root)
    // La caméra visée est la plus proche du regard : avec deux modèles sur le même rayon, c'est celle de devant qui s'ouvre.
    const cameraUnder = (): string | null => {
      let nearest: { name: string; distance: number } | null = null
      for (const part of cameraParts) {
        const hit = raycaster.intersectObject(part.object, true)[0]
        if (hit && (!nearest || hit.distance < nearest.distance)) nearest = { name: part.name, distance: hit.distance }
      }
      return nearest?.name ?? null
    }
    // La télé du salon : un clic sur son écran (ou sur un écran du bureau) y montre la vue 3D d'une caméra de la scène, puis de la suivante, puis l'éteint.
    const tv = createTv(parts.root)
    let before: { position: THREE.Vector3; target: THREE.Vector3 } | null = null
    let shown: THREE.Mesh | null = null
    const tvUnder = (): THREE.Mesh | null => (raycaster.intersectObjects(tv.screens, false)[0]?.object as THREE.Mesh | undefined) ?? null
    // Le radiateur de la cage (marqué `userData.plug`) : un clic allume ou éteint la prise connectée.
    const heaters: THREE.Object3D[] = []
    parts.root.traverse((object) => {
      if (object.userData.plug === true) heaters.push(object)
    })
    const plugUnder = (): boolean => raycaster.intersectObjects(heaters, true).length > 0
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
      if (e.buttons === 0) canvas.style.cursor = lampUnder(e) || acUnder() !== null || cameraUnder() !== null || tvUnder() !== null || plugUnder() || shutterUnder() ? 'pointer' : ''
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
        if (plugUnder()) {
          togglePlugRef.current()
          return
        }
        const screen = tvUnder()
        if (screen) {
          // Au premier clic, la vue vient se placer en face de la télé (à sa hauteur) ; la place d'avant est gardée, et retrouvée quand on a fait le tour des caméras (l'écran s'éteint).
          if (!tv.active()) before = { position: camera.position.clone(), target: controls.target.clone() }
          // La vue se place en face de l'écran cliqué (au premier clic, ou si on change d'écran en cours de route).
          if (shown !== screen) {
            shown = screen
            const center = screen.getWorldPosition(new THREE.Vector3())
            const facing = new THREE.Vector3(0, 0, (screen.userData.tvFacing as number | undefined) ?? 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()))
            // Plus l'écran est petit, plus on s'en approche (2,20 m pour la télé, 1 m environ pour un écran du bureau).
            const wide = (screen.geometry as THREE.BoxGeometry).parameters.width
            camera.position.copy(center).addScaledVector(facing, Math.max(0.9, wide * 1.8))
            controls.target.copy(center)
          }
          tv.next(screen)
          if (!tv.active()) shown = null
          if (!tv.active() && before) {
            camera.position.copy(before.position)
            controls.target.copy(before.target)
            before = null
          }
          controls.update()
          invalidate()
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
      invalidate()
    }
    lookFrom(START)

    const resize = () => {
      const width = host.clientWidth
      if (width === 0) return
      renderer.setSize(width, VIEW_HEIGHT)
      camera.aspect = width / VIEW_HEIGHT
      camera.updateProjectionMatrix()
      invalidate()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    // Pas de rendu quand la vue est hors de l'écran ; à son retour, une image.
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) invalidate()
    })
    visibility.observe(host)

    invalidate()

    // La vue Matrix : fond noir opaque et arêtes vertes ; à la sortie, le fond redevient transparent.
    const showMatrix = createMatrix(parts.root)
    // En vue Matrix, la température de chaque pièce s'affiche à côté de sa clim (une étiquette toujours tournée vers l'utilisateur).
    const labels = createAcLabels(parts.root, [
      { id: 'sdb', at: new THREE.Vector3((REST.bathSouth + ROOM.xMax) / 2, 1.9, (REST.bathWest + ROOM.zMin) / 2) },
      // Dans la cage : dans le coin du fond (les deux pans de bois, côté haie). Dehors : juste au-dessus de la caméra « volière extérieur ».
      { id: 'cage-in', at: new THREE.Vector3(SITE.cageX2 - 0.25, 1.5 - BASE.rise, SITE.cageZ2 - 0.25) },
      { id: 'cage-out', at: new THREE.Vector3(SITE.cageX2 - 0.2, 0.9 - BASE.rise, SITE.cageZ1 + 0.14 + 0.85) },
    ])
    let matrixShown = false
    let background = 0x000000
    const matrix = (on: boolean) => {
      matrixShown = on
      showMatrix(on)
      showMatrix.tint()
      labels.show(on)
      renderer.setClearColor(background, on ? 1 : 0)
      invalidate(true)
    }
    const matrixTheme = (day: boolean) => {
      background = showMatrix.theme(day)
      renderer.setClearColor(background, matrixShown ? 1 : 0)
      invalidate(true)
    }
    sceneRef.current = { root: parts.root, ambient, sun, controls, lighting, spill: createSpill(parts.root), labels, invalidate, resetView: () => lookFrom(START), topView: () => lookFrom(TOP), matrix, matrixTheme, tintLamps: showMatrix.tint, tintCameras: showMatrix.cameras, tintDevices: showMatrix.devices }
    if (quality.matrixOnly) matrix(true)

    return () => {
      cancelAnimationFrame(frame)
      unwatch()
      clearInterval(clockTimer)
      clearInterval(blinkTimer)
      controls.removeEventListener('change', onMove)
      observer.disconnect()
      host.removeEventListener('mousedown', noAutoscroll)
      canvas.removeEventListener('wheel', onWheel, { capture: true })
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      visibility.disconnect()
      tv.dispose()
      controls.dispose()
      disposeObject(scene)
      sun.shadow.map?.dispose()
      renderer.dispose()
      // Libère le contexte WebGL tout de suite au lieu d'attendre le ramasse-miettes.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  }, [supported, quality])

  // Les lampes du pont éclairent la scène : à chaque changement d'état (allumée, intensité, couleur) ou de place.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    current.lighting.apply(JSON.parse(lampsKey) as SceneLamp[], matrixOn)
    current.tintLamps()
    // Par les fenêtres aux volets ouverts, un peu de la lumière des lampes sort dehors.
    current.spill.apply(current.lighting.sources(), JSON.parse(closedKey) as Record<string, number>)
    current.invalidate()
  }, [lampsKey, closedKey, supported, matrixOn])

  // Les volets de la scène se règlent, et le jour qui entre avec eux : la part de vitre découverte, fois la clarté du ciel, éclaire toute
  // la pièce d'une manière générale (ambiance et soleil), sans rayon par fenêtre.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    const open = applyShutters(current.root, JSON.parse(closedKey) as Record<string, number>, performance.now() < animateUntil.current)
    // « Jour » : plein jour, quels que soient l'heure et les volets ; « Heure actuelle » : le jour qui entre vraiment.
    const daylight = light === 'day' ? 1 : open * sky
    current.ambient.intensity = DAYLIGHT.night + DAYLIGHT.day * daylight
    current.sun.intensity = DAYLIGHT.sun * daylight
    // Un soleil éteint ne compte plus dans les programmes ni dans la carte d'ombre.
    current.sun.visible = current.sun.intensity > 0
    // En vue Matrix, la couleur des volets suit leur état.
    current.tintLamps()
    current.invalidate(true)
  }, [closedKey, sky, light, supported])

  // Le voyant de la clim suit la vraie.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    applyAcLed(current.root, JSON.parse(acKey) as Record<string, boolean | null>)
    current.labels.apply(JSON.parse(acTempsKey) as Record<string, number | null>, JSON.parse(acKey) as Record<string, boolean | null>)
    current.invalidate()
  }, [acKey, acTempsKey, supported])

  // L'état des caméras, lu sur le switch PoE toutes les 5 s : il colore leurs cercles en vue Matrix. Une lecture ratée garde le dernier état.
  const [cameraStates, setCameraStates] = useState('{}')
  useEffect(() => {
    let alive = true
    const load = () =>
      fetchPower(apiKey)
        .then((list) => {
          if (alive) setCameraStates(JSON.stringify(Object.fromEntries(list.map((item) => [item.camera, item.powered ? (item.streaming ? 'on' : 'starting') : 'off']))))
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [apiKey])
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    current.tintCameras(JSON.parse(cameraStates) as Record<string, CameraState>)
    current.invalidate()
  }, [cameraStates, supported])

  // La vue Matrix suit le thème de la WebApp (l'attribut `data-theme` de la page, posé par son bouton) : clair, gris sur fond clair ; sombre, verts sur fond noir.
  const [pageTheme, setPageTheme] = useState(() => document.documentElement.dataset.theme ?? 'light')
  useEffect(() => {
    const watcher = new MutationObserver(() => setPageTheme(document.documentElement.dataset.theme ?? 'light'))
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => watcher.disconnect()
  }, [])
  useEffect(() => {
    sceneRef.current?.matrixTheme(pageTheme !== 'dark')
  }, [pageTheme, supported])

  // Les cercles des clims et du radiateur, en vue Matrix : verts en marche, rouges à l'arrêt.
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    current.tintDevices({ ...(JSON.parse(acKey) as Record<string, boolean | null>), plug: plugOn })
    current.invalidate()
  }, [acKey, plugOn, matrixOn, supported])

  // Le voyant du radiateur suit la prise : rouge allumée, gris éteinte ou inconnue ; en vue Matrix, vert allumée, rouge éteinte (comme ceux des clims).
  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    current.root.traverse((object) => {
      if (object.userData.plugLed === true) ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(matrixOn ? (plugOn ? 0x2fd45a : 0xd43a2f) : plugOn ? 0xff3b30 : 0x4a4640)
    })
    current.invalidate()
  }, [plugOn, matrixOn, supported])

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
            {quality.matrixOnly ? null : <Button onClick={toggleMatrix}>{matrixOn ? MATRIX_LABEL.off : MATRIX_LABEL.on}</Button>}
            <span className={HINT_CLASS}>{LAMPS_ON_TEXT(lit, sceneLamps.length)}</span>
          </div>
          <div className={BUTTONS_CLASS}>
            <Tabs compact label={LIGHT_LABEL} options={LIGHT_OPTIONS} value={light} onChange={chooseLight} />
          </div>
          <div ref={hostRef} className={HOST_CLASS} style={{ height: VIEW_HEIGHT }} role="img" aria-label={ARIA_LABEL} />
          <p className={HINT_CLASS}>{HINT}</p>
        </div>
      )}
    </section>
  )
}

export default Kitchen3D
