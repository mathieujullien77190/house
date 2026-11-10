export interface ClipEmojiProps {
  /** L'emoji du clip, vide s'il n'y en a pas. */
  emoji: string
  /** Appelé avec l'emoji choisi (`null` : le retire) ; la promesse refusée laisse l'ancien. */
  onSave: (emoji: string | null) => Promise<unknown>
}
