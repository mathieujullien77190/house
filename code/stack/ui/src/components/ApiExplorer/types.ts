export interface ApiService {
  path: string
  /** Ce que le service renvoie, en une phrase. */
  description: string
  /** Vrai si le service exige la clé. */
  secured: boolean
}

export interface ApiResult {
  path: string
  /** 0 quand l'appel lui-même a échoué. */
  status: number
  /** Le corps, déjà mis en forme. */
  body: string
}

export interface ApiExplorerProps {
  services: ApiService[]
  /** Le chemin du service choisi, ou vide. */
  selected: string
  busy: boolean
  result: ApiResult | null
  /** Une note sous la liste (les services qui ne renvoient pas de JSON). */
  note: string
  onCall: (path: string) => void
}
