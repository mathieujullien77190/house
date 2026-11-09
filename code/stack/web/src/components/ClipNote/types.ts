export interface ClipNoteProps {
  /** La note du clip, vide s'il n'y en a pas. */
  note: string
  /** Appelé avec le texte choisi (vide : supprime la note) ; la promesse refusée laisse l'ancienne note. */
  onSave: (note: string) => Promise<unknown>
}
