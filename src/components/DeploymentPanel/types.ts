/** Une ligne du déploiement : un équipement ou un service de la phase 0 et où le joindre. */
export interface DeployEntry {
  id: string
  name: string
  /** Ce que c'est, en quelques mots. */
  role: string
  /** Adresse à ouvrir ; vide s'il n'y a pas de page web. */
  url: string
  /** Comptes (noms seulement : les mots de passe sont dans .env, jamais ici). */
  account: string
  /** Détail utile, avec les termes du glossaire. */
  note: string
}

export interface DeploymentPanelProps {
  /** La phase affichée : 0 (le PC) ou 1 (le mini PC). */
  phase: 0 | 1
}

export interface DeploymentPanelUIProps {
  entries: DeployEntry[]
  /** Rappels en bas du tableau. */
  reminders: string[]
}
