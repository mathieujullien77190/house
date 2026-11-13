import type { IconType } from 'react-icons'
import { DEVICE_ICON_RULES, TYPE_ICONS, UNKNOWN_TYPE_ICON } from './constants'
import type { DeviceIconProps } from './types'

/** L'icône d'un appareil : d'après son nom ou son fabricant (pont Hue, ESP32, mini PC, clim), sinon d'après son type sur la box. */
export const iconOf = (device: DeviceIconProps['device']): IconType =>
  DEVICE_ICON_RULES.find(({ pattern }) => pattern.test(`${device.vendor ?? ''} ${device.name}`))?.icon ??
  (device.type ? (TYPE_ICONS[device.type] ?? UNKNOWN_TYPE_ICON) : UNKNOWN_TYPE_ICON)
