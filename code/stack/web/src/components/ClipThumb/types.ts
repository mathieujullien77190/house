export interface ClipThumbProps {
  /** L'adresse du clip (la vidéo légère de préférence). */
  path: string
  className: string
  /** La durée réelle du clip, dès qu'elle est lue. */
  onDuration?: (seconds: number) => void
}
