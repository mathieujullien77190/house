import type { BadgeUIProps } from './types'

const BadgeUI = ({ className, children }: BadgeUIProps) => {
  return <span className={className}>{children}</span>
}

export default BadgeUI
