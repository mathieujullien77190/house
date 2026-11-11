import { useState } from 'react'
import { ADD_LABEL, BUTTON_CLASS, BUTTON_LABEL, EMPTY_CLASS, INPUT_CLASS, PLACEHOLDER } from './constants'
import { lastSymbol } from './helpers'
import type { ClipEmojiProps } from './types'

/**
 * L'emoji d'un clip sauvegardé : un petit rond (l'emoji choisi, ou « ＋ ») que le parent pose en haut à droite du clip. Un clic ouvre un champ d'**un seul symbole** : on y tape ou on y colle
 * n'importe quel emoji (le clavier emoji du système) ; Entrée ou un clic ailleurs l'enregistre, Échap annule, un champ vide le retire. L'emoji s'affiche sur la carte de la maison.
 */
const ClipEmoji = ({ emoji, onSave }: ClipEmojiProps) => {
  const [draft, setDraft] = useState<string | null>(null)

  const finish = (typed: string, keep: boolean) => {
    setDraft(null)
    if (keep && typed !== emoji) void onSave(typed === '' ? null : typed).catch(() => undefined)
  }

  if (draft !== null) {
    return (
      <input
        autoFocus
        className={INPUT_CLASS}
        aria-label={BUTTON_LABEL}
        placeholder={PLACEHOLDER}
        value={draft}
        onChange={(event) => setDraft(lastSymbol(event.target.value))}
        onBlur={() => finish(draft, true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') finish(draft, true)
          if (event.key === 'Escape') finish(draft, false)
        }}
      />
    )
  }
  return (
    <button type="button" className={BUTTON_CLASS} aria-label={BUTTON_LABEL} onClick={() => setDraft(emoji)}>
      <span className={emoji ? undefined : EMPTY_CLASS}>{emoji || ADD_LABEL}</span>
    </button>
  )
}

export default ClipEmoji
