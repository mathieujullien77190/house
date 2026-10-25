// La page de House Sync : ce qu'il a écrit, rendu en HTML côté serveur (un seul script, pour le rechargement).
// Fonctions pures : elles reçoivent les lignes et les fichiers, elles renvoient du texte.
import type { DatabaseSync } from 'node:sqlite'

export interface BackupFile {
  path: string
  size: number
  modifiedMs: number
}

export interface TableDump {
  name: string
  columns: string[]
  rows: Record<string, unknown>[]
}

export const TABLES = ['events', 'last_images', 'live_streams']
const MAX_ROWS = 100

const escape = (value: unknown): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const UNITS = ['o', 'Ko', 'Mo', 'Go']
export const formatSize = (bytes: number): string => {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`
}

const formatDate = (ms: number): string => new Date(ms).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })

/** Un clip servi par House Sync (/files/clips/…), en lecteur dépliable : rien n'est chargé avant le clic. */
const clipLink = (path: string): string =>
  `<details class="clip"><summary>${escape(path)}</summary><video controls preload="none" src="/files/${escape(path)}"></video></details>`

// Les horodatages de Frigate (colonnes *_at, en secondes) sont montrés tels quels et en clair ; les chemins
// de clips deviennent des lecteurs, les adresses des liens, les étiquettes des pastilles.
const formatCell = (column: string, value: unknown): string => {
  if (value === null || value === undefined) return '<i class="muted">null</i>'
  if (typeof value === 'number' && column.endsWith('_at')) return `<span class="num">${value}</span> <small class="muted">${formatDate(value * 1000)}</small>`
  if (column === 'clip_path' && typeof value === 'string') return clipLink(value)
  if (column === 'url' && typeof value === 'string') return `<a href="${escape(value)}" target="_blank" rel="noopener">${escape(value)}</a>`
  if (column === 'label') return `<span class="badge">${escape(value)}</span>`
  if (column === 'camera') return `<span class="camera">${escape(value)}</span>`
  return escape(value)
}

/** Chaque table, colonnes dans l'ordre du schéma, 100 lignes au plus, les plus récentes d'abord. */
export const dumpTables = (db: DatabaseSync): TableDump[] =>
  TABLES.map((name) => {
    const columns = (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name)
    const order = columns.includes('started_at') ? 'ORDER BY started_at DESC' : 'ORDER BY camera'
    const rows = db.prepare(`SELECT * FROM ${name} ${order} LIMIT ${MAX_ROWS}`).all() as Record<string, unknown>[]
    return { name, columns, rows }
  })

const renderTable = (table: TableDump): string => {
  const head = table.columns.map((c) => `<th>${escape(c)}</th>`).join('')
  const body = table.rows
    .map((row) => `<tr>${table.columns.map((c) => `<td>${formatCell(c, row[c])}</td>`).join('')}</tr>`)
    .join('')
  const content = table.rows.length === 0 ? '<p class="muted">vide</p>' : `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  return `<section class="card"><h3><code>${escape(table.name)}</code> <span class="count">${table.rows.length} ligne(s)</span></h3>${content}</section>`
}

const renderFiles = (files: BackupFile[]): string => {
  if (files.length === 0) return '<section class="card"><p class="muted">Aucun fichier copié pour l’instant.</p></section>'
  const total = files.reduce((sum, f) => sum + f.size, 0)
  const rows = files
    .map((f) => `<tr><td>${f.path.endsWith('.mp4') ? clipLink(f.path) : escape(f.path)}</td><td class="num">${formatSize(f.size)}</td><td class="muted">${formatDate(f.modifiedMs)}</td></tr>`)
    .join('')
  return `<section class="card"><h3>Fichiers <span class="count">${files.length} · ${formatSize(total)}</span></h3>
    <table><thead><tr><th>Fichier (clic pour voir)</th><th>Taille</th><th>Modifié</th></tr></thead><tbody>${rows}</tbody></table></section>`
}

// Les couleurs de la maison, claires ou sombres selon le système (les mêmes jetons que le site et la WebApp).
const STYLE = `
  :root { color-scheme: light dark; font-family: system-ui, sans-serif;
    --bg: #f6f7f9; --card: #fff; --text: #1b1f27; --muted: #5d6675; --line: #c9cfd9; --accent: #2f7de1; --green: #1f9d6b; --orange: #d98a1c; }
  @media (prefers-color-scheme: dark) { :root { --bg: #12151b; --card: #1a1e26; --text: #e8ebf1; --muted: #98a1b1; --line: #3a4150; --accent: #5b9bf0; --green: #3fc590; --orange: #f0a940; } }
  body { margin: 0 auto; max-width: 1100px; padding: 16px; background: var(--bg); color: var(--text); }
  a { color: var(--accent); }
  h1 { font-size: 1.4rem; margin: 0 0 4px; }
  h2 { font-size: 1.1rem; margin: 28px 0 8px; color: var(--accent); }
  h3 { font-size: 0.95rem; margin: 0 0 8px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; margin-top: 12px; }
  .muted { color: var(--muted); font-weight: normal; }
  .count { color: var(--muted); font-weight: normal; font-size: 0.85rem; margin-left: 6px; }
  .path { font-family: ui-monospace, monospace; font-size: 0.8rem; color: var(--muted); }
  code, td, th { font-family: ui-monospace, monospace; font-size: 0.8rem; }
  code { color: var(--orange); }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; padding: 6px 8px; color: var(--muted); font-weight: 600; border-bottom: 2px solid var(--line); }
  td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; word-break: break-all; }
  tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--accent) 5%, transparent); }
  .num { font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--green) 18%, transparent); color: var(--green); font-weight: 600; }
  .camera { color: var(--accent); font-weight: 600; }
  .clip summary { cursor: pointer; color: var(--accent); }
  .clip summary::marker { color: var(--muted); }
  .clip video { display: block; margin-top: 8px; width: 100%; max-width: 640px; aspect-ratio: 16 / 9; border-radius: 8px; background: #000; }
  form { display: flex; gap: 8px; align-items: center; margin-top: 24px; flex-wrap: wrap; }
  input { padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--text); }
  button { padding: 6px 12px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: #fff; cursor: pointer; }
  .bar { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .totals { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
  .total { flex: 1 1 220px; background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 14px; }
  .total .value { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .refused { color: #d64545; }
`

// Le seul script de la page : recharger à intervalle régulier, sauf si un clip est ouvert (on le regarde).
const refreshScript = (seconds: number): string =>
  `<script>setInterval(() => { if (!document.querySelector('details[open]')) location.reload() }, ${seconds * 1000})</script>`

const layout = (title: string, body: string, refreshSeconds = 0): string => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><style>${STYLE}</style></head><body>${body}${refreshSeconds ? refreshScript(refreshSeconds) : ''}</body></html>`

/** Le formulaire de la clé : la même clé que la WebApp (API_KEY), gardée ensuite dans un cookie de session. */
export const renderLogin = (refused: boolean): string =>
  layout(
    'House Sync',
    `<h1>House Sync</h1><p class="muted">Ce que House Sync a écrit : sa base SQLite et le disque backup.</p>
    ${refused ? '<p class="refused">Clé refusée.</p>' : ''}
    <form method="post" action="/login"><label for="key">Clé secrète</label>
    <input id="key" name="key" type="password" autocomplete="current-password" required><button type="submit">Entrer</button></form>`,
  )

/** Les totaux en tête de page : ce que pèsent les vidéos copiées et la base. */
const renderTotals = (files: BackupFile[], dbSize: number, events: number): string => {
  const videos = files.filter((f) => f.path.endsWith('.mp4'))
  const total = videos.reduce((sum, f) => sum + f.size, 0)
  return `<div class="totals">
    <div class="total"><div class="value">${formatSize(total)}</div><div class="muted">${videos.length} vidéo(s) sur le disque backup</div></div>
    <div class="total"><div class="value">${formatSize(dbSize)}</div><div class="muted">base SQLite · ${events} événement(s)</div></div>
  </div>`
}

export const renderPage = (
  dbPath: string,
  dbSize: number,
  tables: TableDump[],
  backupDir: string,
  files: BackupFile[],
  refreshSeconds: number,
): string =>
  layout(
    'House Sync',
    `<div class="bar"><h1>House Sync</h1><span class="muted">mis à jour ${formatDate(Date.now())} · rechargée toutes les ${refreshSeconds} s sauf clip ouvert · <a href="/logout">quitter</a></span></div>
    <p class="muted">Le seul programme qui écrit ici. L’API et la WebApp ne lisent jamais cette page. Un clic sur un clip l’ouvre ici même.</p>
    ${renderTotals(files, dbSize, tables.find((t) => t.name === 'events')?.rows.length ?? 0)}
    <h2>Base SQLite <span class="path">${escape(dbPath)}</span></h2>${tables.map(renderTable).join('')}
    <h2>Disque backup <span class="path">${escape(backupDir)}</span></h2>${renderFiles(files)}`,
    refreshSeconds,
  )
