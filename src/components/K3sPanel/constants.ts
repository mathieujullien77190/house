import type { CommandBlock } from './types'

export const TITLE = 'Cluster k3s : nœuds et règles'

export const BACKUP_TAINT = 'node-role.kubernetes.io/backup=true:NoSchedule'

/** Règles qui s'appliquent au cluster, en particulier au Pi de sauvegarde. */
export const RULES: string[] = [
  'Les 3 nœuds sont control-plane avec etcd embarqué : le cluster tolère la perte d’un nœud.',
  'Le Pi de sauvegarde porte le taint NoSchedule : aucune application n’y est planifiée.',
  'Les jobs de sauvegarde (CronJob) ajoutent la toleration correspondante et un nodeSelector role=backup, et écrivent sur le SSD.',
  'Pas de réplicas de volumes distribués sur le Pi de sauvegarde (désactiver le disque par défaut de Longhorn sur ce nœud).',
  'Les snapshots etcd (k3s etcd-snapshot) sont copiés sur le SSD du Pi de sauvegarde.',
  'Cordon et drain avant une coupure prévue ; le cluster reste sain avec ce nœud hors ligne.',
]

export const COMMANDS: CommandBlock[] = [
  {
    title: 'Premier Pi5',
    code: 'curl -sfL https://get.k3s.io | K3S_TOKEN=<jeton> sh -s - server --cluster-init',
  },
  {
    title: 'Deuxième Pi5',
    code: 'curl -sfL https://get.k3s.io | K3S_TOKEN=<jeton> sh -s - server --server https://<ip-pi5-1>:6443',
  },
  {
    title: 'Pi de sauvegarde',
    code: `curl -sfL https://get.k3s.io | K3S_TOKEN=<jeton> sh -s - server --server https://<ip-pi5-1>:6443 \\
  --node-taint ${BACKUP_TAINT} \\
  --node-label role=backup`,
  },
]

export const FLOOR_LABEL = { rdc: 'rez-de-chaussée', basement: 'sous-sol' } as const

export const CODE_CLASS = 'mt-1 overflow-x-auto rounded-lg border border-line bg-bg p-2 text-xs'
