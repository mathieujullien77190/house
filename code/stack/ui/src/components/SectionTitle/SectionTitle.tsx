import { DETAIL_CLASS, TITLE_CLASS } from './constants'
import type { SectionTitleProps } from './types'

/** Le titre d'une section de page, avec un détail en petit. */
const SectionTitle = ({ text, detail }: SectionTitleProps) => (
  <h2 className={TITLE_CLASS}>
    {text}
    {detail ? <span className={DETAIL_CLASS}>{detail}</span> : null}
  </h2>
)

export default SectionTitle
