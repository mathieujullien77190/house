import ArchDiagramUI from './UI'
import type { ArchDiagramProps } from '../types'

/** Un schéma en blocs et en flèches (SVG), décrit par des données : le même que celui du site. */
const ArchDiagram = ({ view }: ArchDiagramProps) => <ArchDiagramUI view={view} />

export default ArchDiagram
