import { LABEL_CLASS, VALUE_CLASS, WRAP_CLASS } from './constants'
import type { SpecListProps } from './types'

/** Une liste de caractéristiques : un nom à gauche, sa valeur à droite, dans une carte. */
const SpecList = ({ items }: SpecListProps) => {
  return (
    <dl className={WRAP_CLASS}>
      {items.map((item) => (
        <div key={item.id} className="contents">
          <dt className={LABEL_CLASS}>{item.label}</dt>
          <dd className={VALUE_CLASS}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default SpecList
