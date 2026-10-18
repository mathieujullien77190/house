import type { DiagramNode } from '@/nodes'

export interface K3sPanelProps {
  nodes: DiagramNode[]
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
