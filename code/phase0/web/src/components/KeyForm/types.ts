export interface KeyFormProps {
  /** Vrai pendant la vérification de la clé : le formulaire est désactivé. */
  busy: boolean
  onSubmit: (key: string) => void
}
