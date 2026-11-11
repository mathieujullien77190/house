// La base SQLite de House Sync (events.db) : ses tables, les colonnes ajoutées après coup, le déclencheur d'orientation et la migration
// unique des orientations. Seul House Sync écrit dans cette base ; House API la lit.
import type { DatabaseSync } from 'node:sqlite'
import { backfillSnapshotCodes } from './snapshotCodes.ts'

export const ORIENTATIONS = ['landscape', 'portrait']
export type Orientation = 'landscape' | 'portrait'
export const DEFAULT_ORIENTATION: Orientation = 'landscape'

/** Ajoute une colonne à une table qui existe déjà (les bases créées avant elle ne l'ont pas). */
export const addColumn = (db: DatabaseSync, table: string, column: string, type: string): void => {
  if (!(db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((existing) => existing.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}

const ORIENTATION_MIGRATION_KEY = 'orientation_migrated'

/** Crée les tables et les colonnes qui manquent, puis fait (une fois) la migration des orientations. `now` : l'heure en millisecondes. */
export const initDatabase = (db: DatabaseSync, dataDir: string, now: () => number): void => {
  db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    camera TEXT NOT NULL,
    label TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    clip_path TEXT,
    clip_started_at INTEGER,
    clip_web_path TEXT
  );
  CREATE TABLE IF NOT EXISTS last_images (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS live_streams (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    camera TEXT NOT NULL,
    taken_at INTEGER NOT NULL,
    path TEXT NOT NULL,
    PRIMARY KEY (camera, taken_at)
  );
  CREATE TABLE IF NOT EXISTS settings (
    camera TEXT PRIMARY KEY,
    clips_enabled INTEGER NOT NULL DEFAULT 1,
    clips_mode TEXT,
    live_fps INTEGER,
    light_fps INTEGER,
    snapshot_seconds INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS merges (
    absorbed_id TEXT PRIMARY KEY,
    kept_id TEXT NOT NULL,
    camera TEXT NOT NULL,
    absorbed_started_at INTEGER NOT NULL,
    absorbed_ended_at INTEGER,
    merged_at INTEGER NOT NULL
  );
`)
  // Les réglages de la sauvegarde, par caméra (réglés depuis la page) : garder ou non les clips, une image toutes les N secondes.
  // Les bases créées avant le mode « la nuit » ont `clips_enabled` seul.
  addColumn(db, 'settings', 'clips_mode', 'TEXT')
  addColumn(db, 'settings', 'live_fps', 'INTEGER')
  addColumn(db, 'settings', 'light_fps', 'INTEGER')
  // La cadence des directs sur un écran de moins de 1024 px (téléphone), réglée à part de celle du PC.
  for (const column of ['live_fps_mobile', 'light_fps_mobile', 'motion_sensitivity', 'motion_min_seconds']) addColumn(db, 'settings', column, 'INTEGER')
  // L'orientation de la caméra (voir plus bas) : la colonne doit exister avant que la requête des réglages soit préparée.
  addColumn(db, 'settings', 'orientation', 'TEXT')
  // Le mode pluie de la caméra (off ou on) : allumé, quand la météo annonce de la pluie, pas de clips (la détection est coupée) et une image toutes les 5 s.
  addColumn(db, 'settings', 'rain_mode', 'TEXT')
  // Le niveau de pluie qui s'applique vraiment à la caméra (off, rain, heavy) : le mode pluie et la météo ; écrit par House Sync, lu par l'API pour le symbole.
  addColumn(db, 'settings', 'rain_now', 'TEXT')
  // Les yeux qui brillent de la caméra (off ou on) et si la recherche tourne maintenant (0 ou 1), écrit par House Sync, lu par l'API pour l'icône œil.
  addColumn(db, 'settings', 'eyes_mode', 'TEXT')
  addColumn(db, 'settings', 'eyes_now', 'INTEGER')
  // Les bases créées avant cette colonne la reçoivent ici (le début réel du clip, pour caler la lecture sur la frise).
  addColumn(db, 'events', 'clip_started_at', 'INTEGER')
  // Idem pour la copie légère du clip (H.264, 720p), à côté de l'original (H.265, 4K).
  addColumn(db, 'events', 'clip_web_path', 'TEXT')
  // Idem pour le son du clip (AAC, à part de la vidéo), pour les caméras à son.
  addColumn(db, 'events', 'clip_audio_path', 'TEXT')
  addColumn(db, 'events', 'clip_shapes_path', 'TEXT')

  // L'orientation de la caméra : « paysage » (le direct tel que la caméra le donne) ou « portrait » (caméra posée de côté : l'image est tournée d'un quart de tour horaire pour être droite). Elle se règle
  // par caméra dans la page (colonne `settings.orientation`, paysage par défaut) et chaque événement garde celle qu'avait sa caméra quand il a commencé (colonne `events.orientation`, posée par le
  // déclencheur ci-dessous) : un clip pris avant que la caméra soit tournée reste en paysage.
  addColumn(db, 'settings', 'orientation', 'TEXT')
  addColumn(db, 'events', 'orientation', 'TEXT')
  db.exec(`
  CREATE TRIGGER IF NOT EXISTS events_orientation AFTER INSERT ON events WHEN NEW.orientation IS NULL
  BEGIN
    UPDATE events SET orientation = COALESCE((SELECT orientation FROM settings WHERE camera = NEW.camera), '${DEFAULT_ORIENTATION}') WHERE id = NEW.id;
  END;
  CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`)
  // Une fois : les événements d'avant (leur colonne est vide) sont étiquetés. La voliere-exterieur a été posée de côté le 8 novembre 2026 à 11 h (heure de Paris, 10 h UTC) : ses événements d'avant sont
  // en paysage, ceux d'après en portrait ; tout le reste est en paysage. Une copie de la base est faite avant (VACUUM INTO : un fichier complet et cohérent).
  if (!db.prepare('SELECT 1 FROM app_settings WHERE key = ?').get(ORIENTATION_MIGRATION_KEY)) {
    const turnedAt = Date.UTC(2026, 10, 8, 10, 0, 0) / 1000
    const backup = `${dataDir}/events.db.pre-orientation-${new Date(now()).toISOString().replace(/[:.]/g, '-')}`
    db.exec(`VACUUM INTO '${backup}'`)
    db.prepare("UPDATE events SET orientation = CASE WHEN camera = 'voliere-exterieur' AND started_at >= ? THEN 'portrait' ELSE 'landscape' END WHERE orientation IS NULL").run(turnedAt)
    db.prepare("UPDATE settings SET orientation = 'portrait' WHERE camera = 'voliere-exterieur'").run()
    db.prepare("UPDATE settings SET orientation = 'landscape' WHERE orientation IS NULL").run()
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(ORIENTATION_MIGRATION_KEY, new Date(now()).toISOString())
    console.log(`Orientation : événements étiquetés (copie de la base : ${backup})`)
  }
  // L'identifiant permanent des images gardées (voir `snapshotCodes.ts`) : la colonne, son index unique, puis (sans effet une fois faite) le code des images qui n'en ont pas encore.
  addColumn(db, 'snapshots', 'code', 'TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS snapshots_code ON snapshots (code)')
  const coded = backfillSnapshotCodes(db)
  if (coded > 0) console.log(`Images : ${coded} codes attribués`)
  // L'ancienne valeur « night » du réglage des yeux qui brillent vaut « on » (à chaque ouverture : sans effet une fois faite).
  db.exec("UPDATE settings SET eyes_mode = 'on' WHERE eyes_mode = 'night'")
}
