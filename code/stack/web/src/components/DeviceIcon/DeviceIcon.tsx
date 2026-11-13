import { createElement } from 'react'
import { ICON_CLASS } from './constants'
import { iconOf } from './helpers'
import type { DeviceIconProps } from './types'

/** L'icône d'un appareil de la box (celles du plan de la maison : caméra, ampoule, clim, routeur…), sans emoji. */
const DeviceIcon = ({ device }: DeviceIconProps) => createElement(iconOf(device), { className: ICON_CLASS, 'aria-hidden': true })

export default DeviceIcon
