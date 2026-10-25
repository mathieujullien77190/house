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

/** Phase 1 : Pi 2 est l'unique serveur (control-plane), Pi 1 un agent qui ne fait que go2rtc et motion. */
export const RULES_PHASE1: string[] = [
  'Pi 2 est le serveur k3s (control-plane + worker, base SQLite embarquée) ; Pi 1 est un agent. Un seul serveur : pas de haute disponibilité, elle vient avec les 3 control-plane de la phase 2.',
  'go2rtc et motion sont des Deployments avec un nodeSelector role=recorder : ils restent sur le Pi 1, qui voit les caméras. Leurs segments (6 h) sont sur un volume hostPath de la microSD, pas dans le pod.',
  'House Sync, House API et la WebApp sont des Deployments avec un nodeSelector role=hub : ils restent sur le Pi 2, avec le disque dur externe monté en hostPath (/mnt/ssd, monté au démarrage avant k3s).',
  'go2rtc et l’API de motion n’ont qu’un Service ClusterIP : seuls les pods du cluster les joignent. Seuls l’API (8080) et la page de House Sync (8081) sont publiés, avec le certificat de la maison.',
  'Les secrets (clé de l’API, mot de passe des caméras, compte du switch) sont des Secrets Kubernetes, jamais dans les manifestes ni dans git.',
  'Le passage à la phase 2 ajoute des serveurs (3 control-plane, etcd embarqué) et un nœud de sauvegarde sans applications.',
]

export const COMMANDS_PHASE1: CommandBlock[] = [
  {
    title: 'Pi 2 (serveur)',
    code: 'curl -sfL https://get.k3s.io | K3S_TOKEN=<jeton> sh -s - server --node-label role=hub',
  },
  {
    title: 'Pi 1 (agent)',
    code: 'curl -sfL https://get.k3s.io | K3S_TOKEN=<jeton> K3S_URL=https://<ip-pi2>:6443 sh -s - agent --node-label role=recorder',
  },
]

/** Rôle de chaque Pi de la phase 1, d'après son identifiant dans le schéma. */
export const ROLES_PHASE1: Record<string, string> = {
  rec: 'agent : go2rtc + motion',
  hub: 'serveur (control-plane + worker) : House Sync + API + WebApp',
}

export const FLOOR_LABEL = { rdc: 'rez-de-chaussée', basement: 'sous-sol' } as const

export const CODE_CLASS = 'mt-1 overflow-x-auto rounded-lg border border-line bg-bg p-2 text-xs'
