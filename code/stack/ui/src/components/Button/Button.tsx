import { DEFAULT_VARIANT } from './constants'
import { buttonClass } from './helpers'
import type { ButtonProps } from './types'

/** Le bouton de base des deux apps : trois apparences, `type="button"` par défaut. */
const Button = ({ variant = DEFAULT_VARIANT, className, type = 'button', ...rest }: ButtonProps) => {
  return <button type={type} {...rest} className={buttonClass(variant, className)} />
}

export default Button
