// L'identifiant permanent des images gardées : `snapshots.code` = la lettre de la caméra puis le numéro d'ordre de l'image, écrit en lettres.
// Lettre de la caméra : son rang d'arrivée (voliere-interieur = a, voliere-exterieur = b, salon-de-jardin = c, voliere-toit = d) ; une autre caméra prend la
// lettre suivante la première fois qu'on la voit (gardée dans `app_settings`). Numéro : un compteur par caméra (`snapshot_seq_<caméra>` dans `app_settings`)
// qui ne fait que monter, même quand le ménage quotidien supprime les vieilles lignes : un code n'est donc jamais réutilisé. Écrit en base 26 « bijective »
// avec le moins de lettres possible : 1 = a, 26 = z, 27 = aa, 28 = ab, 702 = zz, 703 = aaa. Exemples : `aa` (1re image de voliere-interieur), `da`, `dzz`.
import type { DatabaseSync } from 'node:sqlite'
import { CAMERA_ORDER, compareCameras } from './cameraOrder.ts'

const SEQ_PREFIX = 'snapshot_seq_'
const CAMERA_PREFIX = 'snapshot_camera_'

/** Un nombre (à partir de 1) en lettres minuscules, le moins possible : 1 = a, 26 = z, 27 = aa, 52 = az, 53 = ba, 702 = zz, 703 = aaa. */
export const letters = (value: number): string => {
  let rest = value
  let text = ''
  while (rest > 0) {
    rest -= 1
    text = String.fromCharCode(97 + (rest % 26)) + text
    rest = Math.floor(rest / 26)
  }
  return text
}

/** Le code d'une image : la lettre de sa caméra (rang à partir de 0) puis son numéro d'ordre (à partir de 1) en lettres. */
export const codeOf = (cameraIndex: number, sequence: number): string => letters(cameraIndex + 1) + letters(sequence)

const getSetting = (db: DatabaseSync, key: string): string | undefined => (db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined)?.value
const putSetting = (db: DatabaseSync, key: string, value: number): void => {
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value))
}

/** Le rang de la caméra (à partir de 0) : celui de la liste d'arrivée, ou, pour une autre, le suivant libre, attribué une fois pour toutes. */
export const cameraIndexOf = (db: DatabaseSync, camera: string): number => {
  const known = CAMERA_ORDER.indexOf(camera)
  if (known !== -1) return known
  const key = CAMERA_PREFIX + camera
  const stored = getSetting(db, key)
  if (stored !== undefined) return Number(stored)
  const count = (db.prepare('SELECT COUNT(*) AS n FROM app_settings WHERE substr(key, 1, ?) = ?').get(CAMERA_PREFIX.length, CAMERA_PREFIX) as { n: number }).n
  const index = CAMERA_ORDER.length + count
  putSetting(db, key, index)
  return index
}

/** Ajoute une image avec son code et rend vrai ; si (caméra, instant) existe déjà, rien n'est écrit et aucun numéro n'est consommé (faux). */
export const insertSnapshot = (db: DatabaseSync, camera: string, takenAt: number, path: string): boolean => {
  db.exec('BEGIN')
  try {
    if (db.prepare('SELECT 1 FROM snapshots WHERE camera = ? AND taken_at = ?').get(camera, takenAt)) {
      db.exec('COMMIT')
      return false
    }
    const sequence = Number(getSetting(db, SEQ_PREFIX + camera) ?? 0) + 1
    putSetting(db, SEQ_PREFIX + camera, sequence)
    db.prepare('INSERT INTO snapshots (camera, taken_at, path, code) VALUES (?, ?, ?, ?)').run(camera, takenAt, path, codeOf(cameraIndexOf(db, camera), sequence))
    db.exec('COMMIT')
    return true
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Une fois par ouverture (sans effet s'il ne manque rien) : les images sans code en reçoivent un, par caméra dans l'ordre de leur instant, à la suite du compteur. Rend leur nombre. */
export const backfillSnapshotCodes = (db: DatabaseSync): number => {
  const cameras = (db.prepare('SELECT DISTINCT camera FROM snapshots WHERE code IS NULL').all() as { camera: string }[]).map((row) => row.camera).sort(compareCameras)
  if (cameras.length === 0) return 0
  let total = 0
  db.exec('BEGIN')
  try {
    const rows = db.prepare('SELECT taken_at FROM snapshots WHERE camera = ? AND code IS NULL ORDER BY taken_at')
    const update = db.prepare('UPDATE snapshots SET code = ? WHERE camera = ? AND taken_at = ?')
    for (const camera of cameras) {
      const index = cameraIndexOf(db, camera)
      let sequence = Number(getSetting(db, SEQ_PREFIX + camera) ?? 0)
      for (const row of rows.all(camera) as { taken_at: number }[]) {
        sequence += 1
        update.run(codeOf(index, sequence), camera, row.taken_at)
        total += 1
      }
      putSetting(db, SEQ_PREFIX + camera, sequence)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return total
}
