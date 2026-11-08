// La page invité : UNE seule page. Une indication « Cliquer pour passer en 4K », puis les caméras en vignettes alignées, qui passent à la ligne quand la place manque ;
// chaque vignette fait au plus la taille du flux léger (640 px de large : au-delà il serait étiré donc flou ; sur un écran plus étroit elle prend la largeur de l'écran).
// Toucher une vignette ouvre cette caméra en grand en 4K, sans changer de page : sur ordinateur dessous, sur téléphone (moins de 1024 px) en plein écran, vue paysage,
// avec un bouton retour. Une fois agrandie, l'image se zoome au doigt (pincer, déplacer, double toucher). Ni titre, ni nom de caméra.
// La clé est dans l'adresse de chaque flux (pas de cookie). Les noms de caméra, qui ne servent que dans les adresses, sont validés (config.ts).
import { createHash } from 'node:crypto'

/** La largeur du flux léger (voir go2rtc/go2rtc.yaml : le flux secondaire des caméras fait 640 × 360) : la taille où une vignette est la plus nette. */
export const THUMB_WIDTH = 640

/** Les caméras posées de côté : leur image est tournée d'un quart de tour horaire (portrait), comme dans la WebApp (`TURNED_CAMERAS`). */
export const TURNED_CAMERAS = ['voliere-exterieur']

export const HINT_TEXT = 'Cliquer pour passer en 4K'

/** Écrit (avec le rond qui tourne, comme `SnapshotImage` de @house/ui) sur le noir tant que la première image d'un flux n'est pas arrivée. */
export const LOADING_TEXT = 'Chargement…'

const STYLE = `
  html { background: #0b0d10; color: #e6e8eb; font-family: system-ui, sans-serif; }
  body { margin: 0; padding: 12px; box-sizing: border-box; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; }
  img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: contain; background: #000; -webkit-user-drag: none; }
  .hint { margin: 0 0 8px; font-size: 14px; color: #9aa3ad; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .thumb { position: relative; flex: 0 0 min(100%, ${THUMB_WIDTH}px); margin: 0; padding: 0; border: 0; background: none; cursor: pointer; }
  .thumb.on { outline: 2px solid #4da3ff; outline-offset: -2px; }
  .wait { position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: #000; color: #9aa3ad; font-size: 14px; pointer-events: none; }
  .spin { width: 16px; height: 16px; box-sizing: border-box; border: 2px solid #9aa3ad; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .big { position: relative; flex: 1; min-height: 50vh; margin-top: 12px; overflow: hidden; }
  .big img { position: absolute; inset: 0; height: 100%; aspect-ratio: auto; }
  .full { display: none; position: fixed; inset: 0; z-index: 10; background: #000; }
  .full.on { display: block; }
  .stage { position: absolute; inset: 0; overflow: hidden; }
  .stage img { height: 100%; aspect-ratio: auto; }
  .big, .stage, .thumb.turned { container-type: size; }
  .thumb.turned { flex-basis: min(100%, ${(THUMB_WIDTH * 9) / 16}px); aspect-ratio: 9 / 16; }
  .thumb.turned img, .big .turn img, .stage .turn img { position: absolute; left: 50%; top: 50%; width: 100cqh; height: 100cqw; aspect-ratio: auto; transform: translate(-50%, -50%) rotate(90deg); transform-origin: center; }
  .turn { position: absolute; inset: 0; transform-origin: 0 0; }
  .big, .stage { touch-action: none; user-select: none; -webkit-user-select: none; }
  .big img, .stage img { transform-origin: 0 0; }
  .back { position: absolute; top: 12px; left: 12px; z-index: 2; padding: 8px 14px; border: 0; border-radius: 8px; background: rgba(11, 13, 16, 0.7); color: #e6e8eb; font-size: 16px; cursor: pointer; }
  @media (max-width: 1023px) { .big { display: none; } }
  @media (orientation: portrait) {
    .full:not(.keep) .stage { inset: auto; top: 0; left: 100%; width: 100vh; height: 100vw; transform-origin: top left; transform: rotate(90deg); }
  }
`

/**
 * Le script de la page. Ordinateur : une vignette touchée met son flux 4K dans le bloc du bas (l'ancien flux est fermé en même temps), la même retouchée le vide.
 * Téléphone : elle ouvre le 4K en plein écran (l'écran passe en paysage si le navigateur le permet, sinon l'image est tournée d'un quart de tour) ; le bouton
 * retour (ou la sortie du plein écran) ferme le flux. Dans les deux cas l'image agrandie se zoome : deux doigts pour pincer (jusqu'à 6 fois), un doigt pour la
 * déplacer une fois zoomée, un double toucher pour zoomer ou revenir. Quand l'écran est tourné d'un quart de tour, les gestes sont ramenés dans le repère tourné.
 */
export const SCRIPT = `
const big = document.getElementById('big')
const full = document.getElementById('full')
const stage = document.getElementById('stage')
const thumbs = document.querySelectorAll('.thumb')
const phone = window.matchMedia('(max-width: 1023px)')
const MAX_ZOOM = 6
const zoomable = (container) => {
  let scale = 1
  let tx = 0
  let ty = 0
  let lastTap = 0
  let pinch = null
  const pointers = new Map()
  const rotated = () => container === stage && !full.classList.contains('keep') && window.matchMedia('(orientation: portrait)').matches
  const local = (event) => {
    if (rotated()) return { x: event.clientY, y: window.innerWidth - event.clientX }
    const box = container.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }
  const draw = () => {
    scale = Math.min(MAX_ZOOM, Math.max(1, scale))
    tx = Math.min(0, Math.max(container.offsetWidth * (1 - scale), tx))
    ty = Math.min(0, Math.max(container.offsetHeight * (1 - scale), ty))
    const image = container.querySelector('.turn, img')
    if (image) image.style.transform = scale === 1 ? '' : 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')'
  }
  const reset = () => {
    scale = 1
    tx = 0
    ty = 0
    lastTap = 0
    pinch = null
    pointers.clear()
    draw()
  }
  const middle = () => {
    const [a, b] = [...pointers.values()]
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, gap: Math.hypot(a.x - b.x, a.y - b.y) || 1 }
  }
  container.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return
    container.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, local(event))
    if (pointers.size === 2) {
      const m = middle()
      pinch = { gap: m.gap, scale, x: (m.x - tx) / scale, y: (m.y - ty) / scale }
      lastTap = 0
    } else if (pointers.size === 1) {
      const now = Date.now()
      if (now - lastTap < 300) {
        const p = pointers.get(event.pointerId)
        const next = scale > 1 ? 1 : 2.5
        const x = (p.x - tx) / scale
        const y = (p.y - ty) / scale
        scale = next
        tx = p.x - x * next
        ty = p.y - y * next
        draw()
        lastTap = 0
      } else {
        lastTap = now
      }
    }
  })
  container.addEventListener('pointermove', (event) => {
    const before = pointers.get(event.pointerId)
    if (!before) return
    const now = local(event)
    pointers.set(event.pointerId, now)
    if (pointers.size === 2 && pinch) {
      const m = middle()
      scale = Math.min(MAX_ZOOM, Math.max(1, pinch.scale * (m.gap / pinch.gap)))
      tx = m.x - pinch.x * scale
      ty = m.y - pinch.y * scale
      draw()
    } else if (pointers.size === 1 && scale > 1) {
      tx += now.x - before.x
      ty += now.y - before.y
      draw()
    }
  })
  const release = (event) => {
    pointers.delete(event.pointerId)
    pinch = null
  }
  container.addEventListener('pointerup', release)
  container.addEventListener('pointercancel', release)
  return { reset }
}
const zoomBig = zoomable(big)
const zoomStage = zoomable(stage)
const watch = (image, holder) => {
  const veil = document.createElement('span')
  veil.className = 'wait'
  veil.setAttribute('role', 'status')
  veil.innerHTML = '<span class="spin" aria-hidden="true"></span>${LOADING_TEXT}'
  holder.append(veil)
  const done = () => veil.remove()
  image.addEventListener('load', done, { once: true })
  image.addEventListener('error', done, { once: true })
  if (image.complete && image.naturalWidth > 0) done()
}
const picture = (src, holder, turned) => {
  const image = document.createElement('img')
  image.alt = ''
  watch(image, holder)
  image.src = src
  if (!turned) return image
  const turn = document.createElement('div')
  turn.className = 'turn'
  turn.append(image)
  return turn
}
thumbs.forEach((thumb) => watch(thumb.querySelector('img'), thumb))
const openFull = (src, turned) => {
  zoomStage.reset()
  stage.querySelector('.turn, img')?.remove()
  stage.prepend(picture(src, stage, turned))
  // Une image en portrait reste en portrait ; les autres passent en paysage.
  full.classList.toggle('keep', turned)
  full.classList.add('on')
  if (full.requestFullscreen) {
    full.requestFullscreen().then(() => screen.orientation?.lock?.(turned ? 'portrait' : 'landscape')?.catch?.(() => {})).catch(() => {})
  }
}
const closeFull = () => {
  zoomStage.reset()
  stage.querySelector('.turn, img')?.remove()
  stage.querySelector('.wait')?.remove()
  full.classList.remove('on', 'keep')
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  try {
    screen.orientation?.unlock?.()
  } catch (error) {}
}
document.getElementById('back').addEventListener('click', closeFull)
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && full.classList.contains('on')) closeFull()
})
thumbs.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    if (phone.matches) {
      openFull(thumb.dataset.src, thumb.dataset.turned === '1')
      return
    }
    const wasOn = thumb.classList.contains('on')
    thumbs.forEach((other) => other.classList.remove('on'))
    big.replaceChildren()
    zoomBig.reset()
    if (wasOn) return
    thumb.classList.add('on')
    big.append(picture(thumb.dataset.src, big, thumb.dataset.turned === '1'))
  })
})
`

/** L'empreinte du script, pour la politique de sécurité (script-src) : seul ce script-là s'exécute. */
export const SCRIPT_HASH = `sha256-${createHash('sha256').update(SCRIPT).digest('base64')}`

/** Une adresse de flux (clé comprise), écrite dans un attribut HTML. */
const streamUrl = (camera: string, key: string, hd: boolean): string =>
  `/stream?camera=${camera}${hd ? '&amp;quality=4k' : ''}&amp;k=${encodeURIComponent(key)}`

/** La page, qui se recharge toute seule juste avant que les flux se coupent (la clé reste dans l'adresse rechargée). */
export const renderPage = (cameras: string[], key: string, refreshSeconds: number): string => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="refresh" content="${refreshSeconds}">
<title>Perruches</title>
<style>${STYLE}</style>
</head>
<body>
<p class="hint">${HINT_TEXT}</p>
<div class="row">
${cameras.map((name) => `<button type="button" class="thumb${TURNED_CAMERAS.includes(name) ? ' turned' : ''}" aria-label="Agrandir" data-src="${streamUrl(name, key, true)}"${TURNED_CAMERAS.includes(name) ? ' data-turned="1"' : ''}><img src="${streamUrl(name, key, false)}" alt=""></button>`).join('\n')}
</div>
<div class="big" id="big"></div>
<div class="full" id="full"><div class="stage" id="stage"><button type="button" class="back" id="back">← Retour</button></div></div>
<script>${SCRIPT}</script>
</body>
</html>
`
