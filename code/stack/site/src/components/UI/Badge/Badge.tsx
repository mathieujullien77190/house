import BadgeUI from './UI'
import { badgeClass } from './helpers'
import type { BadgeProps } from './types'

const Badge = ({ tone, children }: BadgeProps) => {
  return <BadgeUI className={badgeClass(tone)}>{children}</BadgeUI>
}

export default Badge
