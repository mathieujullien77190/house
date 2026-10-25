import Button from '../Button'
import { NEXT_ARIA, NEXT_LABEL, PREVIOUS_ARIA, PREVIOUS_LABEL, WRAP_CLASS } from './constants'
import { pageCount, pageText } from './helpers'
import type { PagerProps } from './types'

/** La pagination d'un tableau : « 1 à 20 sur 143 » et deux boutons ; la page est au parent. */
const Pager = ({ page, size, total, onPage }: PagerProps) => {
  const count = pageCount(total, size)
  return (
    <div className={WRAP_CLASS}>
      <span>{pageText(page, size, total)}</span>
      <Button onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label={PREVIOUS_ARIA}>
        {PREVIOUS_LABEL}
      </Button>
      <Button onClick={() => onPage(page + 1)} disabled={page >= count - 1} aria-label={NEXT_ARIA}>
        {NEXT_LABEL}
      </Button>
    </div>
  )
}

export default Pager
