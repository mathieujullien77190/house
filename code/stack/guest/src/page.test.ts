import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { HINT_TEXT, renderPage, SCRIPT, SCRIPT_HASH, THUMB_WIDTH, TURNED_CAMERAS } from './page.ts'

const CAMERAS = ['voliere-exterieur', 'voliere-interieur']
const KEY = 'une-cle-assez-longue-123'

test('une vignette par caméra, avec son flux léger et son flux 4K, clé comprise', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.equal((html.match(/class="thumb[ "]/g) ?? []).length, 2)
  assert.match(html, /<img src="\/stream\?camera=voliere-exterieur&amp;k=une-cle-assez-longue-123"/)
  assert.match(html, /data-src="\/stream\?camera=voliere-interieur&amp;quality=4k&amp;k=une-cle-assez-longue-123"/)
})

test('les vignettes sont alignées, passent à la ligne, et ne dépassent pas la netteté du flux léger (640 px)', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.equal(THUMB_WIDTH, 640)
  assert.match(html, /\.row \{ display: flex; flex-wrap: wrap;/)
  assert.match(html, /\.thumb \{ position: relative; flex: 0 0 min\(100%, 640px\);/)
})

test('une indication « Cliquer pour passer en 4K » est affichée', () => {
  assert.equal(HINT_TEXT, 'Cliquer pour passer en 4K')
  assert.match(renderPage(CAMERAS, KEY, 1740), /<p class="hint">Cliquer pour passer en 4K<\/p>/)
})

test('une seule page : le bas est vide au départ, aucun lien vers une autre page', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.match(html, /<div class="big" id="big"><\/div>/)
  assert.doesNotMatch(html, /<a /)
  assert.doesNotMatch(html, /href=/)
})

test('sur téléphone : plein écran en paysage avec un bouton retour', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.match(html, /<div class="full" id="full">/)
  assert.match(html, /<button type="button" class="back" id="back">← Retour<\/button>/)
  assert.match(html, /@media \(max-width: 1023px\) \{ \.big \{ display: none; \} \}/)
  assert.match(html, /@media \(orientation: portrait\)/)
  assert.match(SCRIPT, /requestFullscreen/)
  assert.ok(SCRIPT.includes("lock?.(turned ? 'portrait' : 'landscape')"))
})

test('l’image agrandie se zoome au doigt : pincer, déplacer, double toucher, sans zoom du navigateur', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.match(html, /\.big, \.stage \{ touch-action: none;/)
  assert.match(html, /\.big img, \.stage img \{ transform-origin: 0 0; \}/)
  for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) assert.match(SCRIPT, new RegExp(`'${event}'`))
  assert.match(SCRIPT, /const MAX_ZOOM = 6/)
  assert.match(SCRIPT, /Math\.hypot/)
  assert.match(SCRIPT, /now - lastTap < 300/)
  // Le zoom repart de zéro à chaque ouverture et fermeture, et les gestes sont ramenés dans le repère tourné de l'écran en portrait.
  assert.match(SCRIPT, /zoomStage\.reset\(\)/)
  assert.match(SCRIPT, /zoomBig\.reset\(\)/)
  assert.match(SCRIPT, /window\.innerWidth - event\.clientX/)
})

test('la clé est encodée dans les adresses', () => {
  const html = renderPage(CAMERAS, 'a&b "c"', 1740)
  assert.match(html, /k=a%26b%20%22c%22/)
  assert.doesNotMatch(html, /k=a&b/)
})

test('ni titre ni nom de caméra à lire : seulement l’indication et le bouton « Retour »', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.doesNotMatch(html, /<h1|<figcaption/)
  // Le texte de la page, sans l'en-tête (le titre de l'onglet du navigateur n'est pas dans la page) ni le script.
  const visible = html
    .replace(/<head>[\s\S]*?<\/head>/, '')
    .replace(/<script>[\s\S]*?<\/script>/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  assert.doesNotMatch(visible, /voliere/i)
  assert.equal(visible, 'Cliquer pour passer en 4K ← Retour')
})

test('le script de la page est celui dont l’empreinte autorise l’exécution', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.ok(html.includes(`<script>${SCRIPT}</script>`))
  assert.equal(SCRIPT_HASH, `sha256-${createHash('sha256').update(SCRIPT).digest('base64')}`)
})

test('la page se recharge à l’heure demandée', () => {
  assert.match(renderPage(CAMERAS, KEY, 1740), /http-equiv="refresh" content="1740"/)
})

test("« Chargement… » est écrit sur le noir tant que la première image n'est pas arrivée", () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.ok(html.includes('Chargement…'))
  assert.ok(html.includes('.spin {'))
  assert.ok(html.includes("veil.className = 'wait'"))
})

test('la caméra posée de côté est tournée d un quart de tour horaire : vignette en portrait, marquée pour le script', () => {
  const html = renderPage(CAMERAS, KEY, 1740)
  assert.deepEqual(TURNED_CAMERAS, ['voliere-exterieur'])
  assert.match(html, /class="thumb turned"[^>]*data-turned="1"/)
  assert.equal((html.match(/data-turned=/g) ?? []).length, 1)
  assert.ok(html.includes('rotate(90deg)'))
  assert.ok(html.includes('aspect-ratio: 9 / 16'))
})
