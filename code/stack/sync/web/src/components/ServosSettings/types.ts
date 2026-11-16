/** Un ordre d'un volet à servos : le canal du PCA9685 (0 à 15), les angles de départ et d'arrivée (degrés), la vitesse (degrés par seconde, 0 = la plus rapide) et l'attente (secondes). */
export interface ServoOrder {
  channel: number
  start: number
  end: number
  speed: number
  hold: number
}

export type ServoCommand = 'up' | 'down' | 'stop'

export type ServoField = keyof ServoOrder

/** Les trois ordres d'un volet. */
export type ServoShutter = { [command in ServoCommand]: ServoOrder }

/** La configuration des servos (`GET`/`PUT /api/servos`) : l'adresse de l'ESP32 et, par numéro de volet, ses trois ordres. */
export interface ServoSettings {
  url: string
  shutters: Record<string, ServoShutter>
}

/** Ce que `PUT /api/servos` accepte : l'adresse et/ou, par volet, des champs de certains ordres. */
export interface ServoPatch {
  url?: string
  shutters?: Record<string, { [command in ServoCommand]?: Partial<ServoOrder> }>
}

export interface ServosSettingsUIProps {
  settings: ServoSettings
  /** Le texte en cours de frappe, par champ (`url` ou `<volet>.<ordre>.<champ>`) ; absent : la valeur enregistrée. */
  drafts: Record<string, string>
  failed: boolean
  /** Le test en cours (`<volet>.<ordre>`) : son bouton est grisé ; null : aucun. */
  testing: string | null
  /** Le test qui a échoué (`<volet>.<ordre>`) : son message s'affiche sous le bouton ; null : aucun. */
  testFailed: string | null
  onTest: (shutter: string, command: ServoCommand) => void
  /** Met le servo de cet ordre à 0° (sans séquence). */
  onOrigin: (shutter: string, command: ServoCommand) => void
  onDraft: (key: string, text: string) => void
  onCommit: (key: string) => void
}
