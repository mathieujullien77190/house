import { ACTIONS_CLASS, CARET_CLASS, COMPACT_SUMMARY_CLASS, DETAIL_CLASS, HEAD_CLASS, SUMMARY_CLASS, WRAP_CLASS } from './constants'
import type { CollapsibleProps } from './types'

/** Une section qu'on réduit d'un clic sur son titre : un <details> natif, sans état à tenir. */
const Collapsible = ({ title, detail, actions, headClass, compact = false, defaultOpen = true, onToggle, children }: CollapsibleProps) => {
  return (
    <details className={WRAP_CLASS} open={defaultOpen} onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}>
      <summary className={compact ? COMPACT_SUMMARY_CLASS : SUMMARY_CLASS}>
        <span className={headClass ? `${HEAD_CLASS} ${headClass}` : HEAD_CLASS}>
          <span className={CARET_CLASS} aria-hidden="true">
            ▶
          </span>
          <span>{title}</span>
          {detail ? <span className={DETAIL_CLASS}>{detail}</span> : null}
        </span>
        {/* Un clic sur les commandes ne doit pas plier la section : on retient l'action par défaut du <summary>. */}
        {actions ? (
          <span className={ACTIONS_CLASS} onClick={(event) => event.preventDefault()}>
            {actions}
          </span>
        ) : null}
      </summary>
      {children}
    </details>
  )
}

export default Collapsible
