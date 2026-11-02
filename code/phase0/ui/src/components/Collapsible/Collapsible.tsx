import { CARET_CLASS, DETAIL_CLASS, SUMMARY_CLASS, WRAP_CLASS } from './constants'
import type { CollapsibleProps } from './types'

/** Une section qu'on réduit d'un clic sur son titre : un <details> natif, sans état à tenir. */
const Collapsible = ({ title, detail, defaultOpen = true, children }: CollapsibleProps) => {
  return (
    <details className={WRAP_CLASS} open={defaultOpen}>
      <summary className={SUMMARY_CLASS}>
        <span className={CARET_CLASS} aria-hidden="true">
          ▶
        </span>
        {title}
        {detail ? <span className={DETAIL_CLASS}>{detail}</span> : null}
      </summary>
      {children}
    </details>
  )
}

export default Collapsible
