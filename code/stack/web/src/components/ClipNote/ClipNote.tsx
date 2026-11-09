import { useState } from 'react'
import { ADD_LABEL, BOX_CLASS, BUTTON_CLASS, EMPTY_CLASS, INPUT_CLASS, INPUT_LABEL, MAX_LENGTH, NOTE_CLASS, PLACEHOLDER } from './constants'
import type { ClipNoteProps } from './types'

/**
 * La note d'un clip sauvegardé : le texte (« renard ») ou « ＋ Note » ; un clic ouvre un champ, Entrée ou un clic ailleurs l'enregistre, Échap annule, un champ vide
 * supprime la note. Posée sous la vignette dans la Home (et sous le lecteur d'un clip ouvert) : nulle part ailleurs.
 */
const ClipNote = ({ note, onSave }: ClipNoteProps) => {
  const [draft, setDraft] = useState<string | null>(null)

  const finish = (typed: string, keep: boolean) => {
    const text = typed.trim()
    setDraft(null)
    if (keep && text !== note) void onSave(text).catch(() => undefined)
  }

  if (draft !== null) {
    return (
      <div className={BOX_CLASS}>
        <input
          autoFocus
          className={INPUT_CLASS}
          aria-label={INPUT_LABEL}
          placeholder={PLACEHOLDER}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => finish(draft, true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') finish(draft, true)
            if (event.key === 'Escape') finish(draft, false)
          }}
        />
      </div>
    )
  }
  return (
    <div className={BOX_CLASS}>
      <button type="button" className={BUTTON_CLASS} aria-label={INPUT_LABEL} onClick={() => setDraft(note)}>
        <span className={note ? NOTE_CLASS : EMPTY_CLASS}>{note || ADD_LABEL}</span>
      </button>
    </div>
  )
}

export default ClipNote
