// L'état du réseau de la machine (le câble RJ45 et le WiFi) que montre la page de House Sync, lu dans le /sys de l'hôte
// (monté en lecture seule dans /host/sys : celui du conteneur ne montre que sa propre carte virtuelle). Seules les cartes
// physiques sont gardées (celles qui ont un dossier `device`) : ni docker0, ni les ponts, ni les veth des conteneurs.
import { readdir, readFile } from 'node:fs/promises'

export interface NetworkInterface {
  name: string
  /** `wifi` si la carte a un dossier `wireless`, `ethernet` sinon. */
  kind: 'ethernet' | 'wifi'
  /** Le système la considère en marche (operstate = up). */
  up: boolean
  /** Un câble est branché (ethernet) ou on est associé à un point d'accès (WiFi) ; null si la carte ne le dit pas. */
  connected: boolean | null
  /** Débit négocié en Mb/s (1000 pour un câble Gigabit), null à l'arrêt. */
  speedMbps: number | null
  duplex: string | null
  mac: string
  /** Octets reçus et envoyés depuis le démarrage. */
  rxBytes: number
  txBytes: number
  /** Le signal WiFi en dBm, quand le pilote le donne et que la carte est associée. */
  signalDbm: number | null
}

const SYS_DIR = process.env.HOST_SYS_DIR ?? '/host/sys'

const text = (path: string): Promise<string> => readFile(path, 'utf8').then((content) => content.trim(), () => '')
const number = (value: string): number | null => (value !== '' && Number.isFinite(Number(value)) ? Number(value) : null)

/** Le débit négocié : le noyau rend -1 (ou une erreur) quand la carte n'a pas de liaison. */
export const parseSpeed = (value: string): number | null => {
  const speed = number(value)
  return speed !== null && speed > 0 ? speed : null
}

/** Le signal en dBm : le noyau l'écrit parfois sans signe (« 201 » pour -55 dBm, complément à 256). */
export const parseSignal = (value: string): number | null => {
  const level = number(value)
  if (level === null || level === 0) return null
  return level > 0 ? level - 256 : level
}

const readInterface = async (dir: string, name: string): Promise<NetworkInterface | null> => {
  const base = `${dir}/class/net/${name}`
  const isPhysical = (await readdir(`${base}/device`).then(() => true, () => false)) || (await text(`${base}/device/vendor`)) !== ''
  if (!isPhysical) return null
  const wifi = await readdir(`${base}/wireless`).then(() => true, () => false)
  const state = await text(`${base}/operstate`)
  // `carrier` est illisible tant que la carte est arrêtée : on retombe sur operstate.
  const carrier = await text(`${base}/carrier`)
  return {
    name,
    kind: wifi ? 'wifi' : 'ethernet',
    up: state === 'up',
    connected: carrier === '' ? (state === '' ? null : state === 'up') : carrier === '1',
    speedMbps: parseSpeed(await text(`${base}/speed`)),
    duplex: (await text(`${base}/duplex`)) || null,
    mac: await text(`${base}/address`),
    rxBytes: number(await text(`${base}/statistics/rx_bytes`)) ?? 0,
    txBytes: number(await text(`${base}/statistics/tx_bytes`)) ?? 0,
    signalDbm: wifi ? parseSignal(await text(`${base}/wireless/level`)) : null,
  }
}

/** Les cartes réseau physiques de la machine, le câble avant le WiFi ; vide si le /sys de l'hôte n'est pas monté. */
export const readNetwork = async (dir = SYS_DIR): Promise<NetworkInterface[]> => {
  const names = await readdir(`${dir}/class/net`).catch(() => [] as string[])
  const found = (await Promise.all(names.map((name) => readInterface(dir, name)))).filter((item): item is NetworkInterface => item !== null)
  return found.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'ethernet' ? -1 : 1))
}
