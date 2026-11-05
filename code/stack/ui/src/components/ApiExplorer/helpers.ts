import type { ApiService } from './types'
import { SERVICE_ACTIVE_CLASS, SERVICE_CLASS, SERVICE_IDLE_CLASS } from './constants'

/** Les services rangés par type, dans l'ordre où chaque type apparaît ; ceux sans type forment un groupe sans titre. */
export const groupServices = (services: ApiService[]): { name: string; items: ApiService[] }[] => {
  const groups: { name: string; items: ApiService[] }[] = []
  for (const service of services) {
    const name = service.group ?? ''
    const group = groups.find((item) => item.name === name)
    if (group) group.items.push(service)
    else groups.push({ name, items: [service] })
  }
  return groups
}

export const isOk = (status: number): boolean => status >= 200 && status < 300

export const serviceClass = (active: boolean): string => `${SERVICE_CLASS} ${active ? SERVICE_ACTIVE_CLASS : SERVICE_IDLE_CLASS}`
