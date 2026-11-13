import type { DiagramNode } from '@/nodes'

export const dialogTitle = (node: DiagramNode | null): string => (node ? `${node.title} : schéma 2D et vue 3D` : '')
