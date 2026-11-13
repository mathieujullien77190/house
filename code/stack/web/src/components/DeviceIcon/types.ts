import type { BoxDevice } from '@/types'

export interface DeviceIconProps {
  device: Pick<BoxDevice, 'type' | 'name' | 'vendor'>
}
