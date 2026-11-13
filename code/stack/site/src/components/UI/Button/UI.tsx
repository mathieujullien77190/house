import type { ButtonUIProps } from './types'

const ButtonUI = ({ type = 'button', ...rest }: ButtonUIProps) => {
  return <button type={type} {...rest} />
}

export default ButtonUI
