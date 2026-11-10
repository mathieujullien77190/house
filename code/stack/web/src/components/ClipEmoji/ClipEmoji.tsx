import { useState } from 'react'
import {
  ADD_LABEL,
  BOX_CLASS,
  BUTTON_CLASS,
  BUTTON_LABEL,
  CHOICE_ACTIVE_CLASS,
  CHOICE_CLASS,
  CHOICES_CLASS,
  CURRENT_CLASS,
  EMOJI_CHOICES,
  EMPTY_CLASS,
  NONE_CLASS,
  NONE_LABEL,
} from './constants'
import type { ClipEmojiProps } from './types'

/**
 * L'emoji d'un clip sauvegardé : l'emoji choisi (🦊) ou « ＋ Emoji » ; un clic ouvre la liste, un choix l'enregistre et la referme, « Aucun emoji » le retire. Posé à côté de la note
 * d'un clip : l'emoji s'affiche sur la carte de la maison (un clic dessus y montre le clip).
 */
const ClipEmoji = ({ emoji, onSave }: ClipEmojiProps) => {
  const [open, setOpen] = useState(false)

  const choose = (next: string | null) => {
    setOpen(false)
    if ((next ?? '') !== emoji) void onSave(next).catch(() => undefined)
  }

  return (
    <div className={BOX_CLASS}>
      <button
        type="button"
        className={BUTTON_CLASS}
        aria-label={BUTTON_LABEL}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {emoji ? <span className={CURRENT_CLASS}>{emoji}</span> : <span className={EMPTY_CLASS}>{ADD_LABEL}</span>}
      </button>
      {open ? (
        <div className={CHOICES_CLASS} role="group" aria-label={BUTTON_LABEL}>
          {EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className={emoji === choice ? `${CHOICE_CLASS} ${CHOICE_ACTIVE_CLASS}` : CHOICE_CLASS}
              aria-label={choice}
              aria-pressed={emoji === choice}
              onClick={() => choose(choice)}
            >
              {choice}
            </button>
          ))}
          {emoji ? (
            <button type="button" className={NONE_CLASS} onClick={() => choose(null)}>
              {NONE_LABEL}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default ClipEmoji
