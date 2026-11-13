import ArchDiagramUI from './UI'
import type { ArchDiagramProps } from './types'

/** Un schéma en blocs et en flèches (SVG), décrit par des données : matériel et logiciel d'un système. */
const ArchDiagram = ({ view }: ArchDiagramProps) => <ArchDiagramUI view={view} />

export default ArchDiagram
