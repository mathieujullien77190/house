import { isK3sKind, type DiagramNode } from '@/nodes'
import { BACKUP_TAINT, FLOOR_LABEL, ROLES_PHASE1 } from './constants'
import type { K3sNodeRow } from './types'

export const buildRows = (nodes: DiagramNode[], phase: 1 | 2): K3sNodeRow[] => {
  return nodes
    .filter((n) => isK3sKind(n.kind))
    .map((n) => ({
      id: n.id,
      name: n.title,
      floor: FLOOR_LABEL[n.floor],
      role: phase === 1 ? (ROLES_PHASE1[n.id] ?? 'worker') : n.kind === 'backup' ? 'control-plane, sans applications' : 'control-plane + worker',
      taint: n.kind === 'backup' ? BACKUP_TAINT : '—',
    }))
}

export const quorumSummary = (count: number, phase: 1 | 2): { text: string; ok: boolean } => {
  if (phase === 1) return { text: `${count} nœud(s) : un serveur et un agent, sans haute disponibilité (un seul control-plane, pas d’etcd à plusieurs).`, ok: true }
  if (count === 0) return { text: 'Aucun nœud : pas de cluster, le PC enregistre les flux (version light).', ok: true }
  if (count === 1) return { text: `${count} nœud : cluster simple, sans haute disponibilité (version light).`, ok: true }
  if (count < 3) return { text: `${count} nœud(s) control-plane : il en faut au moins 3 pour un quorum etcd.`, ok: false }
  const tolerated = Math.floor((count - 1) / 2)
  return { text: `${count} nœuds control-plane : quorum etcd assuré, tolère ${tolerated} panne${tolerated > 1 ? 's' : ''}.`, ok: true }
}
