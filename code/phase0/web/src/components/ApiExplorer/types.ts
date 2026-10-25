export interface ApiService {
  path: string
  /** Ce que le service renvoie, en une phrase. */
  description: string
  /** Vrai si le service exige la clé. */
  secured: boolean
}

export interface ApiResult {
  path: string
  status: number
  /** Le corps, remis en forme s'il est du JSON. */
  body: string
}

export interface ApiExplorerProps {
  apiKey: string
}

export interface ApiExplorerUIProps {
  services: ApiService[]
  selected: string
  busy: boolean
  result: ApiResult | null
  onCall: (path: string) => void
}
