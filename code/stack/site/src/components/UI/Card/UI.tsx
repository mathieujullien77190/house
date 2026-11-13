import type { CardUIProps } from './types'

const CardUI = ({ as: Tag, className, children }: CardUIProps) => {
  return <Tag className={className}>{children}</Tag>
}

export default CardUI
