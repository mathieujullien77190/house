import * as THREE from 'three'
import { COLORS } from './constants'
import { canvasTexture, seeded } from './primitives'

/** Le sisal : une natte beige tissée serré, des rangs de petites mailles claires et sombres en quinconce. Une image couvre 1 m. */
export const sisalTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(29)
    ctx.fillStyle = '#c9b184'
    ctx.fillRect(0, 0, 512, 512)
    const stitch = 8
    for (let row = 0; row * stitch < 512; row += 1) {
      for (let column = 0; column * stitch * 2 < 512 + stitch * 2; column += 1) {
        const light = 62 + rand() * 12
        ctx.fillStyle = `hsl(${38 + rand() * 6}, ${36 + rand() * 10}%, ${light}%)`
        ctx.fillRect(column * stitch * 2 - (row % 2) * stitch, row * stitch + 1, stitch * 2 - 2, stitch - 2)
      }
    }
  })

/** Le plan de travail : des lames de bois clair collées en long (3,5 cm), coupées en tronçons de 25 à 70 cm, de tons légèrement différents. Une image couvre 1 m. */
export const butcherTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(5)
    const strip = 18
    for (let row = 0; row * strip < 512; row += 1) {
      let x = -rand() * 200
      while (x < 512) {
        const length = 128 + rand() * 230
        ctx.fillStyle = `hsl(${36 + rand() * 6}, ${62 + rand() * 10}%, ${60 + rand() * 11}%)`
        ctx.fillRect(x, row * strip, length, strip)
        ctx.globalAlpha = 0.12
        ctx.strokeStyle = '#7a4a1c'
        ctx.beginPath()
        ctx.moveTo(x, row * strip + 6 + rand() * 6)
        ctx.lineTo(x + length, row * strip + 6 + rand() * 6)
        ctx.stroke()
        ctx.globalAlpha = 0.35
        ctx.strokeStyle = '#a9773c'
        ctx.strokeRect(x, row * strip, length, strip)
        ctx.globalAlpha = 1
        x += length
      }
    }
  })

/** Le carrelage métro beige (7,5 cm sur 15 cm), joints plus foncés. Une image couvre 60 cm. */
export const tileTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, (ctx) => {
    const rand = seeded(9)
    ctx.fillStyle = COLORS.tileGrout
    ctx.fillRect(0, 0, 256, 256)
    for (let row = 0; row < 8; row += 1) {
      const shift = row % 2 === 0 ? 0 : 32
      for (let column = -1; column < 5; column += 1) {
        ctx.fillStyle = COLORS.tile
        ctx.globalAlpha = 0.85 + rand() * 0.15
        ctx.fillRect(column * 64 + shift + 2, row * 32 + 2, 60, 28)
      }
    }
    ctx.globalAlpha = 1
  })

/** Le lambris blanc du plafond : des lames de 10 cm rainurées en long. Une image couvre 1 m. */
export const lambrisTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    ctx.fillStyle = '#f6f4ef'
    ctx.fillRect(0, 0, 512, 512)
    for (let board = 0; board < 10; board += 1) {
      ctx.fillStyle = '#d9d5cb'
      ctx.fillRect(board * 51.2, 0, 3, 512)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(board * 51.2 + 3, 0, 2, 512)
    }
  })

/**
 * Le carrelage du dehors : des carreaux de terre cuite clairs, rectangulaires (25 × 12,5 cm, deux fois plus longs que larges), posés en
 * damier de paires : deux carreaux couchés, puis deux debout, et ainsi de suite. D'un orangé presque uni, avec un joint fin et sombre.
 * Une image couvre 1 m (les surfaces à plat ont leurs coordonnées en mètres : le motif s'y répète tout seul).
 */
export const terracottaTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(17)
    const unit = 512 / 4
    const joint = 4
    ctx.fillStyle = '#4a3a30'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        // Chaque case porte deux carreaux : couchés l'un sur l'autre, ou debout côte à côte, en alternance.
        const lying = (row + column) % 2 === 0
        for (const half of [0, 1]) {
          ctx.fillStyle = `hsl(${24 + rand() * 3}, ${62 + rand() * 6}%, ${63 + rand() * 4}%)`
          const x = column * unit + (lying ? 0 : (half * unit) / 2)
          const y = row * unit + (lying ? (half * unit) / 2 : 0)
          ctx.fillRect(x + joint / 2, y + joint / 2, (lying ? unit : unit / 2) - joint, (lying ? unit / 2 : unit) - joint)
        }
      }
    }
  })

/** Le carrelage de la douche : seize carreaux carrés de côté (la douche les montre à 15 cm, `bathroom.ts`), verts clairs, sauge, crème et vert sapin, de plus en plus sombres vers le bas. */
export const showerTilesTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    const rand = seeded(47)
    const count = 16
    const size = 512 / count
    ctx.fillStyle = '#f4f4f0'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        // En bas, surtout du vert sapin ; en haut, surtout du crème et du vert clair.
        const pick = rand() + (row / count - 0.5) * 0.9
        ctx.fillStyle = pick > 0.8 ? '#1f4a47' : pick > 0.45 ? '#9db7a6' : pick > 0.15 ? '#b9cdbd' : '#eeece2'
        ctx.fillRect(column * size + 1, row * size + 1, size - 2, size - 2)
      }
    }
  })

/** Le grillage de la cage : des mailles carrées de 5 cm en fil gris, sur un fond transparent (une image couvre 20 cm, répétée sur chaque pan). */
export const wireTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256)
    ctx.strokeStyle = '#c3c8cd'
    ctx.lineWidth = 5
    for (let line = 0; line <= 4; line += 1) {
      ctx.beginPath()
      ctx.moveTo(line * 64, 0)
      ctx.lineTo(line * 64, 256)
      ctx.moveTo(0, line * 64)
      ctx.lineTo(256, line * 64)
      ctx.stroke()
    }
  })

/** Le cadran de la pendule : les douze nombres en chiffres hauts et étroits, chacun tourné selon son heure, et « QUARTZ » sous le centre. */
export const clockDialTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (ctx) => {
    ctx.fillStyle = '#f1efe9'
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = '#17181b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let hour = 1; hour <= 12; hour += 1) {
      ctx.save()
      ctx.translate(256, 256)
      ctx.rotate((hour * Math.PI) / 6)
      ctx.translate(0, -196)
      ctx.scale(0.5, 1)
      ctx.font = '300 76px Georgia, serif'
      ctx.fillText(String(hour), 0, 0)
      ctx.restore()
    }
    ctx.font = '14px sans-serif'
    ctx.fillText('Q U A R T Z', 256, 330)
  })

/** Une photo de `public/kitchen3d/` (cadres, puzzles), chargée comme texture. */
export const photoTexture = (file: string): THREE.Texture => {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}kitchen3d/${file}`)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
