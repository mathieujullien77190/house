import { SERVICE_ACTIVE_CLASS, SERVICE_CLASS, SERVICE_IDLE_CLASS } from './constants'

export const isOk = (status: number): boolean => status >= 200 && status < 300

export const serviceClass = (active: boolean): string => `${SERVICE_CLASS} ${active ? SERVICE_ACTIVE_CLASS : SERVICE_IDLE_CLASS}`
