export interface RecordButtonProps {
  /** Un clip est-il en train de s'enregistrer ? */
  recording: boolean
  /** Une demande de début ou de fin est en route : le bouton ne répond plus. */
  busy: boolean
  /** Les secondes écoulées depuis le début de l'enregistrement (dans l'infobulle). */
  seconds: number
  /** Un clic : commence ou arrête l'enregistrement. */
  onToggle: () => void
}
