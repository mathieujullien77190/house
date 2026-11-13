import type { IconType } from 'react-icons'
import { BsRouter } from 'react-icons/bs'
import { HiOutlineVideoCamera } from 'react-icons/hi2'
import {
  LuCar,
  LuCircleHelp,
  LuGamepad2,
  LuHardDrive,
  LuLaptop,
  LuMonitor,
  LuNetwork,
  LuPhone,
  LuPrinter,
  LuRadioTower,
  LuServer,
  LuSmartphone,
  LuSpeaker,
  LuTablet,
  LuThermometer,
  LuTv,
  LuWatch,
} from 'react-icons/lu'
import { RiLightbulbFill } from 'react-icons/ri'
import { TbAirConditioning } from 'react-icons/tb'

/** Des appareils que le type de la box ne distingue pas : reconnus à leur nom ou à leur fabricant (le premier qui correspond gagne). Les mêmes icônes que sur le plan de la maison. */
export const DEVICE_ICON_RULES: { pattern: RegExp; icon: IconType }[] = [
  { pattern: /philips|signify|\bhue\b|pont-hue/i, icon: RiLightbulbFill },
  { pattern: /esp32|espressif/i, icon: LuRadioTower },
  { pattern: /pc-mini|mini-?pc/i, icon: LuServer },
  { pattern: /\bclim\b|^clim-|\bpac\b/i, icon: TbAirConditioning },
  { pattern: /\bplayer\b/i, icon: LuTv },
]

/** Le type d'appareil de la box (`host_type`) : l'icône du plan quand il y en a une (caméra, clim, routeur). */
export const TYPE_ICONS: Record<string, IconType> = {
  ip_camera: HiOutlineVideoCamera,
  thermostat: LuThermometer,
  workstation: LuMonitor,
  laptop: LuLaptop,
  smartphone: LuSmartphone,
  tablet: LuTablet,
  watch: LuWatch,
  television: LuTv,
  multimedia_device: LuSpeaker,
  vg_console: LuGamepad2,
  printer: LuPrinter,
  nas: LuHardDrive,
  ip_phone: LuPhone,
  car: LuCar,
  networking_device: LuNetwork,
  freebox_player: LuTv,
  freebox_pop: BsRouter,
  freebox_crystal: BsRouter,
  freebox_delta: BsRouter,
  freebox_hd: BsRouter,
  freebox_mini: BsRouter,
}
export const UNKNOWN_TYPE_ICON: IconType = LuCircleHelp

export const ICON_CLASS = 'size-5 shrink-0 text-fg'
