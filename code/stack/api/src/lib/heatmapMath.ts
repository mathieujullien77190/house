// La carte de chaleur des images : le calcul pur. Une image est réduite à une grille de gris ; deux images qui se suivent donnent, case par case, de combien elles ont changé.
// Aucun mouvement détecté en direct : on compare les images gardées (une par minute) entre elles.

/** La grille : 96 × 54 cases (16/9), quelle que soit la taille de l'image. */
export const COLS = 96
export const ROWS = 54

/**
 * Les seuils de changement (écart moyen de gris d'une case entre deux images, sur 255), du plus fin au plus gros. La carte compte, pour chaque seuil, les paires d'images
 * où la case l'a dépassé : choisir la sensibilité, c'est choisir un seuil, sans rien recalculer.
 */
export const THRESHOLDS = [3, 5, 8, 12, 18, 26, 38, 55]

/** Deux images plus éloignées que ça (secondes) ne sont pas comparées : la caméra était éteinte entre les deux. */
export const MAX_GAP_SECONDS = 330

/** Si plus de cette part des cases change d'au moins `GLOBAL_CHANGE_LEVEL` d'un coup, c'est la lumière (infrarouge, exposition) et pas un mouvement : la paire est ignorée. */
export const GLOBAL_CHANGE_SHARE = 0.6
export const GLOBAL_CHANGE_LEVEL = 18

/** On ne regarde qu'un pixel sur `STEP` (dans les deux sens) : le gris moyen d'une case n'en change presque pas, le calcul va quatre fois plus vite. */
const STEP = 2

/** Le gris moyen de chaque case d'une image RGBA (`COLS` × `ROWS` valeurs de 0 à 255, ligne par ligne). */
export const downsample = (rgba: Uint8Array, width: number, height: number): Uint8Array => {
  const grid = new Uint8Array(COLS * ROWS)
  for (let row = 0; row < ROWS; row++) {
    const y0 = Math.floor((row * height) / ROWS)
    const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * height) / ROWS))
    for (let col = 0; col < COLS; col++) {
      const x0 = Math.floor((col * width) / COLS)
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * width) / COLS))
      let sum = 0
      let count = 0
      for (let y = y0; y < y1; y += STEP) {
        for (let x = x0; x < x1; x += STEP) {
          const at = (y * width + x) * 4
          sum += ((rgba[at] ?? 0) * 299 + (rgba[at + 1] ?? 0) * 587 + (rgba[at + 2] ?? 0) * 114) / 1000
          count++
        }
      }
      grid[row * COLS + col] = Math.round(sum / count)
    }
  }
  return grid
}

/**
 * De combien chaque case a changé entre deux images (écart de gris), une fois enlevée la variation de lumière commune à toute l'image ; null quand presque toute l'image
 * change d'un coup (la paire n'est pas un mouvement).
 */
export const cellChanges = (previous: Uint8Array, current: Uint8Array): Float32Array | null => {
  const cells = previous.length
  let shift = 0
  for (let i = 0; i < cells; i++) shift += current[i]! - previous[i]!
  shift /= cells
  const changes = new Float32Array(cells)
  let large = 0
  for (let i = 0; i < cells; i++) {
    changes[i] = Math.abs(current[i]! - previous[i]! - shift)
    if (changes[i]! >= GLOBAL_CHANGE_LEVEL) large++
  }
  return large / cells > GLOBAL_CHANGE_SHARE ? null : changes
}

/** Ajoute une paire à la carte : pour chaque seuil, +1 sur les cases qui l'ont dépassé (jamais au-delà de ce que tient un Uint16). */
export const accumulate = (counts: Uint16Array[], changes: Float32Array): void => {
  for (let level = 0; level < THRESHOLDS.length; level++) {
    const threshold = THRESHOLDS[level]!
    const level_counts = counts[level]!
    for (let i = 0; i < changes.length; i++) {
      if (changes[i]! >= threshold && level_counts[i]! < 65535) level_counts[i]!++
    }
  }
}

/** Une carte vide : un compteur par seuil. */
export const emptyCounts = (): Uint16Array[] => THRESHOLDS.map(() => new Uint16Array(COLS * ROWS))
