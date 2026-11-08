export interface ApiService {
  /** La méthode : GET par défaut. Une écriture (PUT, POST, DELETE) est montrée avec son corps type mais ne s'appelle pas d'ici : elle change quelque chose (allumer une caméra, une lampe…). */
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE'
  /** Pour une écriture : un exemple de corps JSON. */
  body?: string
  path: string
  /** Ce que le service renvoie, en une phrase. */
  description: string
  /** Vrai si le service exige la clé. */
  secured: boolean
  /** Le type du service (Caméra, Lumière, Prise…) : la liste les range sous ce titre, dans l'ordre où les types apparaissent. Absent : sans titre. */
  group?: string
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
  /** Une note facultative sous la liste (les services qui ne renvoient pas de JSON). */
  note?: string
  onCall: (path: string) => void
}
