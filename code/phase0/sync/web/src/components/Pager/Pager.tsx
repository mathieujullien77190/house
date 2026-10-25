import PagerUI from './UI'
import { pageCount, pageText } from './helpers'
import type { PagerProps } from './types'

/** La pagination d'un tableau : « 1 à 20 sur 143 » et deux boutons. */
const Pager = ({ page, size, total, onPage }: PagerProps) => {
  const count = pageCount(total, size)
  return (
    <PagerUI
      text={pageText(page, size, total)}
      canPrevious={page > 0}
      canNext={page < count - 1}
      onPrevious={() => onPage(page - 1)}
      onNext={() => onPage(page + 1)}
    />
  )
}

export default Pager
