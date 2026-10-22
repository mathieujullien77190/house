export interface GlossaryEntry {
  id: string
  /** Terme affiché dans le titre du bloc. */
  term: string
  definition: string
  /** Écritures reconnues dans les textes (insensible à la casse). */
  match: string[]
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'poe',
    term: 'PoE (Power over Ethernet)',
    definition: 'Le câble réseau transporte aussi le courant (norme 802.3af, jusqu’à 15 W par port) : une caméra n’a besoin que d’un câble RJ45, sans prise électrique à côté.',
    match: ['PoE'],
  },
  {
    id: 'rtsp',
    term: 'RTSP',
    definition: 'Real Time Streaming Protocol : protocole standard pour recevoir en direct le flux vidéo d’une caméra sur le réseau (adresse de la forme rtsp://adresse-ip/…). Le cluster lit ce flux pour enregistrer et détecter les mouvements.',
    match: ['RTSP'],
  },
  {
    id: 'rstp',
    term: 'RSTP',
    definition: 'Rapid Spanning Tree Protocol : évite les boucles réseau quand deux switchs sont reliés par plusieurs câbles, et bascule vite sur un autre chemin si un lien tombe.',
    match: ['RSTP'],
  },
  {
    id: 'splitter',
    term: 'Splitter PoE',
    definition: 'Petit boîtier qui sépare le courant et les données d’un câble PoE : il sort du 5 V pour alimenter un appareil qui n’est pas PoE (comme le Pi Zero) et une prise RJ45 pour les données.',
    match: ['splitter PoE', 'splitter'],
  },
  {
    id: 'otg',
    term: 'Adaptateur Ethernet USB-OTG',
    definition: 'Adaptateur qui ajoute un port Ethernet au Pi Zero 2 W en passant par son port micro-USB de données, puisque ce Pi n’a pas de prise réseau.',
    match: ['adaptateur Ethernet USB-OTG', 'Ethernet USB-OTG', 'USB-OTG'],
  },
  {
    id: 'bonding',
    term: 'Bonding active-backup',
    definition: 'Deux liens réseau regroupés en un seul : un seul est actif, l’autre prend le relais si le premier ou son switch tombe en panne.',
    match: ['bonding active-backup', 'bonding'],
  },
  {
    id: 'k3s',
    term: 'k3s',
    definition: 'Distribution Kubernetes légère, pensée pour les petites machines comme les Raspberry Pi. Elle orchestre les applications sur plusieurs nœuds.',
    match: ['k3s'],
  },
  {
    id: 'control-plane',
    term: 'control-plane',
    definition: 'Nœud qui pilote le cluster : serveur d’API, planification des applications et base etcd. Un nœud peut être à la fois control-plane et worker.',
    match: ['control-plane'],
  },
  {
    id: 'worker',
    term: 'worker',
    definition: 'Nœud qui exécute les applications du cluster (ingestion vidéo, détection, base de données…).',
    match: ['worker'],
  },
  {
    id: 'etcd',
    term: 'etcd',
    definition: 'Base de données où Kubernetes garde l’état du cluster. Elle est embarquée dans k3s et fonctionne en groupe : il faut un nombre impair de membres.',
    match: ['etcd'],
  },
  {
    id: 'quorum',
    term: 'Quorum',
    definition: 'Majorité des membres etcd qui doivent rester en ligne pour que le cluster fonctionne. Avec 3 membres, 2 suffisent : le cluster tolère la perte d’un nœud.',
    match: ['quorum'],
  },
  {
    id: 'taint',
    term: 'Taint (NoSchedule)',
    definition: 'Marque posée sur un nœud pour repousser les applications. Avec NoSchedule, aucune application n’y est planifiée, sauf celles qui déclarent la toleration correspondante.',
    match: ['taint', 'NoSchedule'],
  },
  {
    id: 'toleration',
    term: 'Toleration',
    definition: 'Déclaration d’une application qui l’autorise à être planifiée sur un nœud portant un taint. Les jobs de sauvegarde l’utilisent pour tourner sur le Pi de sauvegarde.',
    match: ['toleration'],
  },
  {
    id: 'nodeselector',
    term: 'nodeSelector',
    definition: 'Réglage d’une application qui la limite aux nœuds portant un label donné, par exemple role=backup.',
    match: ['nodeSelector'],
  },
  {
    id: 'cronjob',
    term: 'CronJob',
    definition: 'Tâche Kubernetes lancée à heure fixe, comme une sauvegarde nocturne.',
    match: ['CronJob', 'jobs de sauvegarde'],
  },
  {
    id: 'longhorn',
    term: 'Longhorn',
    definition: 'Stockage distribué pour Kubernetes : il copie les volumes sur plusieurs nœuds pour survivre à la panne de l’un d’eux.',
    match: ['Longhorn'],
  },
  {
    id: 'drain',
    term: 'Cordon et drain',
    definition: 'Cordon empêche de nouvelles applications d’arriver sur un nœud ; drain déplace celles qui y tournent. On les utilise avant d’éteindre un nœud.',
    match: ['cordon et drain', 'cordon', 'drain'],
  },
]

export const findEntry = (id: string): GlossaryEntry | undefined => GLOSSARY.find((e) => e.id === id)
