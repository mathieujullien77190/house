import type { CameraEnergy, EnergyNode, LampEnergy, MachineEnergy } from '@/types'

export const ENERGY_ROOT_LABEL = 'Consommation électrique (estimation)'
export const CAMERAS_LABEL = 'Caméras'
export const LAMPS_LABEL = 'Lampes Hue'
export const MACHINE_LABEL = 'Mini PC (processeur seul)'

/** Un nœud qui en regroupe d’autres : puissance, énergie et coût sont les sommes de ses enfants (une puissance inconnue compte pour 0). */
export const sumNode = (id: string, label: string, children: EnergyNode[]): EnergyNode => ({
  id,
  label,
  watts: children.reduce((sum, child) => sum + (child.watts ?? 0), 0),
  kwh: children.reduce((sum, child) => sum + child.kwh, 0),
  cost: children.reduce((sum, child) => sum + child.cost, 0),
  children,
})

/** L’arbre de la consommation : racine (tout), puis caméras, lampes Hue et mini PC, puis chaque appareil ; null si aucune source ne répond. Une source absente n’a pas de branche. */
export const buildEnergyTree = (cameras: CameraEnergy | null, lamps: LampEnergy | null, machine: MachineEnergy | null): EnergyNode | null => {
  const groups: EnergyNode[] = []
  if (cameras) {
    const leaves = cameras.cameras.map((c) => ({ id: `camera:${c.camera}`, label: c.camera, watts: c.watts, kwh: c.kwh, cost: c.cost, children: [] }))
    groups.push(sumNode('cameras', CAMERAS_LABEL, leaves))
  }
  if (lamps) {
    const leaves = lamps.lamps.map((l) => ({ id: `lamp:${l.lamp}`, label: l.lamp, watts: l.watts, kwh: l.kwh, cost: l.cost, children: [] }))
    groups.push(sumNode('lamps', LAMPS_LABEL, leaves))
  }
  if (machine) groups.push({ id: 'machine', label: MACHINE_LABEL, watts: machine.watts, kwh: machine.kwh, cost: machine.cost, children: [] })
  return groups.length > 0 ? sumNode('root', ENERGY_ROOT_LABEL, groups) : null
}

const wattsText = (watts: number | null): string => (watts === null ? '— W' : `${watts.toFixed(1).replace('.', ',')} W`)
const kwhText = (kwh: number): string => `${kwh.toFixed(3).replace('.', ',')} kWh`
const euroText = (euros: number): string => `${euros.toFixed(2).replace('.', ',')} €`

/** Les trois chiffres d’un nœud : puissance actuelle, énergie depuis le début, coût. */
export const energyFigures = (node: EnergyNode): string => `${wattsText(node.watts)} · ${kwhText(node.kwh)} · ${euroText(node.cost)}`
