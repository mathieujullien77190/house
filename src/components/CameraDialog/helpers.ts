import type { DiagramNode } from '@/nodes'
import type { CameraModelKind } from '@/components/CameraModel3D'

export const dialogTitle = (node: DiagramNode | null): string => (node ? `${node.title} : schéma 2D et vue 3D` : '')

export const modelKind = (node: DiagramNode | null): CameraModelKind => (node?.kind === 'zero' ? 'zero' : 'camera')
