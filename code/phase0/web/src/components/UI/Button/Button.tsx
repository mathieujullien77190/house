import ButtonUI from './UI'
import { DEFAULT_VARIANT } from './constants'
import { buttonClass } from './helpers'
import type { ButtonProps } from './types'

const Button = ({ variant = DEFAULT_VARIANT, className, ...rest }: ButtonProps) => {
  return <ButtonUI {...rest} className={buttonClass(variant, className)} />
}

export default Button
