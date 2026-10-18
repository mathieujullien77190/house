import CardUI from './UI'
import { DEFAULT_TAG } from './constants'
import { cardClass } from './helpers'
import type { CardProps } from './types'

const Card = ({ as = DEFAULT_TAG, className, children }: CardProps) => {
  return (
    <CardUI as={as} className={cardClass(className)}>
      {children}
    </CardUI>
  )
}

export default Card
