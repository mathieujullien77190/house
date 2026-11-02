export interface KeyFormProps {
  value: string
  /** Vrai pendant la vérification : le formulaire est désactivé. */
  busy: boolean
  /** Une phrase sous le champ : où trouver la clé, où elle reste. */
  hint: string
  onChange: (value: string) => void
  onSubmit: () => void
}
