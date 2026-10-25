import type { DiagramNode } from '@/nodes'

export interface K3sPanelProps {
  nodes: DiagramNode[]
  /** La phase affichée : 1 (2 Pi, un serveur et un agent) ou 2 (le cluster à 3 control-plane). */
  phase: 1 | 2
}

export interface K3sNodeRow {
  id: string
  name: string
  floor: string
  role: string
  /** Taint appliqué au nœud (« — » s'il n'en a pas). */
  taint: string
}

export interface CommandBlock {
  title: string
  code: string
}

export interface K3sPanelUIProps {
  rows: K3sNodeRow[]
  /** Résumé du quorum etcd. */
  quorum: string
  quorumOk: boolean
  rules: string[]
  commands: CommandBlock[]
}
