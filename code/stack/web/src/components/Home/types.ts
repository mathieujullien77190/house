export interface HomeProps {
  apiKey: string
  /** Ouvre la page d'une caméra (l'onglet Caméras, son détail) : celle d'un modèle de caméra cliqué dans la vue 3D. */
  onOpenCamera: (camera: string) => void
}
